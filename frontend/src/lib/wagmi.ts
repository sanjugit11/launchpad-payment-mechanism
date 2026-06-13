import { createConfig, http } from 'wagmi'
import { hoodi, baseSepolia } from './chains'
import { injected, walletConnect } from 'wagmi/connectors'

export const config = createConfig({
  chains: [hoodi, baseSepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: 'demo' }),
  ],
  transports: {
    [hoodi.id]: http(hoodi.rpcUrls.default.http[0]),
    [baseSepolia.id]: http(baseSepolia.rpcUrls.default.http[0]),
  },
})
