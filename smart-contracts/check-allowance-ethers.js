const { JsonRpcProvider, Contract, formatUnits } = require('ethers');

const provider = new JsonRpcProvider('https://rpc.hoodi.ethpandaops.io');

const ERC20_ABI = [
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)"
];

const SXBUY_ABI = [
  "function sxmm() view returns (address)"
];

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

    const buyStables = new Contract(buyStablesAddr, SXBUY_ABI, provider);
    const usdc = new Contract(usdcAddr, ERC20_ABI, provider);

    const sxmmAddr = await buyStables.sxmm();
    console.log("SXMM Address:", sxmmAddr);

    const balance = await usdc.balanceOf(sxmmAddr);
    console.log("SXMM USDC Balance:", formatUnits(balance, 6));

    const allowance = await usdc.allowance(sxmmAddr, buyStablesAddr);
    console.log("SXMM Allowance to SXBuyStables:", formatUnits(allowance, 6));
}

main().catch(console.error);
