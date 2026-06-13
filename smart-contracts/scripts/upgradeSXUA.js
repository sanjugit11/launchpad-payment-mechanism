const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Upgrading with account:", deployer.address);

    const sxuaProxyAddress = "0xe24275b09B7eABf3491B6705D00D108421626429";

    // 1. Deploy the NEW Implementation of SXUA
    console.log("Deploying new SXUA implementation...");
    const SXUA = await ethers.getContractFactory("SXUA");
    const newSxuaImpl = await SXUA.deploy();
    await newSxuaImpl.waitForDeployment();
    console.log("New SXUA implementation deployed at:", newSxuaImpl.target);

    // 2. Upgrade the Proxy
    console.log("Upgrading proxy to new implementation...");
    const proxyContract = await ethers.getContractAt("SXUA", sxuaProxyAddress, deployer);
    const tx = await proxyContract.upgradeToAndCall(newSxuaImpl.target, "0x", { gasLimit: 5000000 });
    console.log("Upgrade Tx Hash:", tx.hash);
    await tx.wait();
    console.log("Proxy successfully upgraded!");
}

main().catch(console.error);
