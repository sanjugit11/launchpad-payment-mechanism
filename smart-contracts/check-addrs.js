const { JsonRpcProvider, Contract } = require('ethers');
const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

const SXBUY_ABI = [
  "function sxcpTreasury() view returns (address)",
  "function ptfReceiver() view returns (address)",
  "function sxse() view returns (address)",
  "function sxua() view returns (address)"
];

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const buyStables = new Contract(buyStablesAddr, SXBUY_ABI, provider);

    console.log("sxcpTreasury:", await buyStables.sxcpTreasury());
    console.log("ptfReceiver:", await buyStables.ptfReceiver());
    console.log("sxse:", await buyStables.sxse());
    console.log("sxua:", await buyStables.sxua());
}

main().catch(console.error);
