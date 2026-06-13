const hre = require("hardhat");

async function main() {
  // Proxy address
  const proxyAddress = "0x0CD4b3894ab7d059ba281BFD85b68CB80779C915";
  
  // Fetch ERC1967 Implementation Slot
  const slot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  const storage = await hre.ethers.provider.getStorage(proxyAddress, slot);
  const implAddress = hre.ethers.getAddress("0x" + storage.slice(-40));
  
  console.log(`Resolved SXUA Proxy ${proxyAddress} -> Implementation ${implAddress}`);

  const contracts = [
    {
      name: "SXUA (Implementation)",
      address: implAddress,
      args: [] 
    }
  ];

  for (const contract of contracts) {
    console.log(`\nVerifying ${contract.name} at ${contract.address}...`);
    try {
      await hre.run("verify:verify", {
        address: contract.address,
        constructorArguments: contract.args,
      });
      console.log(`✅ ${contract.name} verified successfully!`);
    } catch (e) {
      if (e.message.toLowerCase().includes("already verified")) {
        console.log(`✅ ${contract.name} is already verified!`);
      } else {
        console.error(`❌ Failed to verify ${contract.name}: ${e.message}`);
      }
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
