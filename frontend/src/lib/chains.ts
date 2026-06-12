export const hoodi = {
  id: 560048,
  name: 'Hoodi',
  network: 'hoodi',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_HOODI_RPC || 'https://rpc.hoodi.ethpandaops.io'] },
    public: { http: [import.meta.env.VITE_HOODI_RPC || 'https://rpc.hoodi.ethpandaops.io'] },
  },
  blockExplorers: {
    default: {
      name: 'Hoodi Explorer',
      url: 'https://explorer.hoodi.ethpandaops.io',
    },
  },
  testnet: true,
} as const

export const baseSepolia = {
  id: 84532,
  name: 'Base Sepolia',
  network: 'baseSepolia',
  nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [import.meta.env.VITE_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'] },
    public: { http: [import.meta.env.VITE_BASE_SEPOLIA_RPC || 'https://sepolia.base.org'] },
  },
  blockExplorers: {
    default: {
      name: 'BaseScan',
      url: 'https://sepolia.basescan.org',
    },
  },
  testnet: true,
} as const

export const chains = [hoodi, baseSepolia] as const

export const contractAddresses = {
  SXUA: import.meta.env.VITE_SXUA_ADDRESS || '0x',
  SXLAUNCHPAD: import.meta.env.VITE_SXLAUNCHPAD_ADDRESS || '0x',
  SXP: import.meta.env.VITE_SXP_ADDRESS || '0x',
  SXEP: import.meta.env.VITE_SXEP_ADDRESS || '0x',
  USDC: import.meta.env.VITE_USDC_ADDRESS || '0x',
  USDT: import.meta.env.VITE_USDT_ADDRESS || '0x',
  DAI: import.meta.env.VITE_DAI_ADDRESS || '0x',
} as const
