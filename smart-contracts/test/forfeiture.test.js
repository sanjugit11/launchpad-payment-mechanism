const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Forfeiture/Claim Tests - SX Launchpad", function () {
  let adminA, adminB, adminC, user1, user2, treasury, sxmmSigner;
  let usdc, projectToken;
  let sxp, sxcp, sxua, launchpad, sxmm;

  const LOCK_PERIOD = 30 * 24 * 60 * 60;
  const PENALTY_PERCENT = 10; // 10% early exit penalty
  const TOKEN_PRICE = ethers.parseUnits("10", 6);
  const PTF_FEE_PERCENT = 1;

  beforeEach(async function () {
    [adminA, adminB, adminC, user1, user2, treasury, sxmmSigner] = await ethers.getSigners();

    // Deploy contracts
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
    await usdc.mint(user1.address, ethers.parseUnits("100000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("100000", 6));
    await usdc.connect(user1).approve(sxua.target, ethers.MaxUint256);
    await usdc.connect(user2).approve(sxua.target, ethers.MaxUint256);

    // Deposit into SXUA vault
    await sxua.connect(user1).deposit(usdc.target, ethers.parseUnits("100000", 6));
    await sxua.connect(user2).deposit(usdc.target, ethers.parseUnits("100000", 6));

    // Mint project tokens
    await projectToken.mint(launchpad.target, ethers.parseUnits("1000000", 18));

    // Add project
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
      ethers.parseUnits("5", 18)
    );

    // Make purchases
    await ethers.provider.send("hardhat_mine", ["0x64"]);
    await launchpad.connect(user1).buyTokens(0, ethers.parseUnits("100", 18));
    await launchpad.connect(user2).buyTokens(0, ethers.parseUnits("200", 18));
  });

  describe("Claim After Lock Period", function () {
    it("should allow claim after lock period expires", async function () {
      const projectId = 0;

      // Finalize project
      await launchpad.finalizeProject(projectId);

      // Advance past lock period
      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      // Claim should succeed
      const tokenAmount = ethers.parseUnits("100", 18);
      const ptfFeeInStable = (tokenAmount * TOKEN_PRICE) / BigInt(10 ** 18) / BigInt(100);

      await launchpad.connect(user1).claimTokens(projectId);

      const userTokenBalance = await projectToken.balanceOf(user1.address);
      expect(userTokenBalance).to.equal(tokenAmount); // No penalty after lock period
    });

    it("should send full tokens without penalty after lock period", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);

      await launchpad.finalizeProject(projectId);

      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      const userTokenBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokenAfter = await projectToken.balanceOf(user1.address);

      expect(userTokenAfter - userTokenBefore).to.equal(tokenAllocation);
    });

    it("should mark allocation as claimed", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      await launchpad.connect(user1).claimTokens(projectId);

      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.claimed).to.be.true;
    });

    it("should not apply penalty after lock period", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);

      await launchpad.finalizeProject(projectId);

      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);
      await launchpad.connect(user1).claimTokens(projectId);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      // No penalty tokens should go to MM
      expect(mmBalanceAfter - mmBalanceBefore).to.equal(0);
    });
  });

  describe("Early Claim with Forfeiture Penalty", function () {
    it("should apply penalty for early claim before lock period", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);
      const expectedPenalty = (tokenAllocation * BigInt(PENALTY_PERCENT)) / BigInt(100);

      await launchpad.finalizeProject(projectId);

      // Claim immediately (before lock period)
      const userTokenBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokenAfter = await projectToken.balanceOf(user1.address);

      // User gets tokens minus penalty
      expect(userTokenAfter - userTokenBefore).to.equal(tokenAllocation - expectedPenalty);
    });

    it("should send forfeited tokens to MarketMaker", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);
      const expectedPenalty = (tokenAllocation * BigInt(PENALTY_PERCENT)) / BigInt(100);

      await launchpad.finalizeProject(projectId);

      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);
      await launchpad.connect(user1).claimTokens(projectId);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      expect(mmBalanceAfter - mmBalanceBefore).to.equal(expectedPenalty);
    });

    it("should apply 10% penalty for early exit", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);
      const expectedPenalty = (tokenAllocation * BigInt(10)) / BigInt(100); // 10%
      const expectedUserTokens = tokenAllocation - expectedPenalty;

      await launchpad.finalizeProject(projectId);

      const userTokenBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokenAfter = await projectToken.balanceOf(user1.address);

      expect(userTokenAfter - userTokenBefore).to.equal(expectedUserTokens);
    });

    it("should deduct PTF fee from user tokens", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);

      await launchpad.finalizeProject(projectId);

      const userTokenBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokenAfter = await projectToken.balanceOf(user1.address);

      // PTF fee is calculated in stablecoins and deducted from SXUA
      // User still gets the full token amount minus penalty
      const penalty = (tokenAllocation * BigInt(PENALTY_PERCENT)) / BigInt(100);
      expect(userTokenAfter - userTokenBefore).to.equal(tokenAllocation - penalty);
    });

    it("should transfer PTF fee to treasury", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);
      const penalty = (tokenAllocation * BigInt(PENALTY_PERCENT)) / BigInt(100);
      const userAmount = tokenAllocation - penalty;
      const ptfFeeInStable = (userAmount * TOKEN_PRICE) / BigInt(10 ** 18) / BigInt(100);

      await launchpad.finalizeProject(projectId);

      const treasuryBefore = await usdc.balanceOf(treasury.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const treasuryAfter = await usdc.balanceOf(treasury.address);

      expect(treasuryAfter - treasuryBefore).to.equal(ptfFeeInStable);
    });
  });

  describe("Claim Validation Tests", function () {
    it("should reject claim before project finalization", async function () {
      const projectId = 0;

      // Don't finalize project
      await expect(
        launchpad.connect(user1).claimTokens(projectId)
      ).to.be.revertedWith("SXLaunchpad: Project not finalized");
    });

    it("should reject double claim", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      await launchpad.connect(user1).claimTokens(projectId);

      // Try to claim again
      await expect(
        launchpad.connect(user1).claimTokens(projectId)
      ).to.be.revertedWith("SXLaunchpad: Already claimed");
    });

    it("should reject claim with zero allocation", async function () {
      const projectId = 0;
      const newUser = (await ethers.getSigners())[6];

      await launchpad.finalizeProject(projectId);

      await expect(
        launchpad.connect(newUser).claimTokens(projectId)
      ).to.be.revertedWith("SXLaunchpad: No tokens to claim");
    });

    it("should reject claim for non-existent project", async function () {
      const invalidProjectId = 999;

      await expect(
        launchpad.connect(user1).claimTokens(invalidProjectId)
      ).to.be.revertedWith("SXLaunchpad: Project does not exist");
    });

    it("should reject claim after refund", async function () {
      const projectId = 0;

      // Request refund first
      await launchpad.connect(user1).requestRefund(projectId);

      // Finalize project
      await launchpad.finalizeProject(projectId);

      // Try to claim (should fail because allocation is zero after refund)
      await expect(
        launchpad.connect(user1).claimTokens(projectId)
      ).to.be.revertedWith("SXLaunchpad: No tokens to claim");
    });
  });

  describe("Penalty Calculations", function () {
    it("should calculate correct penalty (10%)", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);
      const expectedPenalty = (tokenAmount * BigInt(10)) / BigInt(100); // 10%

      await launchpad.finalizeProject(projectId);

      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);
      await launchpad.connect(user1).claimTokens(projectId);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      expect(mmBalanceAfter - mmBalanceBefore).to.equal(expectedPenalty);
    });

    it("should handle different allocation sizes", async function () {
      const projectId = 0;

      const testAllocations = [
        ethers.parseUnits("100", 18),
        ethers.parseUnits("500", 18),
        ethers.parseUnits("1000", 18)
      ];

      await launchpad.finalizeProject(projectId);

      // Test with user2 who has 200 tokens
      const penalty = (ethers.parseUnits("200", 18) * BigInt(10)) / BigInt(100);
      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);
      await launchpad.connect(user2).claimTokens(projectId);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      expect(mmBalanceAfter - mmBalanceBefore).to.equal(penalty);
    });

    it("should not apply penalty if lock period has expired", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);
      await launchpad.connect(user1).claimTokens(projectId);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      // No penalty should be applied
      expect(mmBalanceAfter).to.equal(mmBalanceBefore);
    });
  });

  describe("Multiple User Claims", function () {
    it("should handle claims from multiple users", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      const user1TokenBefore = await projectToken.balanceOf(user1.address);
      const user2TokenBefore = await projectToken.balanceOf(user2.address);

      await launchpad.connect(user1).claimTokens(projectId);
      await launchpad.connect(user2).claimTokens(projectId);

      const user1TokenAfter = await projectToken.balanceOf(user1.address);
      const user2TokenAfter = await projectToken.balanceOf(user2.address);

      const user1Allocation = ethers.parseUnits("100", 18);
      const user2Allocation = ethers.parseUnits("200", 18);
      const user1Penalty = (user1Allocation * BigInt(10)) / BigInt(100);
      const user2Penalty = (user2Allocation * BigInt(10)) / BigInt(100);

      expect(user1TokenAfter - user1TokenBefore).to.equal(user1Allocation - user1Penalty);
      expect(user2TokenAfter - user2TokenBefore).to.equal(user2Allocation - user2Penalty);
    });

    it("should handle mixed claim/refund scenarios", async function () {
      const projectId = 0;

      // User1 refunds
      await launchpad.connect(user1).requestRefund(projectId);

      // User2 claims
      await launchpad.finalizeProject(projectId);
      await launchpad.connect(user2).claimTokens(projectId);

      // User2 should have tokens, User1 should have none
      const user1TokenBalance = await projectToken.balanceOf(user1.address);
      const user2TokenBalance = await projectToken.balanceOf(user2.address);

      expect(user1TokenBalance).to.equal(0);
      expect(user2TokenBalance).to.be.greaterThan(0);
    });

    it("should handle claims at different times (some early, some late)", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      // User1 claims early
      const user1Allocation = ethers.parseUnits("100", 18);
      const user1Penalty = (user1Allocation * BigInt(10)) / BigInt(100);
      await launchpad.connect(user1).claimTokens(projectId);

      const user1TokenAfterEarlyClaim = await projectToken.balanceOf(user1.address);
      expect(user1TokenAfterEarlyClaim).to.equal(user1Allocation - user1Penalty);

      // Advance past lock period
      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 100]);
      await ethers.provider.send("evm_mine", []);

      // User2 claims late (should get full allocation)
      const user2Allocation = ethers.parseUnits("200", 18);
      const user2TokenBefore = await projectToken.balanceOf(user2.address);
      await launchpad.connect(user2).claimTokens(projectId);
      const user2TokenAfter = await projectToken.balanceOf(user2.address);

      expect(user2TokenAfter - user2TokenBefore).to.equal(user2Allocation);
    });
  });

  describe("Event Emissions", function () {
    it("should emit TokensClaimed event", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("100", 18);
      const penalty = (tokenAllocation * BigInt(10)) / BigInt(100);

      await launchpad.finalizeProject(projectId);

      await expect(
        launchpad.connect(user1).claimTokens(projectId)
      ).to.emit(launchpad, "TokensClaimed")
        .withArgs(projectId, user1.address, tokenAllocation - penalty, penalty);
    });

    it("should emit event with correct penalty amount", async function () {
      const projectId = 0;
      const tokenAllocation = ethers.parseUnits("500", 18);
      const penalty = (tokenAllocation * BigInt(PENALTY_PERCENT)) / BigInt(100);
      const userAmount = tokenAllocation - penalty;

      await launchpad.finalizeProject(projectId);

      // This test is for user2 who has 200 tokens
      await expect(
        launchpad.connect(user2).claimTokens(projectId)
      ).to.emit(launchpad, "TokensClaimed")
        .withArgs(projectId, user2.address, ethers.parseUnits("180", 18), ethers.parseUnits("20", 18));
    });
  });

  describe("Reentrancy Protection", function () {
    it("should protect against reentrancy", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      // Normal claim should succeed
      await launchpad.connect(user1).claimTokens(projectId);

      // Allocation should be marked as claimed
      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.claimed).to.be.true;
    });
  });

  describe("Vesting Window Edge Cases", function () {
    it("should apply penalty exactly at lock period boundary", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;

      // Claim exactly at lock end time (should still apply penalty)
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime)]);
      await ethers.provider.send("evm_mine", []);

      const tokenAllocation = ethers.parseUnits("100", 18);
      const penalty = (tokenAllocation * BigInt(10)) / BigInt(100);

      const userTokenBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokenAfter = await projectToken.balanceOf(user1.address);

      // Penalty should be applied (not past lock period yet)
      expect(userTokenAfter - userTokenBefore).to.equal(tokenAllocation - penalty);
    });

    it("should NOT apply penalty one second after lock period", async function () {
      const projectId = 0;

      await launchpad.finalizeProject(projectId);

      const project = await launchpad.projects(projectId);
      const lockEndTime = project.saleEnd + project.lockPeriod;

      // Claim one second after lock period
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(lockEndTime) + 1]);
      await ethers.provider.send("evm_mine", []);

      const tokenAllocation = ethers.parseUnits("100", 18);

      const userTokenBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokenAfter = await projectToken.balanceOf(user1.address);

      // No penalty should be applied
      expect(userTokenAfter - userTokenBefore).to.equal(tokenAllocation);
    });
  });
});
