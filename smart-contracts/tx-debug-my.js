const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const txHash1 = "0x35c1d7f32044754f32455bb85bfd3f81d64b70935b88e0ee792faf93c26df0f8";
    const txHash2 = "0x36bb0cc33d09e4df9c729ffeb75847326581d19197f42036c1a2a2517998281e";
    const receipt1 = await provider.getTransactionReceipt(txHash1);
    const receipt2 = await provider.getTransactionReceipt(txHash2);
    console.log("My TX 1 Status:", receipt1.status);
    console.log("My TX 2 Status:", receipt2.status);
}
main().catch(console.error);
