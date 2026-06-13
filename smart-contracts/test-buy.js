const { ethers } = require("hardhat");

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
    
    const [signer] = await ethers.getSigners();
    const ABI = ["function buyStables(address stablecoin) external payable"];
    const contract = new ethers.Contract(buyStablesAddr, ABI, signer);

    console.log("Calling buyStables with 0.01 ETH...");
    const tx = await contract.buyStables(usdcAddr, { 
        value: ethers.parseEther("0.01"),
        gasLimit: 15000000 
    });
    console.log("Tx hash:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction Mined! Status:", receipt.status);
}
main().catch(console.error);
