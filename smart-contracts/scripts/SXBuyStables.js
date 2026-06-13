const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log("Deploying SXBuyStables with the account:", deployer.address);

    // ================================================================
    // REPLACE THESE ADDRESSES WITH YOUR ACTUAL DEPLOYED ADDRESSES
    // ================================================================
    const mockSXSE = ethers.ZeroAddress; // Zero address bypasses check for testnet/demo
    const sxuaProxyAddress = "0xe24275b09B7eABf3491B6705D00D108421626429"; // Replace with your SXUA proxy address
    const treasuryAddress = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78"; // Replace with your Treasury address
    const marketMakerAddress = "0x394ff56b69d4f446f48718870CAce7A71f868097"; // Replace with your MarketMaker address
    const ptfReceiverAddress = treasuryAddress; // Usually routes to treasury

    if (sxuaProxyAddress === "0x0000000000000000000000000000000000000001") {
        console.warn("⚠️  Warning: Please replace the placeholder addresses in scripts/SXBuyStables.js before deploying to a live network.");
    }

    const SXBuyStables = await ethers.getContractFactory("SXBuyStables");
    const buyStables = await SXBuyStables.deploy(
        mockSXSE,
        sxuaProxyAddress,
        treasuryAddress,
        marketMakerAddress,
        ptfReceiverAddress
    );

    await buyStables.waitForDeployment();
    console.log("✅ SXBuyStables successfully deployed to:", buyStables.target);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });