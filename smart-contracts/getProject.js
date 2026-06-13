const { ethers } = require("hardhat");

async function main() {
  const launchpadAddress = "0xD82AeeA3e5528E11967BBFff54751Acf8129DcF1";
  
  const [deployer] = await ethers.getSigners();
  const launchpad = await ethers.getContractAt("SXLaunchpad", launchpadAddress);
  
  const p1 = await launchpad.getProject(1);
  console.log("Project 1 active:", p1.active);
  console.log("Project 1 saleStart:", p1.saleStart);
  console.log("Project 1 saleEnd:", p1.saleEnd);
}
main();
