const { JsonRpcProvider, Contract } = require("ethers");

async function main() {
  const provider = new JsonRpcProvider("https://rpc.hoodi.ethpandaops.io");
  const user = "0x1034aad10eF61534EA4Df59cd040b3e4418C5E78";

  const tokens = {
    USDC: "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3",
    USDT: "0xde026A36E80868bfA4Cbf7db0D69992Bc93a963C",
    DAI: "0xD362A6cfdC525cD279Da2c85c2Cd546EAd31abd9"
  };

  const abi = [
    "function balanceOf(address account) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)"
  ];

  for (const [name, addr] of Object.entries(tokens)) {
    const contract = new Contract(addr, abi, provider);
    try {
      const balance = await contract.balanceOf(user);
      const decimals = await contract.decimals();
      const symbol = await contract.symbol();
      const formatted = (Number(balance) / 10 ** Number(decimals)).toFixed(4);
      console.log(`${name} balance for ${user}: ${formatted} ${symbol} (raw: ${balance})`);
    } catch (e) {
      console.log(`Failed for ${name}:`, e.message);
    }
  }
}

main().catch(console.error);
