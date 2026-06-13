const { JsonRpcProvider, ethers } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const code = await provider.getCode("0x68d1a1e8ee7ce7dfb9b1feee00205d7b6625461e");
    
    const sig1 = ethers.id("depositFor(address,address,uint256)").slice(2, 10);
    const sig2 = ethers.id("deposit(address,uint256)").slice(2, 10);
    
    console.log("depositFor sig:", sig1, "in code?", code.includes(sig1));
    console.log("deposit sig:", sig2, "in code?", code.includes(sig2));
}
main().catch(console.error);
