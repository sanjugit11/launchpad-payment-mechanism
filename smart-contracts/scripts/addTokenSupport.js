const hre = require("hardhat");

async function main() {
    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

    console.log("Adding USDC token support to SXUA...");
    
    const SXUA_ABI = [
        "function setTokenSupport(address token, bool supported) external"
    ];

    const [signer] = await hre.ethers.getSigners();
    console.log("Signer address:", signer.address);

    const sxua = new hre.ethers.Contract(sxuaAddr, SXUA_ABI, signer);

    const tx = await sxua.setTokenSupport(usdcAddr, true);
    console.log("Tx hash:", tx.hash);
    await tx.wait();
    console.log("USDC successfully added to SXUA supported tokens!");
}

main().catch(console.error);
