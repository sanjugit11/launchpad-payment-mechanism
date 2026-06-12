import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { SXUA_ABI, SXLAUNCHPAD_ABI, SXP_ABI, SXEP_ABI } from '@/lib/abi'

export function useCommittedBalance(tokenAddress?: `0x${string}`) {
  const { address } = useAccount()
  return useReadContract({
    address: tokenAddress ? (process.env.VITE_SXUA_ADDRESS as `0x${string}`) : undefined,
    abi: SXUA_ABI,
    functionName: 'getCommittedBalance',
    args: tokenAddress && address ? [address!, tokenAddress] : undefined,
    query: { enabled: !!address && !!tokenAddress && !!process.env.VITE_SXUA_ADDRESS },
  })
}

export function useSxpBalance() {
  const { address } = useAccount()
  return useBalance({
    address,
    token: process.env.VITE_SXP_ADDRESS ? (process.env.VITE_SXP_ADDRESS as `0x${string}`) : undefined,
    query: { enabled: !!address && !!process.env.VITE_SXP_ADDRESS },
  })
}

export function useBuyTokens(projectId: number, tokenAmount: bigint) {
  const write = useWriteContract()
  const hash = write.data
  const { isLoading } = useWaitForTransactionReceipt({ hash })

  const buyTokens = async (_stablecoinAddress: `0x${string}`) => {
    if (!process.env.VITE_SXLAUNCHPAD_ADDRESS) throw new Error('Launchpad not configured')
    return write.writeContract({
      address: process.env.VITE_SXLAUNCHPAD_ADDRESS as `0x${string}`,
      abi: SXLAUNCHPAD_ABI,
      functionName: 'buyTokens',
      args: [BigInt(projectId), tokenAmount],
    })
  }

  return { ...write, buyTokens, isLoading, hash }
}

export function useRequestRefund(projectId: number) {
  const write = useWriteContract()
  const hash = write.data
  const { isLoading } = useWaitForTransactionReceipt({ hash })

  const requestRefund = async () => {
    if (!process.env.VITE_SXLAUNCHPAD_ADDRESS) throw new Error('Launchpad not configured')
    return write.writeContract({
      address: process.env.VITE_SXLAUNCHPAD_ADDRESS as `0x${string}`,
      abi: SXLAUNCHPAD_ABI,
      functionName: 'requestRefund',
      args: [BigInt(projectId)],
    })
  }

  return { ...write, requestRefund, isLoading, hash }
}

export function useRequestBuyback(projectId: number, tokenAmount: bigint) {
  const write = useWriteContract()
  const hash = write.data
  const { isLoading } = useWaitForTransactionReceipt({ hash })

  const requestBuyback = async () => {
    if (!process.env.VITE_SXLAUNCHPAD_ADDRESS) throw new Error('Launchpad not configured')
    return write.writeContract({
      address: process.env.VITE_SXLAUNCHPAD_ADDRESS as `0x${string}`,
      abi: SXLAUNCHPAD_ABI,
      functionName: 'requestBuyback',
      args: [BigInt(projectId), tokenAmount],
    })
  }

  return { ...write, requestBuyback, isLoading, hash }
}

export function useConvertToSXCP(amount: string) {
  const write = useWriteContract()

  const convert = async () => {
    if (!process.env.VITE_SXP_ADDRESS) throw new Error('SXP not configured')
    return write.writeContract({
      address: process.env.VITE_SXP_ADDRESS as `0x${string}`,
      abi: SXP_ABI,
      functionName: 'convertToSXCP',
      args: [BigInt(amount)],
    })
  }

  return { ...write, convert }
}

export function useExecuteTrade(tokenIn: `0x${string}`, tokenOut: `0x${string}`, amountIn: string, minAmountOut: string) {
  const write = useWriteContract()

  const execute = async () => {
    if (!process.env.VITE_SXEP_ADDRESS) throw new Error('SXEP not configured')
    return write.writeContract({
      address: process.env.VITE_SXEP_ADDRESS as `0x${string}`,
      abi: SXEP_ABI,
      functionName: 'executeTrade',
      args: [tokenIn, tokenOut, BigInt(amountIn), BigInt(minAmountOut)],
    })
  }

  return { ...write, execute }
}
