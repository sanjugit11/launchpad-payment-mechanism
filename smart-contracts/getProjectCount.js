const { ethers } = require("hardhat");

async function main() {
  const launchpadAddress = "0xD82AeeA3e5528E11967BBFff54751Acf8129DcF1";
  const data = ethers.id("getProjectCount()").substring(0, 10);
  
  const [deployer] = await ethers.getSigners();
  const nonce = await ethers.provider.getTransactionCount(deployer.address);
  
  try {
    const result = await ethers.provider.call({
      to: launchpadAddress,
      data: data,
      from: deployer.address,
      nonce: nonce
    });
    console.log("Count:", ethers.toNumber(result));
  } catch(e) {
    console.log("Error calling getProjectCount:", e.message);
  }
}
main();
