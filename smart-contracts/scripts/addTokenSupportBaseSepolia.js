const hre = require("hardhat");
require("dotenv").config({ path: require('path').resolve(__dirname, '../../.env') });

async function main() {
    const sxuaAddr = process.env.VITE_SXUA_ADDRESS;
    const usdcAddr = process.env.VITE_USDC_ADDRESS;
    const usdtAddr = process.env.VITE_USDT_ADDRESS;
    const daiAddr = process.env.VITE_DAI_ADDRESS;

    if (!sxuaAddr || !usdcAddr || !usdtAddr || !daiAddr) {
        console.error("Error: Missing env variables in root .env file");
        console.log({ sxuaAddr, usdcAddr, usdtAddr, daiAddr });
        process.exit(1);
    }

    console.log("Adding token support on Base Sepolia SXUA at:", sxuaAddr);
    
    const SXUA_ABI = [
        "function setTokenSupport(address token, bool supported) external",
        "function supportedTokens(address token) external view returns (bool)"
    ];

    const [signer] = await hre.ethers.getSigners();
    console.log("Signer address:", signer.address);

    const sxua = new hre.ethers.Contract(sxuaAddr, SXUA_ABI, signer);

    // 1. USDC
    console.log("Checking USDC...");
    const isUsdcSupported = await sxua.supportedTokens(usdcAddr);
    if (!isUsdcSupported) {
        console.log("Adding USDC...");
        const tx = await sxua.setTokenSupport(usdcAddr, true);
        console.log("USDC Tx:", tx.hash);
        await tx.wait();
        console.log("USDC registered successfully!");
    } else {
        console.log("USDC already registered.");
    }

    // 2. USDT
    console.log("Checking USDT...");
    const isUsdtSupported = await sxua.supportedTokens(usdtAddr);
    if (!isUsdtSupported) {
        console.log("Adding USDT...");
        const tx = await sxua.setTokenSupport(usdtAddr, true);
        console.log("USDT Tx:", tx.hash);
        await tx.wait();
        console.log("USDT registered successfully!");
    } else {
        console.log("USDT already registered.");
    }

    // 3. DAI
    console.log("Checking DAI...");
    const isDaiSupported = await sxua.supportedTokens(daiAddr);
    if (!isDaiSupported) {
        console.log("Adding DAI...");
        const tx = await sxua.setTokenSupport(daiAddr, true);
        console.log("DAI Tx:", tx.hash);
        await tx.wait();
        console.log("DAI registered successfully!");
    } else {
        console.log("DAI already registered.");
    }

    console.log("All token registrations complete.");
}

main().catch(console.error);
