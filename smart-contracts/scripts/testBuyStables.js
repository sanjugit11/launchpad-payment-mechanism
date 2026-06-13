const hre = require("hardhat");

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

    const [signer] = await hre.ethers.getSigners();
    console.log("Signer address:", signer.address);

    const ABI = ["function buyStables(address stablecoin) external payable"];
    const contract = new hre.ethers.Contract(buyStablesAddr, ABI, signer);

    try {
        console.log("Calling buyStables...");
        const tx = await contract.buyStables(usdcAddr, { 
            value: hre.ethers.parseEther("0.01"),
            gasLimit: 15000000 
        });
        console.log("Tx hash:", tx.hash);
        await tx.wait();
        console.log("Success!");
    } catch (e) {
        console.log("Transaction failed!");
        if (e.reason) {
            console.log("Reason:", e.reason);
        } else if (e.message) {
            console.log("Message:", e.message);
        }
        if (e.data) {
            console.log("Data:", e.data);
        }
    }
}

main().catch(console.error);
