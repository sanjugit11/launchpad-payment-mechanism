const { JsonRpcProvider } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const tx = await provider.getTransaction("0xe46b0cf2f5e9ade44cc463f4504f34eb76c7fa76aaabaad8828fee8940f4d58d");
    console.log("addTokenSupport block:", tx.blockNumber);
    
    const usertx = await provider.getTransaction("0x2c328523ccec942dd120264266299bd49e575ebc7dceaa0d60358a61d70b7cee");
    console.log("user failed tx block:", usertx.blockNumber);
}
main().catch(console.error);
