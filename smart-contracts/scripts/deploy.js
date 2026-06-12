const { ethers } = require("hardhat");

async function main() {
  const [deployer, adminA, adminB, adminC, treasury] = await ethers.getSigners();

  console.log("Deploying contracts with the account:", deployer.address);

  // 1. Deploy Mock Stablecoins (useful for testnets)
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  const usdc = await MockStablecoin.deploy("Mock USDC", "USDC", 6);
  const usdt = await MockStablecoin.deploy("Mock USDT", "USDT", 6);
  const dai  = await MockStablecoin.deploy("Mock DAI",  "DAI",  18);
  console.log("Mock Stablecoins deployed.");

  // 2. Deploy Governance
  const SXGovernance = await ethers.getContractFactory("SXGovernance");
  const governance = await SXGovernance.deploy(adminA.address, adminB.address, adminC.address);
  console.log("SXGovernance deployed to:", governance.target);

  // 3. Deploy SXP & SXCP
  const SXP  = await ethers.getContractFactory("SXP");
  const SXCP = await ethers.getContractFactory("SXCP");
  const sxp  = await SXP.deploy(treasury.address);
  const sxcp = await SXCP.deploy();
  await sxp.setSXCPToken(sxcp.target);
  await sxcp.setMinter(sxp.target, true);
  console.log("SXP deployed to:", sxp.target);
  console.log("SXCP deployed to:", sxcp.target);

  // 4. Deploy SXUA via UUPS Proxy
  const SXProxy = await ethers.getContractFactory("SXProxy");
  const SXUA    = await ethers.getContractFactory("SXUA");
  const sxuaImpl  = await SXUA.deploy();
  
  const PENALTY_PERCENT = 10;
  const LOCK_PERIOD = 30 * 24 * 60 * 60; // 30 days

  const sxuaProxy = await SXProxy.deploy(
    sxuaImpl.target,
    sxuaImpl.interface.encodeFunctionData("initialize", [
      sxp.target, treasury.address, PENALTY_PERCENT, LOCK_PERIOD
    ])
  );
  
  // Make SXUA a minter on SXP
  await sxp.setMinter(sxuaProxy.target, true);
  console.log("SXUA Proxy deployed to:", sxuaProxy.target);
  console.log("SXUA Implementation deployed to:", sxuaImpl.target);

  // 5. Deploy SXLaunchpad via UUPS Proxy
  const SXLaunchpad    = await ethers.getContractFactory("SXLaunchpad");
  const launchpadImpl  = await SXLaunchpad.deploy();
  const launchpadProxy = await SXProxy.deploy(
    launchpadImpl.target,
    launchpadImpl.interface.encodeFunctionData("initialize", [sxuaProxy.target, treasury.address])
  );
  console.log("SXLaunchpad Proxy deployed to:", launchpadProxy.target);

  // 6. Deploy SXEP Exchange
  const SXEP = await ethers.getContractFactory("SXEP");
  const sxep = await SXEP.deploy(treasury.address);
  console.log("SXEP deployed to:", sxep.target);

  console.log("--- Deployment Complete ---");
  console.log("USDC:        ", usdc.target);
  console.log("USDT:        ", usdt.target);
  console.log("DAI:         ", dai.target);
  console.log("Governance:  ", governance.target);
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
