const { JsonRpcProvider, Contract } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

const SXUA_ABI = [
  "function owner() view returns (address)"
];

async function main() {
    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    const sxua = new Contract(sxuaAddr, SXUA_ABI, provider);

    console.log("Owner of SXUA:", await sxua.owner());
}

main().catch(console.error);
