const { JsonRpcProvider, Contract } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    
    const ERC20_ABI = ["function balanceOf(address) view returns (uint256)"];
    const usdc = new Contract(usdcAddr, ERC20_ABI, provider);

    const bal = await usdc.balanceOf(sxuaAddr);
    console.log("SXUA USDC Balance:", bal.toString());
}
main().catch(console.error);
