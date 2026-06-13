const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Setting up Launchpad project with account:", deployer.address);

  let nonce = await ethers.provider.getTransactionCount(deployer.address);
  console.log("Starting nonce:", nonce);

  const txOptions = () => ({
    nonce: nonce++,
    gasLimit: 15000000
  });

  const LAUNCHPAD_ADDRESS = "0xD82AeeA3e5528E11967BBFff54751Acf8129DcF1";
  const USDC_ADDRESS = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

  // 1. Deploy a new Mock Project Token
  const MockStablecoin = await ethers.getContractFactory("MockStablecoin");
  console.log("Deploying Active Launchpad Token (ALT)...");
  
  const deployTx = await MockStablecoin.getDeployTransaction("Active Launchpad Token", "ALT", 18);
  const sentTx = await deployer.sendTransaction({
    ...deployTx,
    ...txOptions()
  });
  const receipt = await sentTx.wait();
  const tokenAddress = receipt.contractAddress;
  console.log("Token deployed to:", tokenAddress);

  const projectToken = MockStablecoin.attach(tokenAddress);

  // 2. Register project on SXLaunchpad
  const launchpad = await ethers.getContractAt("SXLaunchpad", LAUNCHPAD_ADDRESS);
  console.log(`Adding new project...`);

  const latestBlock = await ethers.provider.getBlock("latest");
  const now = latestBlock.timestamp;
  const saleStart = now - 3600; // Started 1 hour ago
  const saleEnd = now + 7 * 86400; // Ends in 7 days
  const lockPeriod = 30 * 86400; // 30 days lock
  const penaltyPercent = 10; // 10% penalty
  const buybackStart = saleEnd + 86400; // 1 day after sale ends
  const buybackEnd = buybackStart + 7 * 86400; // 7 days
  
  const price = ethers.parseUnits("0.05", 18); 
  const buybackPrice = ethers.parseUnits("0.04", 18);

  const addProjectTx = await launchpad.addProject(
    tokenAddress,
    USDC_ADDRESS,
    price,
    saleStart,
    saleEnd,
    lockPeriod,
    penaltyPercent,
    buybackStart,
    buybackEnd,
    buybackPrice,
    txOptions()
  );
  const addProjectReceipt = await addProjectTx.wait();
  console.log(`Project added successfully! Transaction: ${addProjectTx.hash}`);

  // Find the ProjectAdded event to get the projectId
  let projectId;
  for (const log of addProjectReceipt.logs) {
    try {
      const parsedLog = launchpad.interface.parseLog(log);
      if (parsedLog.name === "ProjectAdded") {
        projectId = parsedLog.args.projectId.toString();
        break;
      }
    } catch (e) {
      // Ignore logs that don't match the interface
    }
  }
  
  if (projectId !== undefined) {
    console.log(`Found Project ID from events: ${projectId}`);
  } else {
    console.log("Could not find ProjectAdded event. Assuming ID 0 for UI.");
    projectId = "0";
  }

  // 3. Mint tokens to the Launchpad so it can allocate them
  console.log("Minting tokens to Launchpad...");
  const mintAmount = ethers.parseUnits("1000000", 18); // 1 million tokens
  const mintTx = await projectToken.mint(LAUNCHPAD_ADDRESS, mintAmount, txOptions());
  await mintTx.wait();
  console.log("Minted 1,000,000 ALT to Launchpad.");

  console.log(`\n--- Setup Complete ---`);
  console.log(`Project ID: ${projectId}`);
  console.log(`Token Address: ${tokenAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
