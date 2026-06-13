const { ethers } = require("hardhat");

async function main() {
    // Get the deployer account (make sure this is the MarketMaker account via Private Key in .env)
    const [marketMaker] = await ethers.getSigners();

    const USDC_ADDRESS = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3"; // From your frontend env
    const SX_BUY_STABLES = "0x03e0cbfFcc6e75a02601a73e61ca2a5BA12c7A24";

    console.log("Setting up Market Maker:", marketMaker.address);

    // Attach to your Mock USDC contract
    const usdc = await ethers.getContractAt("MockStablecoin", USDC_ADDRESS, marketMaker);

    console.log("1. Minting 1,000,000 USDC to Market Maker for liquidity...");
    let tx = await usdc.mint(marketMaker.address, ethers.parseUnits("1000000", 6));
    await tx.wait();

    console.log("2. Approving SXBuyStables to pull USDC...");
    tx = await usdc.approve(SX_BUY_STABLES, ethers.MaxUint256);
    await tx.wait();

    console.log("✅ Market Maker is fully funded and approved! Frontend purchases will now work.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});