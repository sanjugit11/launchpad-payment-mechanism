const hre = require("hardhat");

async function main() {
  const adminA = "0xF7c106d14b2586676F5995f0f7e2f7Cce4f80fD9";
  const adminB = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";
  const adminC = "0xb459e153eA3794FD7773B3e5522d3b633Ac5BE71";
  const treasury = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";

  // Resolve Implementation Addresses from Proxies
  const slot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  
  const sxuaProxy = "0xe24275b09B7eABf3491B6705D00D108421626429";
  const sxuaImplStorage = await hre.ethers.provider.getStorage(sxuaProxy, slot);
  const sxuaImpl = hre.ethers.getAddress("0x" + sxuaImplStorage.slice(-40));

  const lpProxy = "0xD82AeeA3e5528E11967BBFff54751Acf8129DcF1";
  const lpImplStorage = await hre.ethers.provider.getStorage(lpProxy, slot);
  const lpImpl = hre.ethers.getAddress("0x" + lpImplStorage.slice(-40));

  console.log(`Resolved SXUA Proxy ${sxuaProxy} -> Implementation ${sxuaImpl}`);
  console.log(`Resolved SXLAUNCHPAD Proxy ${lpProxy} -> Implementation ${lpImpl}`);

  const contracts = [
    {
      name: "SXCP",
      address: "0x7Fe17FBbD291AF0Dc5d632f3FdF611500b3f429D",
      args: []
    },
    {
      name: "SXP",
      address: "0xCdFA51E2858b476aB754F9A6430972e64a69d6a7",
      args: [treasury]
    },
    {
      name: "SXEP",
      address: "0x6532C7aA0EB8c784Da82EB2fd54dC52B2c1ad6Da",
      args: [treasury]
    },
    {
      name: "SXGovernance",
      address: "0x0b09b2995541AeeB3028086650659980E15C880d",
      args: [adminA, adminB, adminC]
    },
    {
      name: "SXUA (Implementation)",
      address: sxuaImpl,
      args: [] 
    },
    {
      name: "SXLAUNCHPAD (Implementation)",
      address: lpImpl,
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
