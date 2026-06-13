const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SX Launchpad - Complete Flow Tests", function () {
  let adminA, user1, user2, treasury;
  let dai, projectToken;
  let sxp, sxcp, sxua, launchpad, sxmm;

  const LOCK_PERIOD = 30 * 24 * 60 * 60;
  const PENALTY_PERCENT = 10;
  const TOKEN_PRICE = ethers.parseUnits("10", 18);
  const BUYBACK_PRICE = ethers.parseUnits("5", 18);

  beforeEach(async function () {
    [adminA, user1, user2, treasury] = await ethers.getSigners();

    // Deploy MarketMaker
    const MarketMaker = await ethers.getContractFactory("MarketMaker");
    sxmm = await MarketMaker.deploy();

    // Deploy stablecoins (DAI with 18 decimals to match price calculations)
    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    dai = await MockStablecoin.deploy("Mock DAI", "DAI", 18);
    projectToken = await MockStablecoin.deploy("Project Token", "PT", 18);

    // Deploy SXP & SXCP
    const SXP = await ethers.getContractFactory("SXP");
    sxp = await SXP.deploy(treasury.address);
    const SXCP = await ethers.getContractFactory("SXCP");
    sxcp = await SXCP.deploy();
    await sxp.setSXCPToken(sxcp.target);
    await sxcp.setMinter(sxp.target, true);

    // Deploy SXUA
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

    // Deploy SXLaunchpad
    const SXLaunchpad = await ethers.getContractFactory("SXLaunchpad");
    const launchpadImpl = await SXLaunchpad.deploy();
    const launchpadInitData = launchpadImpl.interface.encodeFunctionData("initialize", [
      sxua.target,
      sxmm.target,
      treasury.address
    ]);
    const launchpadProxy = await SXProxy.deploy(launchpadImpl.target, launchpadInitData);
    launchpad = SXLaunchpad.attach(launchpadProxy.target);

    // Setup tokens
    await sxua.setTokenSupport(dai.target, true);

    // Mint and setup users
    await dai.mint(user1.address, ethers.parseUnits("100000", 18));
    await dai.mint(user2.address, ethers.parseUnits("100000", 18));
    await dai.connect(user1).approve(sxua.target, ethers.MaxUint256);
    await dai.connect(user2).approve(sxua.target, ethers.MaxUint256);

    // Deposit into SXUA vault
    await sxua.connect(user1).deposit(dai.target, ethers.parseUnits("100000", 18));
    await sxua.connect(user2).deposit(dai.target, ethers.parseUnits("100000", 18));

    // Mint project tokens to launchpad
    await projectToken.mint(launchpad.target, ethers.parseUnits("1000000", 18));

    // Add project
    const now = await ethers.provider.getBlock('latest');
    const saleStart = now.timestamp + 100;
    const saleEnd = now.timestamp + 200;
    const buybackStart = saleEnd + LOCK_PERIOD + 1;
    const buybackEnd = buybackStart + 1000;

    await launchpad.addProject(
      projectToken.target,
      dai.target,
      TOKEN_PRICE,
      saleStart,
      saleEnd,
      LOCK_PERIOD,
      PENALTY_PERCENT,
      buybackStart,
      buybackEnd,
      BUYBACK_PRICE
    );
  });

  describe("1. PAYMENT - User buys tokens during sale", function () {
    it("should allow user to buy tokens and deduct stablecoins", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);
      const expectedCost = (tokenAmount * TOKEN_PRICE) / BigInt(10 ** 18);

      // Fast forward to sale start
      await ethers.provider.send("evm_mine", []);

      const vaultBefore = await sxua.uncommittedBalances(user1.address, dai.target);
      await launchpad.connect(user1).buyTokens(projectId, tokenAmount);
      const vaultAfter = await sxua.uncommittedBalances(user1.address, dai.target);

      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.tokenAllocation).to.equal(tokenAmount);
      expect(alloc.stablecoinPaid).to.equal(expectedCost);
      expect(vaultBefore - vaultAfter).to.be.greaterThan(expectedCost); // includes PTF fee
    });

    it("should accumulate multiple purchases", async function () {
      const projectId = 0;
      const amount1 = ethers.parseUnits("50", 18);
      const amount2 = ethers.parseUnits("30", 18);

      await ethers.provider.send("evm_mine", []);

      await launchpad.connect(user1).buyTokens(projectId, amount1);
      await launchpad.connect(user1).buyTokens(projectId, amount2);

      const alloc = await launchpad.allocations(projectId, user1.address);
      expect(alloc.tokenAllocation).to.equal(amount1 + amount2);
    });
  });

  describe("2. REFUND - User refunds before finalization", function () {
    it("should allow refund before finalization and forfeit tokens", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);

      await ethers.provider.send("evm_mine", []);
      await launchpad.connect(user1).buyTokens(projectId, tokenAmount);

      const allocBefore = await launchpad.allocations(projectId, user1.address);
      const mmBalanceBefore = await projectToken.balanceOf(sxmm.target);

      await launchpad.connect(user1).requestRefund(projectId);

      const allocAfter = await launchpad.allocations(projectId, user1.address);
      const mmBalanceAfter = await projectToken.balanceOf(sxmm.target);

      // Tokens should be forfeited
      expect(mmBalanceAfter - mmBalanceBefore).to.equal(tokenAmount);
      // Allocation should be zeroed
      expect(allocAfter.tokenAllocation).to.equal(0);
      expect(allocAfter.stablecoinPaid).to.equal(0);
      expect(allocAfter.refunded).to.be.true;
    });
  });

  describe("3. BUYBACK - User sells tokens back during buyback window", function () {
    it("should allow buyback and return stablecoins", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);

      // Purchase tokens
      await ethers.provider.send("evm_mine", []);
      await launchpad.connect(user1).buyTokens(projectId, tokenAmount);

      // Finalize project
      await launchpad.finalizeProject(projectId);

      // Jump to buyback window
      const project = await launchpad.projects(projectId);
      const buybackStart = Number(project.buybackStart);
      await ethers.provider.send("evm_setNextBlockTimestamp", [buybackStart + 100]);
      await ethers.provider.send("evm_mine", []);

      // Execute buyback
      const vaultBefore = await sxua.uncommittedBalances(user1.address, dai.target);
      await launchpad.connect(user1).requestBuyback(projectId, ethers.parseUnits("50", 18));
      const vaultAfter = await sxua.uncommittedBalances(user1.address, dai.target);

      // Should get refund
      expect(vaultAfter).to.be.greaterThan(vaultBefore);
    });
  });

  describe("4. FORFEITURE - User claims with penalty or no penalty", function () {
    it("should apply penalty for early claim", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);
      const expectedPenalty = (tokenAmount * BigInt(PENALTY_PERCENT)) / BigInt(100);

      // Purchase and finalize
      await ethers.provider.send("evm_mine", []);
      await launchpad.connect(user1).buyTokens(projectId, tokenAmount);
      await launchpad.finalizeProject(projectId);

      // Claim immediately (before lock period) - should have penalty
      const userTokensBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokensAfter = await projectToken.balanceOf(user1.address);

      expect(userTokensAfter - userTokensBefore).to.equal(tokenAmount - expectedPenalty);
    });

    it("should NOT apply penalty after lock period", async function () {
      const projectId = 0;
      const tokenAmount = ethers.parseUnits("100", 18);

      // Purchase and finalize
      await ethers.provider.send("evm_mine", []);
      await launchpad.connect(user1).buyTokens(projectId, tokenAmount);
      await launchpad.finalizeProject(projectId);

      // Jump past lock period
      const project = await launchpad.projects(projectId);
      const lockEnd = Number(project.saleEnd) + Number(project.lockPeriod);
      await ethers.provider.send("evm_setNextBlockTimestamp", [lockEnd + 100]);
      await ethers.provider.send("evm_mine", []);

      // Claim after lock - NO penalty
      const userTokensBefore = await projectToken.balanceOf(user1.address);
      await launchpad.connect(user1).claimTokens(projectId);
      const userTokensAfter = await projectToken.balanceOf(user1.address);

      expect(userTokensAfter - userTokensBefore).to.equal(tokenAmount);
    });
  });
});
