const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const recipient = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";

  const tokens = {
    USDT: { address: "0xde026A36E80868bfA4Cbf7db0D69992Bc93a963C", decimals: 6 },
    DAI: { address: "0xD362A6cfdC525cD279Da2c85c2Cd546EAd31abd9", decimals: 18 }
  };

  const abi = [
    "function mint(address to, uint256 amount) external"
  ];

  for (const [name, info] of Object.entries(tokens)) {
    const contract = new ethers.Contract(info.address, abi, deployer);
    try {
      console.log(`Minting 10,000 ${name} to ${recipient}...`);
      const tx = await contract.mint(recipient, ethers.parseUnits("10000", info.decimals), {
        gasLimit: 15_000_000
      });
      await tx.wait();
      console.log(`Successfully minted 10,000 ${name}!`);
    } catch (e) {
      console.log(`Failed to mint ${name}:`, e.message);
    }
  }
}

main().catch(console.error);
