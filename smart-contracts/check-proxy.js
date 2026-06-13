const { JsonRpcProvider, Contract } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const sxuaAddr = "0xe24275b09B7eABf3491B6705D00D108421626429";
    const implSlot = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
    const impl = await provider.getStorage(sxuaAddr, implSlot);
    console.log("Implementation Address:", "0x" + impl.slice(26));
}
main().catch(console.error);
