const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying MarketMaker with the account:", deployer.address);

    const MarketMaker = await ethers.getContractFactory("MarketMaker");
    const marketMaker = await MarketMaker.deploy();

    await marketMaker.waitForDeployment();

    console.log("✅ MarketMaker successfully deployed to:", marketMaker.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });