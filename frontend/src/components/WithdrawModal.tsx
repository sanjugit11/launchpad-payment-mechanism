import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { formatUnits } from 'viem'
import { ERC20_ABI, SXUA_ABI } from '@/lib/abi'

import { useTargetChainId, useContractAddresses } from '@/lib/chains'

const HOODI_GAS_LIMIT = 15_000_000n
const DEFAULT_TOKEN_DECIMALS = 6

function formatAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

export default function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<'USDC' | 'USDT' | 'DAI'>('USDT')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { address, isConnected, chainId } = useAccount()
  const targetChainId = useTargetChainId()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, isPending } = useWriteContract()

  const addresses = useContractAddresses()
  const tokenAddress = addresses[token]
  const availableTokens = useMemo(
    () => ['USDC', 'USDT', 'DAI'].filter((symbol) => !!addresses[symbol as 'USDC' | 'USDT' | 'DAI']) as Array<'USDC' | 'USDT' | 'DAI'>,
    [addresses],
  )

  useEffect(() => {
    if (!tokenAddress && availableTokens.length > 0) {
      setToken(availableTokens[0])
    }
  }, [tokenAddress, availableTokens])

  const tokenDecimalsQuery = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress },
  })

  const tokenSymbolQuery = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  })

  const sxuaAddress = addresses.SXUA

  const committedBalanceQuery = useReadContract({
    address: sxuaAddress,
    abi: SXUA_ABI,
    functionName: 'committedBalances',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: { enabled: !!address && !!sxuaAddress && !!tokenAddress },
  })

  const uncommittedBalanceQuery = useReadContract({
    address: sxuaAddress,
    abi: SXUA_ABI,
    functionName: 'uncommittedBalances',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: { enabled: !!address && !!sxuaAddress && !!tokenAddress },
  })

  const committedBalance = committedBalanceQuery.data ?? 0n
  const uncommittedBalance = uncommittedBalanceQuery.data ?? 0n
  const totalBalance = committedBalance + uncommittedBalance

  const tokenDecimals = tokenDecimalsQuery.data ?? DEFAULT_TOKEN_DECIMALS
  const tokenSymbol = tokenSymbolQuery.data || token
  const committedDisplay = formatAmount(committedBalance, tokenDecimals)
  const uncommittedDisplay = formatAmount(uncommittedBalance, tokenDecimals)
  const totalDisplay = formatAmount(totalBalance, tokenDecimals)

  const isLoading = isPending || isSubmitting

  const sendContractCall = async (label: string, config: Parameters<typeof writeContractAsync>[0]) => {
    setStatus(`${label}...`)
    const hash = await writeContractAsync({
      ...config,
      gas: config.gas ?? HOODI_GAS_LIMIT,
    })
    setStatus(`${label} submitted. Waiting for confirmation...`)
    setTxHash(hash)
    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain.')
      }
    }
  }

  const fetchUpdatedUncommitted = async () => {
    if (!publicClient || !sxuaAddress || !address || !tokenAddress) return 0n
    const value = await publicClient.readContract({
      address: sxuaAddress,
      abi: SXUA_ABI,
      functionName: 'uncommittedBalances',
      args: [address, tokenAddress],
    })

    return value as bigint
  }

  const handleWithdrawAll = async () => {
    if (!isConnected) {
      setError('Connect MetaMask first.')
      return
    }

    if (!sxuaAddress) {
      setError('SXUA address is not configured. Please set VITE_SXUA_ADDRESS in .env.')
      return
    }

    if (!tokenAddress) {
      setError(`${token} address is not configured.`)
      return
    }

    if (totalBalance === 0n) {
      setError(`No ${tokenSymbol} balance available to withdraw.`)
      return
    }

    if (!publicClient) {
      setError('Wallet client is not ready.')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setStatus('')
      setTxHash(null)

      if (chainId !== targetChainId) {
        setStatus('Switching MetaMask to Target Network...')
        await switchChainAsync({ chainId: targetChainId })
      }

      let withdrawAmount = uncommittedBalance

      if (committedBalance > 0n) {
        await sendContractCall('Uncommitting committed balance', {
          address: sxuaAddress,
          abi: SXUA_ABI,
          functionName: 'uncommit',
          args: [tokenAddress, committedBalance],
        })

        withdrawAmount = await fetchUpdatedUncommitted()
      }

      if (withdrawAmount === 0n) {
        setError('No withdrawable uncommitted balance available after uncommit.')
        return
      }

      await sendContractCall('Withdrawing stablecoins', {
        address: sxuaAddress,
        abi: SXUA_ABI,
        functionName: 'withdraw',
        args: [tokenAddress, withdrawAmount],
      })

      setStatus('Withdrawal submitted. Check MetaMask for confirmation.')
    } catch (err: any) {
      console.error('Withdraw error:', err)
      setError(err.shortMessage || (err instanceof Error ? err.message : 'Withdrawal failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonDisabledReason = !isConnected
    ? 'Connect wallet'
    : chainId !== targetChainId
      ? 'Switch network in wallet'
      : !sxuaAddress
        ? 'SXUA not configured'
        : !tokenAddress
          ? `${token} not configured`
          : totalBalance === 0n
            ? 'No balance to withdraw'
            : ''

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Withdraw from SXUA</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value as 'USDC' | 'USDT' | 'DAI')}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            >
              {availableTokens.map((symbol) => (
                <option value={symbol} key={symbol}>{symbol}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-neutral-400">Committed Balance</p>
              <p className="font-semibold mt-2">{committedDisplay} {tokenSymbol}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-neutral-400">Uncommitted Balance</p>
              <p className="font-semibold mt-2">{uncommittedDisplay} {tokenSymbol}</p>
            </div>
          </div>

          <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
            <p className="text-neutral-400">Total Withdrawable</p>
            <p className="text-lg font-semibold mt-2">{totalDisplay} {tokenSymbol}</p>
            <p className="text-xs text-neutral-500 mt-1">Committed funds will be uncommitted first, then withdrawn as uncommitted balance.</p>
          </div>


          <button
            type="button"
            onClick={handleWithdrawAll}
            disabled={!!buttonDisabledReason || isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition"
          >
            {isLoading ? 'Processing...' : buttonDisabledReason || 'Withdraw All'}
          </button>

          {status && <p className="text-xs text-emerald-400 mt-2">{status}</p>}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          {txHash && <p className="text-xs text-neutral-500 mt-2">Tx: {txHash}</p>}
        </div>
      </div>
    </div>
  )
}
