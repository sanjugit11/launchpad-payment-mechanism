const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const fromAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const nonce = await provider.getTransactionCount(fromAddr);
    console.log("Nonce of fromAddr:", nonce);

    try {
        const callResult = await provider.call({
            to: "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3", // USDC
            from: fromAddr,
            data: "0x095ea7b3000000000000000000000000e24275b09b7eabf3491b6705d00d1084216264290000000000000000000000000000000000000000000000000000000000000000", // approve(sxua, 0)
            nonce: nonce
        });
        console.log("Approve result:", callResult);
    } catch (e) {
        console.log("Approve reverted:", e);
    }
}
main().catch(console.error);
