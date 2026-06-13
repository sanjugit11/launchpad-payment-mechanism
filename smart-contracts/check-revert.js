const { JsonRpcProvider, Contract, parseEther } = require('ethers');

const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
    const userAddr = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";

    const ABI = ["function buyStables(address) payable"];
    const contract = new Contract(buyStablesAddr, ABI, provider);

    const nonce = await provider.getTransactionCount(userAddr);

    try {
        console.log("Simulating buyStables with nonce", nonce);
        await contract.buyStables.staticCall(usdcAddr, {
            from: userAddr,
            value: parseEther("0.01"),
            nonce: nonce
        });
        console.log("Simulation succeeded!");
    } catch (e) {
        if (e.reason) {
            console.log("Revert reason:", e.reason);
        } else if (e.info && e.info.error && e.info.error.message) {
             console.log("Error info:", e.info.error.message);
        } else {
             console.log("Unknown error:", e);
        }
    }
}

main().catch(console.error);
