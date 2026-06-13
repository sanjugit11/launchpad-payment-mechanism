const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts to Base Sepolia with account:", deployer.address);
  const treasury = deployer.address; // Set deployer as the initial treasury for easy testing

  // 1. Deploy Mock Stablecoins (essential for testing on Base Sepolia)
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  console.log("Deploying Mock USDC...");
  const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);
  await usdc.waitForDeployment();
  console.log("Mock USDC deployed to:", usdc.target);

  console.log("Deploying Mock USDT...");
  const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
  await usdt.waitForDeployment();
  console.log("Mock USDT deployed to:", usdt.target);

  console.log("Deploying Mock DAI...");
  const dai = await MockStablecoin.deploy("Mock DAI", "DAI", 18);
  await dai.waitForDeployment();
  console.log("Mock DAI deployed to:", dai.target);

  // 2. Deploy SXP & SXCP
  const SXP = await ethers.getContractFactory("SXP");
  const SXCP = await ethers.getContractFactory("SXCP");

  console.log("Deploying SXP...");
  const sxp = await SXP.deploy(treasury);
  await sxp.waitForDeployment();

  console.log("Deploying SXCP...");
  const sxcp = await SXCP.deploy();
  await sxcp.waitForDeployment();

  await (await sxp.setSXCPToken(sxcp.target)).wait();
  await (await sxcp.setMinter(sxp.target, true)).wait();
  console.log("SXP deployed to:", sxp.target);
  console.log("SXCP deployed to:", sxcp.target);

  // 3. Deploy SXUA via UUPS Proxy
  const SXProxy = await ethers.getContractFactory("SXProxy");
  const SXUA = await ethers.getContractFactory("SXUA");

  console.log("Deploying SXUA Implementation...");
  const sxuaImpl = await SXUA.deploy();
  await sxuaImpl.waitForDeployment();

  const PENALTY_PERCENT = 10;
  const LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days

  console.log("Deploying SXUA Proxy...");
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

  // Register supported stablecoins on SXUA Proxy
  console.log("Registering Mock stablecoins as supported tokens on SXUA Proxy...");
  const sxua = await ethers.getContractAt("SXUA", sxuaProxy.target, deployer);
  await (await sxua.setTokenSupport(usdc.target, true)).wait();
  await (await sxua.setTokenSupport(usdt.target, true)).wait();
  await (await sxua.setTokenSupport(dai.target, true)).wait();
  console.log("Mock stablecoins registered successfully!");

  // 4. Deploy SXLaunchpad via UUPS Proxy
  const SXLaunchpad = await ethers.getContractFactory("SXLaunchpad");
  console.log("Deploying SXLaunchpad Implementation...");
  const launchpadImpl = await SXLaunchpad.deploy();
  await launchpadImpl.waitForDeployment();

  console.log("Deploying MarketMaker...");
  const MarketMaker = await ethers.getContractFactory("MarketMaker");
  const marketMaker = await MarketMaker.deploy();
  await marketMaker.waitForDeployment();
  console.log("MarketMaker deployed to:", marketMaker.target);

  console.log("Deploying SXLaunchpad Proxy...");
  const launchpadProxy = await SXProxy.deploy(
    launchpadImpl.target,
    launchpadImpl.interface.encodeFunctionData("initialize", [sxuaProxy.target, marketMaker.target, treasury])
  );
  await launchpadProxy.waitForDeployment();
  console.log("SXLaunchpad Proxy deployed to:", launchpadProxy.target);

  // 5. Deploy SXBuyStables
  console.log("Deploying SXBuyStables...");
  const SXBuyStables = await ethers.getContractFactory("SXBuyStables");
  const buyStables = await SXBuyStables.deploy(
    ethers.ZeroAddress, // Mock SXSE (Zero address bypasses check for testnet/demo)
    sxuaProxy.target, treasury, treasury, treasury
  );
  await buyStables.waitForDeployment();
  console.log("SXBuyStables deployed to:", buyStables.target);

  // Approve the newly deployed SXBuyStables contract to pull USDC from deployer (treasury)
  console.log("Approving SXBuyStables contract on USDC...");
  await (await usdc.approve(buyStables.target, ethers.MaxUint256)).wait();
  console.log("Approved successfully!");

  // 6. Deploy SXEP Exchange
  console.log("Deploying SXEP Exchange...");
  const SXEP = await ethers.getContractFactory("SXEP");
  const sxep = await SXEP.deploy(treasury);
  await sxep.waitForDeployment();
  console.log("SXEP deployed to:", sxep.target);

  console.log("\n==============================================");
  console.log("   BASE SEPOLIA DEPLOYMENT COMPLETE");
  console.log("==============================================");
  console.log(`VITE_USDC_ADDRESS="${usdc.target}"`);
  console.log(`VITE_USDT_ADDRESS="${usdt.target}"`);
  console.log(`VITE_DAI_ADDRESS="${dai.target}"`);
  console.log(`VITE_SXP_ADDRESS="${sxp.target}"`);
  console.log(`VITE_SXCP_ADDRESS="${sxcp.target}"`);
  console.log(`VITE_SXUA_ADDRESS="${sxuaProxy.target}"`);
  console.log(`VITE_SXLAUNCHPAD_ADDRESS="${launchpadProxy.target}"`);
  console.log(`VITE_SXEP_ADDRESS="${sxep.target}"`);
  console.log(`VITE_SX_BUY_STABLES_ADDRESS="${buyStables.target}"`);
  console.log("==============================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
