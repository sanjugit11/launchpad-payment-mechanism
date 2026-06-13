const { JsonRpcProvider, Contract, parseEther } = require('ethers');

const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
    const userAddr = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";

    const sxmmAddr = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";
    
    const ERC20_ABI = [
        "function allowance(address, address) view returns (uint256)",
        "function balanceOf(address) view returns (uint256)"
    ];
    const usdc = new Contract(usdcAddr, ERC20_ABI, provider);

    const allowance = await usdc.allowance(sxmmAddr, buyStablesAddr);
    console.log("SXMM Allowance:", allowance.toString());

    const balance = await usdc.balanceOf(sxmmAddr);
    console.log("SXMM Balance:", balance.toString());

    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    const SXUA_ABI = ["function paused() view returns (bool)"];
    const sxua = new Contract(sxuaAddr, SXUA_ABI, provider);
    console.log("SXUA Paused?", await sxua.paused());
}

main().catch(console.error);
