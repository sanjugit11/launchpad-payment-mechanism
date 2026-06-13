const { JsonRpcProvider, Contract } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    const ABI = ["function depositFor(address,address,uint256)"];
    const sxua = new Contract(sxuaAddr, ABI, provider);
    
    const userAddr = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

    try {
        await sxua.depositFor.staticCall(userAddr, usdcAddr, 1000);
    } catch (e) {
        console.log(e);
    }
}
main().catch(console.error);
