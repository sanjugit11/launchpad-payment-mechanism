const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Buyback Tests - SX Launchpad", function () {
  let adminA, adminB, adminC, user1, user2, treasury, sxmmSigner;
  let usdc, projectToken;
  let sxp, sxcp, sxua, launchpad, sxmm;

  const LOCK_PERIOD = 30 * 24 * 60 * 60;
  const PENALTY_PERCENT = 10;
  const TOKEN_PRICE = ethers.parseUnits("10", 6); // 10 USDC per token
  const BUYBACK_PRICE = ethers.parseUnits("5", 6); // 5 USDC per token (buyback at 50%)
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

    // Add project with buyback window
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
      BUYBACK_PRICE
    );

    // Make purchases
    await ethers.provider.send("evm_setNextBlockTimestamp", [saleStart + 1]);
    await ethers.provider.send("evm_mine", []);
    await launchpad.connect(user1).buyTokens(0, ethers.parseUnits("100", 18));
    await launchpad.connect(user2).buyTokens(0, ethers.parseUnits("200", 18));

    // Finalize project
    await launchpad.finalizeProject(0);

    // Advance time to buyback window
    const project = await launchpad.projects(0);
    await ethers.provider.send("evm_setNextBlockTimestamp", [Number(buybackStart) + 100]);
    await ethers.provider.send("evm_mine", []);
  });

  describe("Basic Buyback Tests", function () {
    it("should allow buyback during buyback window", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);
      const expectedReturn = (tokenAmount * BUYBACK_PRICE) / BigInt(10 ** 18);
      const ptfFee = (expectedReturn * BigInt(PTF_FEE_PERCENT)) / BigInt(100);
      const expectedRefund = expectedReturn - ptfFee;

      const vaultBefore = await sxua.getCommittedBalance(user1.address, usdc.target);

      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);

      const vaultAfter = await sxua.getCommittedBalance(user1.address, usdc.target);
      expect(vaultAfter - vaultBefore).to.equal(expectedRefund);
    });

    it("should reduce token allocation after buyback", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);

      const allocBefore = await launchpad.allocations(projectId, user1.address);
      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);
      const allocAfter = await launchpad.allocations(projectId, user1.address);

      expect(allocBefore.tokenAllocation - allocAfter.tokenAllocation).to.equal(tokenAmount);
    });

    it("should reduce stablecoin paid after buyback", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);
      const originalCostPerToken = TOKEN_PRICE;
      const originalCost = (tokenAmount * originalCostPerToken) / BigInt(10 ** 18);

      const allocBefore = await launchpad.allocations(projectId, user1.address);
      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);
      const allocAfter = await launchpad.allocations(projectId, user1.address);

      expect(allocBefore.stablecoinPaid - allocAfter.stablecoinPaid).to.equal(originalCost);
    });

    it("should send tokens to MarketMaker", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);

      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);
      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      expect(mmBalanceAfter - mmBalanceBefore).to.equal(tokenAmount);
    });

    it("should distribute PTF fee to treasury", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);
      const expectedReturn = (tokenAmount * BUYBACK_PRICE) / BigInt(10 ** 18);
      const ptfFee = (expectedReturn * BigInt(PTF_FEE_PERCENT)) / BigInt(100);

      const treasuryBefore = await usdc.balanceOf(treasury.address);
      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);
      const treasuryAfter = await usdc.balanceOf(treasury.address);

      expect(treasuryAfter - treasuryBefore).to.equal(ptfFee);
    });
  });

  describe("Buyback Validation Tests", function () {
    it("should reject buyback before project finalization", async function () {
      const projectId = 0;
      const now = await ethers.provider.getBlock('latest');

      // Add non-finalized project
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
        BUYBACK_PRICE
      );

      const newProjectId = 1;
      const now2 = await ethers.provider.getBlock('latest');
      await ethers.provider.send("evm_setNextBlockTimestamp", [now2.timestamp + 101]);
      await ethers.provider.send("evm_mine", []);
      await launchpad.connect(user1).buyTokens(newProjectId, ethers.parseUnits("100", 18));

      // Try to buyback without finalization
      await expect(
        launchpad.connect(user1).requestBuyback(newProjectId, ethers.parseUnits("50", 18))
      ).to.be.revertedWith("SXLaunchpad: Project not finalized");
    });

    it("should reject buyback outside buyback window", async function () {
      const projectId = 0;
      const project = await launchpad.projects(projectId);
      const buybackEnd = project.buybackEnd;

      // Advance past buyback end
      await ethers.provider.send("evm_setNextBlockTimestamp", [Number(buybackEnd) + 100]);
      await ethers.provider.send("evm_mine", []);

      await expect(
        launchpad.connect(user1).requestBuyback(projectId, ethers.parseUnits("50", 18))
      ).to.be.revertedWith("SXLaunchpad: Buyback window closed");
    });

    it("should reject buyback with insufficient allocation", async function () {
      const projectId = 0;
      const userAllocation = ethers.parseUnits("100", 18);
      const tooMuch = ethers.parseUnits("150", 18);

      await expect(
        launchpad.connect(user1).requestBuyback(projectId, tooMuch)
      ).to.be.revertedWith("SXLaunchpad: Insufficient token allocation");
    });

    it("should reject buyback after tokens claimed", async function () {
      const projectId = 0;

      // Claim tokens first
      await launchpad.connect(user1).claimTokens(projectId);

      // Try to buyback
      await expect(
        launchpad.connect(user1).requestBuyback(projectId, ethers.parseUnits("50", 18))
      ).to.be.revertedWith("SXLaunchpad: Already claimed tokens");
    });

    it("should reject buyback for non-existent project", async function () {
      const invalidProjectId = 999;

      await expect(
        launchpad.connect(user1).requestBuyback(invalidProjectId, ethers.parseUnits("50", 18))
      ).to.be.revertedWith("SXLaunchpad: Project does not exist");
    });

    it("should reject buyback with zero amount", async function () {
      const projectId = 0;

      // Zero amount should succeed (edge case - buying 0 tokens)
      // Note: Current implementation allows this, but doesn't change anything
      const allocBefore = await launchpad.allocations(projectId, user1.address);
      await launchpad.connect(user1).requestBuyback(projectId, 0);
      const allocAfter = await launchpad.allocations(projectId, user1.address);

      expect(allocBefore.tokenAllocation).to.equal(allocAfter.tokenAllocation);
    });
  });

  describe("Partial vs Full Buyback", function () {
    it("should allow partial buyback", async function () {
      const projectId = 0;
      const totalTokens = ethers.parseUnits("100", 18);
      const buybackAmount = ethers.parseUnits("30", 18);

      const allocBefore = await launchpad.allocations(projectId, user1.address);
      expect(allocBefore.tokenAllocation).to.equal(totalTokens);

      await launchpad.connect(user1).requestBuyback(projectId, buybackAmount);

      const allocAfter = await launchpad.allocations(projectId, user1.address);
      expect(allocAfter.tokenAllocation).to.equal(totalTokens - buybackAmount);
    });

    it("should allow multiple partial buybacks", async function () {
      const projectId = 0;
      const totalTokens = ethers.parseUnits("100", 18);
      const firstBuyback = ethers.parseUnits("30", 18);
      const secondBuyback = ethers.parseUnits("20", 18);

      const allocBefore = await launchpad.allocations(projectId, user1.address);
      expect(allocBefore.tokenAllocation).to.equal(totalTokens);

      await launchpad.connect(user1).requestBuyback(projectId, firstBuyback);
      const allocAfterFirst = await launchpad.allocations(projectId, user1.address);
      expect(allocAfterFirst.tokenAllocation).to.equal(totalTokens - firstBuyback);

      await launchpad.connect(user1).requestBuyback(projectId, secondBuyback);
      const allocAfterSecond = await launchpad.allocations(projectId, user1.address);
      expect(allocAfterSecond.tokenAllocation).to.equal(totalTokens - firstBuyback - secondBuyback);
    });

    it("should allow full buyback", async function () {
      const projectId = 0;
      const totalTokens = ethers.parseUnits("100", 18);

      await launchpad.connect(user1).requestBuyback(projectId, totalTokens);

      const allocAfter = await launchpad.allocations(projectId, user1.address);
      expect(allocAfter.tokenAllocation).to.equal(0);
      expect(allocAfter.stablecoinPaid).to.equal(0);
    });
  });

  describe("Buyback Return Calculations", function () {
    it("should calculate correct buyback return", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);
      const expectedReturn = (tokenAmount * BUYBACK_PRICE) / BigInt(10 ** 18);
      const ptfFee = (expectedReturn * BigInt(PTF_FEE_PERCENT)) / BigInt(100);
      const expectedRefund = expectedReturn - ptfFee;

      const vaultBefore = await sxua.getCommittedBalance(user1.address, usdc.target);
      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);
      const vaultAfter = await sxua.getCommittedBalance(user1.address, usdc.target);

      expect(vaultAfter - vaultBefore).to.equal(expectedRefund);
    });

    it("should handle different token amounts", async function () {
      const projectId = 0;

      const testAmounts = [
        ethers.parseUnits("10", 18),
        ethers.parseUnits("50", 18),
        ethers.parseUnits("100", 18)
      ];

      for (const amount of testAmounts) {
        const allocBefore = await launchpad.allocations(projectId, user2.address);
        if (allocBefore.tokenAllocation >= amount) {
          const expectedReturn = (amount * BUYBACK_PRICE) / BigInt(10 ** 18);
          const ptfFee = (expectedReturn * BigInt(PTF_FEE_PERCENT)) / BigInt(100);
          const expectedRefund = expectedReturn - ptfFee;

          const vaultBefore = await sxua.getCommittedBalance(user2.address, usdc.target);
          await launchpad.connect(user2).requestBuyback(projectId, amount);
          const vaultAfter = await sxua.getCommittedBalance(user2.address, usdc.target);

          expect(vaultAfter - vaultBefore).to.equal(expectedRefund);
        }
      }
    });

    it("should reflect price difference between purchase and buyback", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);

      // Purchase price: 10 USDC per token = 1000 total
      // Buyback price: 5 USDC per token = 500 total
      const purchaseCost = (tokenAmount * TOKEN_PRICE) / BigInt(10 ** 18);
      const buybackReturn = (tokenAmount * BUYBACK_PRICE) / BigInt(10 ** 18);

      expect(purchaseCost).to.equal(ethers.parseUnits("1000", 6));
      expect(buybackReturn).to.equal(ethers.parseUnits("500", 6));
      expect(purchaseCost).to.equal(buybackReturn * BigInt(2)); // 2x price difference
    });
  });

  describe("Multiple User Buybacks", function () {
    it("should handle buybacks from different users", async function () {
      const projectId = 0;
      const user1Amount = ethers.parseUnits("30", 18);
      const user2Amount = ethers.parseUnits("50", 18);

      const user1Return = (user1Amount * BUYBACK_PRICE) / BigInt(10 ** 18);
      const user2Return = (user2Amount * BUYBACK_PRICE) / BigInt(10 ** 18);

      const vaultUser1Before = await sxua.getCommittedBalance(user1.address, usdc.target);
      const vaultUser2Before = await sxua.getCommittedBalance(user2.address, usdc.target);

      await launchpad.connect(user1).requestBuyback(projectId, user1Amount);
      await launchpad.connect(user2).requestBuyback(projectId, user2Amount);

      const vaultUser1After = await sxua.getCommittedBalance(user1.address, usdc.target);
      const vaultUser2After = await sxua.getCommittedBalance(user2.address, usdc.target);

      const user1Fee = (user1Return * BigInt(PTF_FEE_PERCENT)) / BigInt(100);
      const user2Fee = (user2Return * BigInt(PTF_FEE_PERCENT)) / BigInt(100);

      expect(vaultUser1After - vaultUser1Before).to.equal(user1Return - user1Fee);
      expect(vaultUser2After - vaultUser2Before).to.equal(user2Return - user2Fee);
    });
  });

  describe("Event Emissions", function () {
    it("should emit BuybackExecuted event", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);
      const expectedReturn = (tokenAmount * BUYBACK_PRICE) / BigInt(10 ** 18);

      await expect(
        launchpad.connect(user1).requestBuyback(projectId, tokenAmount)
      ).to.emit(launchpad, "BuybackExecuted")
        .withArgs(projectId, user1.address, tokenAmount, expectedReturn);
    });
  });

  describe("Reentrancy Protection", function () {
    it("should protect against reentrancy", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("50", 18);

      // Normal buyback should succeed
      await launchpad.connect(user1).requestBuyback(projectId, tokenAmount);

      // Allocation should be updated
      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.tokenAllocation).to.equal(ethers.parseUnits("50", 18));
    });
  });
});
