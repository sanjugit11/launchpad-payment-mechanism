import { useAccount } from 'wagmi'
import { type Address } from 'viem'

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

export const hoodiAddresses = {
  SXUA: '0xe24275b09B7eABf3491B6705D00D108421626429' as Address,
  SXLAUNCHPAD: '0xD82AeeA3e5528E11967BBFff54751Acf8129DcF1' as Address,
  SXP: '0xCdFA51E2858b476aB754F9A6430972e64a69d6a7' as Address,
  SXCP: '0x7Fe17FBbD291AF0Dc5d632f3FdF611500b3f429D' as Address,
  SXEP: '0x6532C7aA0EB8c784Da82EB2fd54dC52B2c1ad6Da' as Address,
  USDC: '0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3' as Address,
  USDT: '0xde026A36E80868bfA4Cbf7db0D69992Bc93a963C' as Address,
  DAI: '0xD362A6cfdC525cD279Da2c85c2Cd546EAd31abd9' as Address,
  SX_BUY_STABLES: '0x1FF4fb43a413B0cCc866675A177FD84c53a3055F' as Address,
  SXGOVERNANCE: '0x0b09b2995541AeeB3028086650659980E15C880d' as Address,
} as const

export const baseSepoliaAddresses = {
  SXUA: '0x0CD4b3894ab7d059ba281BFD85b68CB80779C915' as Address,
  SXLAUNCHPAD: '0x8cD0d90AA508d90bE1Bbb05CC5d72853b898721D' as Address,
  SXP: '0xa70853ED62135638DDAc01faC15Cde738B61536b' as Address,
  SXCP: '0x832a5de9436e451cA4f0c85d54dE6a157906CACA' as Address,
  SXEP: '0x73B004fDA8F7054D15B002BD9191fE8eddC85EbF' as Address,
  USDC: '0xC8AEe7ef9DA31709BAcd1f16E1dce894FbA12b7b' as Address,
  USDT: '0x49C8835F9c1623Ff92cC18362d5cC0563Db26cED' as Address,
  DAI: '0xDd5a1A84588EE7Ebb8752D54F9a299F26A3430f8' as Address,
  SX_BUY_STABLES: '0x092096Fd1a02EE7DcCbB915d9E4110Db30602603' as Address,
  SXGOVERNANCE: '0x0000000000000000000000000000000000000000' as Address,
} as const

export const SUPPORTED_CHAIN_IDS = [baseSepolia.id, hoodi.id] as const
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number]
export const DEFAULT_CHAIN_ID = hoodi.id

export function getChainExplorerUrl(chainId: number | undefined) {
  if (chainId === hoodi.id) return 'https://explorer.hoodi.ethpandaops.io'
  if (chainId === baseSepolia.id) return 'https://sepolia.basescan.org'
  return 'https://explorer.hoodi.ethpandaops.io'
}

export function isSupportedChain(chainId: number | undefined): chainId is SupportedChainId {
  return chainId === baseSepolia.id || chainId === hoodi.id
}

export function getContractAddresses(chainId: number | undefined) {
  if (chainId === baseSepolia.id) {
    return baseSepoliaAddresses
  }
  if (chainId === hoodi.id) {
    return hoodiAddresses
  }

  return {
    SXUA: (import.meta.env.VITE_SXUA_ADDRESS || hoodiAddresses.SXUA) as Address,
    SXLAUNCHPAD: (import.meta.env.VITE_SXLAUNCHPAD_ADDRESS || hoodiAddresses.SXLAUNCHPAD) as Address,
    SXP: (import.meta.env.VITE_SXP_ADDRESS || hoodiAddresses.SXP) as Address,
    SXCP: (import.meta.env.VITE_SXCP_ADDRESS || hoodiAddresses.SXCP) as Address,
    SXEP: (import.meta.env.VITE_SXEP_ADDRESS || hoodiAddresses.SXEP) as Address,
    USDC: (import.meta.env.VITE_USDC_ADDRESS || hoodiAddresses.USDC) as Address,
    USDT: (import.meta.env.VITE_USDT_ADDRESS || hoodiAddresses.USDT) as Address,
    DAI: (import.meta.env.VITE_DAI_ADDRESS || hoodiAddresses.DAI) as Address,
    SX_BUY_STABLES: (import.meta.env.VITE_SX_BUY_STABLES_ADDRESS || hoodiAddresses.SX_BUY_STABLES) as Address,
    SXGOVERNANCE: (import.meta.env.VITE_SXGOVERNANCE_ADDRESS || hoodiAddresses.SXGOVERNANCE) as Address,
  }
}

export function useContractAddresses() {
  const { chainId } = useAccount()
  return getContractAddresses(chainId)
}

export function useTargetChainId() {
  const { chainId } = useAccount()
  return isSupportedChain(chainId) ? chainId : DEFAULT_CHAIN_ID
}
