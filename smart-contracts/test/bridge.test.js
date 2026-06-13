const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Bridge Simulation", function () {
  let owner, user, treasury;
  let usdc, sxp, sxuaHoodi, sxuaBase, bridgeManager;

  const LOCK_PERIOD = 30 * 24 * 60 * 60;
  const PENALTY_PERCENT = 10;

  beforeEach(async function () {
    [owner, user, treasury] = await ethers.getSigners();

    const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
    usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);

    const SXP = await ethers.getContractFactory("SXP");
    sxp = await SXP.deploy(treasury.address);

    const SXProxy = await ethers.getContractFactory("SXProxy");

    const SXUA = await ethers.getContractFactory("SXUA");
    const sxuaImpl = await SXUA.deploy();
    const sxuaInitData = sxuaImpl.interface.encodeFunctionData("initialize", [
      sxp.target,
      treasury.address,
      PENALTY_PERCENT,
      LOCK_PERIOD,
      treasury.address,
    ]);
    const sxuaProxy = await SXProxy.deploy(sxuaImpl.target, sxuaInitData);
    sxuaHoodi = SXUA.attach(sxuaProxy.target);

    const SXUA_Base = await ethers.getContractFactory("SXUA_Base");
    const sxuaBaseImpl = await SXUA_Base.deploy();
    const sxuaBaseInitData = sxuaBaseImpl.interface.encodeFunctionData("initialize", [
      sxp.target,
      treasury.address,
      PENALTY_PERCENT,
      LOCK_PERIOD,
      treasury.address,
    ]);
    const sxuaBaseProxy = await SXProxy.deploy(sxuaBaseImpl.target, sxuaBaseInitData);
    sxuaBase = SXUA_Base.attach(sxuaBaseProxy.target);

    const BridgeManager = await ethers.getContractFactory("BridgeManager");
    bridgeManager = await BridgeManager.deploy(sxuaHoodi.target);

    await sxp.setMinter(sxuaHoodi.target, true);
    await sxp.setMinter(sxuaBase.target, true);

    await sxuaHoodi.transferOwnership(owner.address);
    await sxuaBase.transferOwnership(owner.address);

    await sxuaBase.setTokenSupport(usdc.target, true);
    await sxuaHoodi.setTokenSupport(usdc.target, true);

    await usdc.mint(user.address, ethers.parseUnits("10000", 6));
    await usdc.connect(user).approve(sxuaBase.target, ethers.MaxUint256);
  });

  it("should request a cross-chain withdrawal from Base and finalize on Hoodi", async function () {
    const depositAmount = ethers.parseUnits("10000", 6);
    await expect(sxuaBase.connect(user).deposit(usdc.target, depositAmount))
      .to.emit(sxuaBase, "Deposited")
      .withArgs(user.address, usdc.target, depositAmount);

    expect(await sxuaBase.uncommittedBalances(user.address, usdc.target)).to.equal(depositAmount);

    const withdrawAmount = ethers.parseUnits("2500", 6);
    await expect(sxuaBase.connect(user).requestCrossChainWithdrawal(usdc.target, withdrawAmount, 560048, user.address))
      .to.emit(sxuaBase, "WithdrawalRequested")
      .withArgs(user.address, user.address, usdc.target, withdrawAmount, 1, 560048);

    expect(await sxuaBase.uncommittedBalances(user.address, usdc.target)).to.equal(depositAmount.sub(withdrawAmount));
    expect(await usdc.balanceOf(treasury.address)).to.equal(withdrawAmount);

    await expect(bridgeManager.connect(owner).finalizeWithdrawal(usdc.target, withdrawAmount, user.address, 84532, 1))
      .to.emit(bridgeManager, "WithdrawalFinalized")
      .withArgs(user.address, usdc.target, withdrawAmount, 84532, 1, ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(["address","uint256","address","uint256","uint256"], [usdc.target, withdrawAmount, user.address, 84532, 1])));

    expect(await sxuaHoodi.uncommittedBalances(user.address, usdc.target)).to.equal(withdrawAmount);
  });

  it("prevents the same withdrawal nonce from being finalized twice", async function () {
    const depositAmount = ethers.parseUnits("10000", 6);
    await sxuaBase.connect(user).deposit(usdc.target, depositAmount);
    const withdrawAmount = ethers.parseUnits("1000", 6);
    await sxuaBase.connect(user).requestCrossChainWithdrawal(usdc.target, withdrawAmount, 560048, user.address);

    await bridgeManager.connect(owner).finalizeWithdrawal(usdc.target, withdrawAmount, user.address, 84532, 1);
    await expect(bridgeManager.connect(owner).finalizeWithdrawal(usdc.target, withdrawAmount, user.address, 84532, 1))
      .to.be.revertedWith("BridgeManager: Request already processed");
  });
});
