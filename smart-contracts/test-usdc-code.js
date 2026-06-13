const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const code = await provider.getCode("0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3");
    console.log("Code length:", code.length);
}
main().catch(console.error);
