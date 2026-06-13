const { JsonRpcProvider, Contract } = require("ethers");

async function main() {
  const provider = new JsonRpcProvider("https://rpc.hoodi.ethpandaops.io");
  const USDT_ADDRESS = "0xde026A36E80868bfA4Cbf7db0D69992Bc93a963C";
  const owner = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";
  const spender = "0x6532C7aA0EB8c784Da82EB2fd54dC52B2c1ad6Da";

  const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function decimals() view returns (uint8)",
    "function allowance(address owner, address spender) view returns (uint256)"
  ];

  const contract = new Contract(USDT_ADDRESS, abi, provider);

  try {
    const name = await contract.name();
    console.log("Name:", name);
  } catch (e) {
    console.log("Failed calling name():", e.message);
  }

  try {
    const symbol = await contract.symbol();
    console.log("Symbol:", symbol);
  } catch (e) {
    console.log("Failed calling symbol():", e.message);
  }

  try {
    const decimals = await contract.decimals();
    console.log("Decimals:", decimals);
  } catch (e) {
    console.log("Failed calling decimals():", e.message);
  }

  try {
    const allowance = await contract.allowance(owner, spender);
    console.log("Allowance:", allowance.toString());
  } catch (e) {
    console.log("Failed calling allowance():", e.message);
  }
}

main().catch(console.error);
