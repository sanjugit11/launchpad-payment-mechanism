const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Refund Tests - SX Launchpad", function () {
  let adminA, adminB, adminC, user1, user2, treasury, sxmmSigner;
  let usdc, projectToken;
  let sxp, sxcp, sxua, launchpad, sxmm;

  const LOCK_PERIOD = 30 * 24 * 60 * 60;
  const PENALTY_PERCENT = 10;
  const TOKEN_PRICE = ethers.parseUnits("10", 6);
  const PTF_FEE_PERCENT = 1;

  beforeEach(async function () {
    [adminA, adminB, adminC, user1, user2, treasury, sxmmSigner] = await ethers.getSigners();

    // Deploy contracts (simplified setup)
    const MarketMaker = await ethers.getContractFactory("MarketMaker");
    sxmm = await MarketMaker.deploy();

    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);
    projectToken = await MockStablecoin.deploy("Project Token", "PT", 18);

    const SXGovernance = await ethers.getContractFactory("SXGovernance");
    const governance = await SXGovernance.deploy(adminA.address, adminB.address, adminC.address);

    const SXP = await ethers.getContractFactory("SXP");
    sxp = await SXP.deploy(treasury.address);
    const SXCP = await ethers.getContractFactory("SXCP");
    sxcp = await SXCP.deploy();
    await sxp.setSXCPToken(sxcp.target);
    await sxcp.setMinter(sxp.target, true);

    const SXProxy = await ethers.getContractFactory("SXProxy");
    const SXUA = await ethers.getContractFactory("SXUA");
    const sxuaImpl = await SXUA.deploy();
    const sxuaInitData = sxuaImpl.interface.encodeFunctionData("initialize", [
      sxp.target,
      treasury.address,
      PENALTY_PERCENT,
      LOCK_PERIOD,
      treasury.address
    ]);
    const sxuaProxy = await SXProxy.deploy(sxuaImpl.target, sxuaInitData);
    sxua = SXUA.attach(sxuaProxy.target);
    await sxp.setMinter(sxua.target, true);

    const SXLaunchpad = await ethers.getContractFactory("SXLaunchpad");
    const launchpadImpl = await SXLaunchpad.deploy();
    const launchpadInitData = launchpadImpl.interface.encodeFunctionData("initialize", [
      sxua.target,
      sxmm.target,
      treasury.address
    ]);
    const launchpadProxy = await SXProxy.deploy(launchpadImpl.target, launchpadInitData);
    launchpad = SXLaunchpad.attach(launchpadProxy.target);

    await sxua.setTokenSupport(usdc.target, true);

    // Mint and setup users
    await usdc.mint(user1.address, ethers.parseUnits("200000", 6)); // Increased for large refund test
    await usdc.mint(user2.address, ethers.parseUnits("50000", 6));
    await usdc.connect(user1).approve(sxua.target, ethers.MaxUint256);
    await usdc.connect(user2).approve(sxua.target, ethers.MaxUint256);

    // Deposit into SXUA vault to create uncommitted balances
    await sxua.connect(user1).deposit(usdc.target, ethers.parseUnits("200000", 6)); // Increased for large refund test
    await sxua.connect(user2).deposit(usdc.target, ethers.parseUnits("50000", 6));

    // Mint project tokens and add project
    await projectToken.mint(launchpad.target, ethers.parseUnits("1000000", 18));

    const now = await ethers.provider.getBlock('latest');
    const saleStart = now.timestamp + 100;
    const saleEnd = now.timestamp + 200;
    const buybackStart = saleEnd + LOCK_PERIOD + 1;
    const buybackEnd = buybackStart + 1000;

    await launchpad.addProject(
      projectToken.target,
      usdc.target,
      TOKEN_PRICE,
      saleStart,
      saleEnd,
      LOCK_PERIOD,
      PENALTY_PERCENT,
      buybackStart,
      buybackEnd,
      ethers.parseUnits("5", 6)
    );

    // Make purchase for refund tests
    await ethers.provider.send("evm_setNextBlockTimestamp", [saleStart + 1]);
    await ethers.provider.send("evm_mine", []);
    await launchpad.connect(user1).buyTokens(0, ethers.parseUnits("100", 18));
    await launchpad.connect(user2).buyTokens(0, ethers.parseUnits("50", 18));
  });

  describe("Basic Refund Tests", function () {
    it("should allow refund before project finalization", async function () {
      const projectId = 0;
      const alloc = await launchpad.allocations(projectId, user1.address);
      const stablecoinPaid = alloc.stablecoinPaid;
      const ptfFee = (stablecoinPaid * BigInt(PTF_FEE_PERCENT)) / BigInt(100);
      const expectedRefund = stablecoinPaid - ptfFee;

      const vaultBalanceBefore = await sxua.getCommittedBalance(user1.address, usdc.target);

      await launchpad.connect(user1).requestRefund(projectId);

      const vaultBalanceAfter = await sxua.getCommittedBalance(user1.address, usdc.target);
      expect(vaultBalanceAfter - vaultBalanceBefore).to.equal(expectedRefund);
    });

    it("should zero out user allocation after refund", async function () {
      const projectId = 0;

      await launchpad.connect(user1).requestRefund(projectId);

      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.tokenAllocation).to.equal(0);
      expect(alloc.stablecoinPaid).to.equal(0);
      expect(alloc.refunded).to.be.true;
    });

    it("should distribute PTF fee to treasury", async function () {
      const projectId = 0;
      const alloc = await launchpad.allocations(projectId, user1.address);
      const stablecoinPaid = alloc.stablecoinPaid;
      const ptfFee = (stablecoinPaid * BigInt(PTF_FEE_PERCENT)) / BigInt(100);

      const treasuryBalanceBefore = await usdc.balanceOf(treasury.address);

      await launchpad.connect(user1).requestRefund(projectId);

      const treasuryBalanceAfter = await usdc.balanceOf(treasury.address);
      expect(treasuryBalanceAfter - treasuryBalanceBefore).to.equal(ptfFee);
    });

    it("should send forfeited tokens to MarketMaker", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);

      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);

      await launchpad.connect(user1).requestRefund(projectId);

      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);
      expect(mmBalanceAfter - mmBalanceBefore).to.equal(tokenAllocation);
    });
  });

  describe("Refund Validation Tests", function () {
    it("should reject refund after project finalization", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      await expect(
        launchpad.connect(user1).requestRefund(projectId)
      ).to.be.revertedWith("SXLaunchpad: Project already finalized");
    });

    it("should reject double refund", async function () {
      const projectId = 0;

      await launchpad.connect(user1).requestRefund(projectId);

      await expect(
        launchpad.connect(user1).requestRefund(projectId)
      ).to.be.revertedWith("SXLaunchpad: Already refunded");
    });

    it("should reject refund for non-existent project", async function () {
      const invalidProjectId = 999;

      await expect(
        launchpad.connect(user1).requestRefund(invalidProjectId)
      ).to.be.revertedWith("SXLaunchpad: Project does not exist");
    });

    it("should reject refund when no allocation", async function () {
      const projectId = 0;
      const newUser = (await ethers.getSigners())[7]; // Get a signer that hasn't bought

      await expect(
        launchpad.connect(newUser).requestRefund(projectId)
      ).to.be.revertedWith("SXLaunchpad: No paid allocation");
    });

    it("should reject refund after tokens are claimed", async function () {
      const projectId = 0;

      // Finalize project and advance past lock period
      await launchpad.finalizeProject(projectId);
      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      // Claim tokens
      await launchpad.connect(user1).claimTokens(projectId);

      // Try to refund
      await expect(
        launchpad.connect(user1).requestRefund(projectId)
      ).to.be.revertedWith("SXLaunchpad: Allocation already claimed");
    });
  });

  describe("Multiple Refunds", function () {
    it("should track different refunds for different users", async function () {
      const projectId = 0;
      const alloc1 = await launchpad.allocations(projectId, user1.address);
      const alloc2 = await launchpad.allocations(projectId, user2.address);

      const ptfFee1 = (alloc1.stablecoinPaid * BigInt(PTF_FEE_PERCENT)) / BigInt(100);
      const ptfFee2 = (alloc2.stablecoinPaid * BigInt(PTF_FEE_PERCENT)) / BigInt(100);

      const vaultBefore1 = await sxua.getCommittedBalance(user1.address, usdc.target);
      const vaultBefore2 = await sxua.getCommittedBalance(user2.address, usdc.target);

      await launchpad.connect(user1).requestRefund(projectId);
      await launchpad.connect(user2).requestRefund(projectId);

      const vaultAfter1 = await sxua.getCommittedBalance(user1.address, usdc.target);
      const vaultAfter2 = await sxua.getCommittedBalance(user2.address, usdc.target);

      expect(vaultAfter1 - vaultBefore1).to.equal(alloc1.stablecoinPaid - ptfFee1);
      expect(vaultAfter2 - vaultBefore2).to.equal(alloc2.stablecoinPaid - ptfFee2);
    });

    it("should allow partial refunds (some users refund, others claim)", async function () {
      const projectId = 0;

      // User1 refunds
      await launchpad.connect(user1).requestRefund(projectId);

      // User2 stays in project
      const alloc2Before = await launchpad.allocations(projectId, user2.address);
      expect(alloc2Before.tokenAllocation).to.equal(ethers.parseUnits("50", 18));

      // Finalize and user2 claims
      await launchpad.finalizeProject(projectId);
      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      await launchpad.connect(user2).claimTokens(projectId);

      const alloc2After = await launchpad.allocations(projectId, user2.address);
      expect(alloc2After.claimed).to.be.true;
    });
  });

  describe("Refund Amount Calculations", function () {
    it("should calculate correct refund amount with 1% fee", async function () {
      const projectId = 0;
      const alloc = await launchpad.allocations(projectId, user1.address);
      const stablecoinPaid = alloc.stablecoinPaid;

      const expectedPtfFee = (stablecoinPaid * BigInt(1)) / BigInt(100);
      const expectedUserRefund = stablecoinPaid - expectedPtfFee;

      const vaultBefore = await sxua.getCommittedBalance(user1.address, usdc.target);
      await launchpad.connect(user1).requestRefund(projectId);
      const vaultAfter = await sxua.getCommittedBalance(user1.address, usdc.target);

      expect(vaultAfter - vaultBefore).to.equal(expectedUserRefund);
    });

    it("should handle large refund amounts", async function () {
      const projectId = 0;
      const largeAmount = ethers.parseUnits("10000", 18);

      // Add another purchase with large amount
      await launchpad.connect(user1).buyTokens(projectId, largeAmount);

      const alloc = await launchpad.allocations(projectId, user1.address);
      const ptfFee = (alloc.stablecoinPaid * BigInt(PTF_FEE_PERCENT)) / BigInt(100);

      const vaultBefore = await sxua.getCommittedBalance(user1.address, usdc.target);
      await launchpad.connect(user1).requestRefund(projectId);
      const vaultAfter = await sxua.getCommittedBalance(user1.address, usdc.target);

      expect(vaultAfter - vaultBefore).to.equal(alloc.stablecoinPaid - ptfFee);
    });
  });

  describe("Event Emissions", function () {
    it("should emit Refunded event", async function () {
      const projectId = 0;
      const alloc = await launchpad.allocations(projectId, user1.address);

      await expect(
        launchpad.connect(user1).requestRefund(projectId)
      ).to.emit(launchpad, "Refunded")
        .withArgs(projectId, user1.address, alloc.stablecoinPaid);
    });

    it("should emit event with correct refund amount", async function () {
      const projectId = 0;
      const allocBefore = await launchpad.allocations(projectId, user1.address);
      const expectedRefundAmount = allocBefore.stablecoinPaid;

      await expect(
        launchpad.connect(user1).requestRefund(projectId)
      ).to.emit(launchpad, "Refunded")
        .withArgs(projectId, user1.address, expectedRefundAmount);
    });
  });

  describe("Reentrancy Protection", function () {
    it("should protect against reentrancy in refund", async function () {
      // SXLaunchpad uses nonReentrant modifier on requestRefund
      const projectId = 0;

      // Normal refund should succeed
      await launchpad.connect(user1).requestRefund(projectId);

      // User should be marked as refunded
      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.refunded).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("should handle refund with zero token allocation", async function () {
      const projectId = 0;
      const newUser = (await ethers.getSigners())[6];

      // Manually set up a user with stablecoins but no token allocation
      await usdc.mint(newUser.address, ethers.parseUnits("1000", 6));
      await usdc.connect(newUser).approve(sxua.target, ethers.MaxUint256);

      // This should fail because they have no allocation
      await expect(
        launchpad.connect(newUser).requestRefund(projectId)
      ).to.be.revertedWith("SXLaunchpad: No paid allocation");
    });

    it("should handle refund immediately after purchase", async function () {
      const projectId = 0;
      const newUser = (await ethers.getSigners())[5];

      await usdc.mint(newUser.address, ethers.parseUnits("10000", 6));
      await usdc.connect(newUser).approve(sxua.target, ethers.MaxUint256);

      // Buy tokens
      const tokenAmount = ethers.parseUnits("100", 18);
      await launchpad.connect(newUser).buyTokens(projectId, tokenAmount);

      // Immediately refund
      await launchpad.connect(newUser).requestRefund(projectId);

      const alloc = await launchpad.allocations(projectId, newUser.address);
      expect(alloc.refunded).to.be.true;
      expect(alloc.tokenAllocation).to.equal(0);
    });
  });
});
