const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const txHash = "0x2c328523ccec942dd120264266299bd49e575ebc7dceaa0d60358a61d70b7cee";
    const tx = await provider.getTransaction(txHash);
    console.log("TX:", tx);
    const receipt = await provider.getTransactionReceipt(txHash);
    console.log("RECEIPT:", receipt);
    if (receipt) {
        try {
            const callResult = await provider.call({
                to: tx.to,
                from: tx.from,
                data: tx.data,
                value: tx.value,
                gasPrice: tx.gasPrice,
                gasLimit: tx.gasLimit,
                blockTag: receipt.blockNumber - 1
            });
            console.log("Call result:", callResult);
        } catch (e) {
            console.log("Revert reason:", e.reason || e.message || e);
        }
    }
}
main().catch(console.error);
