const { JsonRpcProvider, Contract } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

const SXUA_ABI = [
  "function supportedTokens(address) view returns (bool)"
];

async function main() {
    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
    const sxua = new Contract(sxuaAddr, SXUA_ABI, provider);

    const isSupported = await sxua.supportedTokens(usdcAddr);
    console.log("Is USDC supported in SXUA?", isSupported);
}

main().catch(console.error);
