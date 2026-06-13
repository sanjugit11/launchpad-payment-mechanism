const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const code = await provider.getCode("0x68d1a1e8ee7ce7dfb9b1feee00205d7b6625461e");
    const sig = "b3db428b"; // depositFor(address,address,uint256)
    console.log("Has depositFor signature:", code.includes(sig));
    
    // Check if it has regular deposit(address,uint256) which is 0xf242432a
    console.log("Has deposit signature:", code.includes("f242432a"));
}
main().catch(console.error);
