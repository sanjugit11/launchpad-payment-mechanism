require("@nomicfoundation/hardhat-ethers");
require("@nomicfoundation/hardhat-chai-matchers");
require("solidity-coverage");
require("dotenv").config({ path: require('path').resolve(__dirname, '../.env') });

try {
  require("@nomicfoundation/hardhat-verify");
} catch (error) {
  if (process.env.REQUIRE_HARDHAT_VERIFY === "true") {
    throw error;
  }
}

const PRIVATE_KEY = process.env.PRIVATE_KEY || "";
const HOODI_RPC_URL = process.env.HOODI_RPC_URL;
const BASE_SEPOLIA_RPC_URL = process.env.BASE_SEPOLIA_RPC_URL;
function accounts() {
  if (!PRIVATE_KEY) return [];
  return [PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`];
}

module.exports = {
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hoodi: {
      url: HOODI_RPC_URL || "http://127.0.0.1:8545",
      chainId: 560048,
      accounts: accounts()
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC_URL || "http://127.0.0.1:8545",
      chainId: 84532,
      accounts: accounts()
    }
  },
etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY,
  customChains: [
    {
      network: "hoodi",
      chainId: 560048,
      urls: {
        apiURL: "https://explorer.hoodi.ethpandaops.io/api",
        browserURL: "https://explorer.hoodi.ethpandaops.io"
      }
    },
    {
      network: "baseSepolia",
      chainId: 84532,
      urls: {
        apiURL: "https://sepolia.base.org",
        browserURL: "https://sepolia.basescan.org"
      }
    }
  ]
}
};