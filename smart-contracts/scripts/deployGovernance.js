const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying SXGovernance with account:", deployer.address);

  // Use the deployer for Admin A, and some dummy/other accounts for Admin B and C
  // Or use the ones from deploy.js if they are known.
  // We'll use the deployer as adminA, and two other hardcoded addresses for B & C for testnet.
  const adminA = deployer.address;
  const adminB = "0xF7c106d14b2586676F5995f0f7e2f7Cce4f80fD9";
  const adminC = "0xb459e153eA3794FD7773B3e5522d3b633Ac5BE71";

  const SXGovernance = await ethers.getContractFactory("SXGovernance");
  const governance = await SXGovernance.deploy(adminA, adminB, adminC);
  await governance.waitForDeployment();
  
  console.log("SXGovernance deployed to:", governance.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
