const { expect } = require("chai");
const { ethers, network } = require("hardhat");

describe("Debug buyStables", function () {
  it("Should show where it reverts", async function () {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";
    const userAddr = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";

    // Impersonate the user
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [userAddr],
    });
    const userSigner = await ethers.getSigner(userAddr);

    const ABI = ["function buyStables(address stablecoin) external payable"];
    const contract = new ethers.Contract(buyStablesAddr, ABI, userSigner);

    console.log("Calling buyStables...");
    await contract.buyStables(usdcAddr, { value: ethers.parseEther("0.01") });
    console.log("Success!");
  });
});
