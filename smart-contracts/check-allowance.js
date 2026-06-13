const { createPublicClient, http, getContract, formatUnits } = require('viem');
const { hardhat } = require('viem/chains');

// define hoodi network
const hoodi = {
  id: 560048,
  name: 'Hoodi',
  network: 'hoodi',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.hoodi.ethpandaops.io'] },
    public: { http: ['https://rpc.hoodi.ethpandaops.io'] },
  },
};

const client = createPublicClient({
  chain: hoodi,
  transport: http()
});

const ERC20_ABI = [
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      },
      {
        "name": "_spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "name": "",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [
      {
        "name": "_owner",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "name": "balance",
        "type": "uint256"
      }
    ],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
];

const SXBUY_ABI = [
  {"inputs":[],"name":"sxmm","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"}
];

async function main() {
    const buyStablesAddr = "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
    const usdcAddr = "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

    const sxmmAddr = await client.readContract({
        address: buyStablesAddr,
        abi: SXBUY_ABI,
        functionName: 'sxmm'
    });
    console.log("SXMM Address:", sxmmAddr);

    const balance = await client.readContract({
        address: usdcAddr,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [sxmmAddr]
    });
    console.log("SXMM USDC Balance:", formatUnits(balance, 6));

    const allowance = await client.readContract({
        address: usdcAddr,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [sxmmAddr, buyStablesAddr]
    });
    console.log("SXMM Allowance to SXBuyStables:", formatUnits(allowance, 6));
}

main().catch(console.error);
