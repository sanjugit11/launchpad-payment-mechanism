const hre = require("hardhat");

async function main() {
  const sxp = await hre.ethers.getContractAt("SXP", "0xCdFA51E2858b476aB754F9A6430972e64a69d6a7");
  const treasury = await sxp.treasury();
  console.log("Treasury address used in SXP:", treasury);

  const sxep = await hre.ethers.getContractAt("SXEP", "0x6532C7aA0EB8c784Da82EB2fd54dC52B2c1ad6Da");
  const sxepTreasury = await sxep.treasury();
  console.log("Treasury address used in SXEP:", sxepTreasury);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
