const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);
  const adminA = "0xF7c106d14b2586676F5995f0f7e2f7Cce4f80fD9";
  const adminB = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";
  const adminC = "0xb459e153eA3794FD7773B3e5522d3b633Ac5BE71";
  const treasury = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";
  // 1. Deploy Mock Stablecoins (useful for testnets)
  // const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  // const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);
  // const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
  // const dai  = await MockStablecoin.deploy("Mock DAI",  "DAI",  18);
  // console.log("Mock Stablecoins deployed.",usdc.target, usdt.target, dai.target);

  // 2. Deploy Governance
  const SXGovernance = await ethers.getContractFactory("SXGovernance");
  const governance = await SXGovernance.deploy(adminA, adminB, adminC);
  console.log("SXGovernance deployed to:", governance.target);
   return ;
  // 3. Deploy SXP & SXCP
  console.log("here")
  const SXP = await ethers.getContractFactory("SXP");

  const SXCP = await ethers.getContractFactory("SXCP");
  const sxp = await SXP.deploy(treasury);
  await sxp.waitForDeployment();
  const sxcp = await SXCP.deploy();
  await sxcp.waitForDeployment();
  console.log("here2")
  await (await sxp.setSXCPToken(sxcp.target)).wait();
  await (await sxcp.setMinter(sxp.target, true)).wait();
  console.log("SXP deployed to:", sxp.target);
  console.log("SXCP deployed to:", sxcp.target);

  // 4. Deploy SXUA via UUPS Proxy
  const SXProxy = await ethers.getContractFactory("SXProxy");
  const SXUA = await ethers.getContractFactory("SXUA");
  const sxuaImpl = await SXUA.deploy();
  await sxuaImpl.waitForDeployment();

  const PENALTY_PERCENT = 10;
  const LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days

  const sxuaProxy = await SXProxy.deploy(
    sxuaImpl.target,
    sxuaImpl.interface.encodeFunctionData("initialize", [
      sxp.target, treasury, PENALTY_PERCENT, LOCK_PERIOD, treasury
    ])
  );
  await sxuaProxy.waitForDeployment();

  // Make SXUA a minter on SXP
  await (await sxp.setMinter(sxuaProxy.target, true)).wait();
  console.log("SXUA Proxy deployed to:", sxuaProxy.target);
  console.log("SXUA Implementation deployed to:", sxuaImpl.target);

  // 5. Deploy SXLaunchpad via UUPS Proxy
  const SXLaunchpad = await ethers.getContractFactory("SXLaunchpad");
  const launchpadImpl = await SXLaunchpad.deploy();
  await launchpadImpl.waitForDeployment();

  // Deploy MarketMaker
  const MarketMaker = await ethers.getContractFactory("MarketMaker");
  const marketMaker = await MarketMaker.deploy();
  await marketMaker.waitForDeployment();
  console.log("MarketMaker deployed to:", marketMaker.target);

  const launchpadProxy = await SXProxy.deploy(
    launchpadImpl.target,
    launchpadImpl.interface.encodeFunctionData("initialize", [sxuaProxy.target, marketMaker.target, treasury])
  );
  await launchpadProxy.waitForDeployment();
  console.log("SXLaunchpad Proxy deployed to:", launchpadProxy.target);

  // Deploy SXBuyStables
  const SXBuyStables = await ethers.getContractFactory("SXBuyStables");
  const buyStables = await SXBuyStables.deploy(
    ethers.ZeroAddress, // Mock SXSE (Zero address bypasses check for testnet/demo)
    sxuaProxy.target, treasury, treasury, treasury
  );
  await buyStables.waitForDeployment();
  console.log("SXBuyStables deployed to:", buyStables.target);

  // Approve the newly deployed SXBuyStables contract to pull USDC from deployer (treasury)
  const USDC_ADDRESS = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
  const usdc = await ethers.getContractAt("IERC20", USDC_ADDRESS, deployer);
  console.log("Approving SXBuyStables contract on USDC...");
  await (await usdc.approve(buyStables.target, ethers.MaxUint256)).wait();
  console.log("Approved successfully!");

  // 6. Deploy SXEP Exchange
  const SXEP = await ethers.getContractFactory("SXEP");
  const sxep = await SXEP.deploy(treasury);
  await sxep.waitForDeployment();
  console.log("SXEP deployed to:", sxep.target);

  console.log("--- Deployment Complete ---");
  // console.log("USDC:        ", usdc.address);
  // console.log("USDT:        ", usdt.address);
  // console.log("DAI:         ", dai.address);
  // console.log("Governance:  ", governance.target);
  console.log("SXP:         ", sxp.target);
  console.log("SXCP:        ", sxcp.target);
  console.log("SXUA Proxy:  ", sxuaProxy.target);
  console.log("Launchpad:   ", launchpadProxy.target);
  console.log("SXEP:        ", sxep.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
