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
    [hoodi.id]: http(),
    [baseSepolia.id]: http(),
  },
})
