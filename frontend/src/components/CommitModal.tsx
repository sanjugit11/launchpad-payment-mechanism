import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useAccount, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { formatUnits, parseUnits } from 'viem'
import { ERC20_ABI, SXUA_ABI } from '@/lib/abi'
import { useTargetChainId, useContractAddresses } from '@/lib/chains'

const HOODI_GAS_LIMIT = 15_000_000n
const DEFAULT_TOKEN_DECIMALS = 6

function formatAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

export default function CommitModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState<'USDC' | 'USDT' | 'DAI'>('USDC')
  const [amount, setAmount] = useState('')
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
  const SXUA_ADDRESS = addresses.SXUA

  const availableTokens = useMemo(
    () => ['USDC', 'USDT', 'DAI'].filter((symbol) => !!addresses[symbol as 'USDC' | 'USDT' | 'DAI']) as Array<'USDC' | 'USDT' | 'DAI'>,
    [addresses]
  )

  useEffect(() => {
    if (!tokenAddress && availableTokens.length > 0) {
      setToken(availableTokens[0])
    }
  }, [availableTokens, tokenAddress])

  const decimalsQuery = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!tokenAddress },
  })

  const symbolQuery = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  })

  const uncommittedBalanceQuery = useReadContract({
    address: SXUA_ADDRESS,
    abi: SXUA_ABI,
    functionName: 'uncommittedBalances',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: { enabled: !!address && !!SXUA_ADDRESS && !!tokenAddress },
  })

  const committedBalanceQuery = useReadContract({
    address: SXUA_ADDRESS,
    abi: SXUA_ABI,
    functionName: 'committedBalances',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: { enabled: !!address && !!SXUA_ADDRESS && !!tokenAddress },
  })

  const decimals = decimalsQuery.data ?? DEFAULT_TOKEN_DECIMALS
  const symbol = symbolQuery.data || token
  const uncommittedBalance = uncommittedBalanceQuery.data ?? 0n
  const committedBalance = committedBalanceQuery.data ?? 0n
  const amountNumber = amount ? Number(amount) : 0
  const isValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const amountBase = isValidAmount ? parseUnits(amount, decimals) : 0n
  const hasEnoughBalance = uncommittedBalance >= amountBase
  const wrongChain = !!chainId && chainId !== targetChainId
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

  const handleCommit = async () => {
    if (!isConnected) {
      setError('Connect MetaMask first.')
      return
    }

    if (!tokenAddress) {
      setError(`${token} address is not configured.`)
      return
    }

    if (!SXUA_ADDRESS || SXUA_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('SXUA address is not configured. Please set VITE_SXUA_ADDRESS in .env.')
      return
    }

    if (!isValidAmount) {
      setError('Enter a valid amount to commit.')
      return
    }

    if (!publicClient) {
      setError('Wallet client is not ready.')
      return
    }

    if (!hasEnoughBalance) {
      setError(`Insufficient uncommitted balance. Available: ${formatAmount(uncommittedBalance, decimals)} ${symbol}.`)
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

      await sendContractCall('Committing funds', {
        address: SXUA_ADDRESS,
        abi: SXUA_ABI,
        functionName: 'commit',
        args: [tokenAddress, amountBase],
      })

      setStatus('Commit transaction submitted. Waiting for confirmation...')
      setAmount('')
    } catch (err: any) {
      console.error('Commit error:', err)
      setError(err.shortMessage || (err instanceof Error ? err.message : 'Commit failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonDisabledReason = !isConnected
    ? 'Connect wallet'
    : wrongChain
      ? 'Switch wallet to Hoodi'
      : !tokenAddress
        ? `${token} not configured`
        : !isValidAmount
          ? 'Enter amount'
          : !hasEnoughBalance
            ? `Need ${formatAmount(amountBase - uncommittedBalance, decimals)} ${symbol}`
            : ''

  const uncommittedDisplay = formatAmount(uncommittedBalance, decimals)
  const committedDisplay = formatAmount(committedBalance, decimals)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Commit to Earn APY</h3>
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
              {availableTokens.map((symbolOption) => (
                <option key={symbolOption} value={symbolOption}>{symbolOption}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-neutral-500 mt-1">Available uncommitted: {uncommittedDisplay} {symbol}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-neutral-400">Uncommitted</p>
              <p className="font-semibold mt-2">{uncommittedDisplay} {symbol}</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-neutral-400">Committed</p>
              <p className="font-semibold mt-2">{committedDisplay} {symbol}</p>
            </div>
          </div>

          {isValidAmount && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Commit amount</span>
                <span className="font-semibold">{formatAmount(amountBase, decimals)} {symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Potential SXP</span>
                <span className="font-semibold text-emerald-400">{amountNumber.toFixed(0)} $SXP</span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleCommit}
            disabled={!!buttonDisabledReason || isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition"
          >
            {isLoading ? 'Processing...' : buttonDisabledReason || 'Commit'}
          </button>

          {status && <p className="text-xs text-emerald-400 mt-2">{status}</p>}
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          {txHash && <p className="text-xs text-neutral-500 mt-2">Tx: {txHash}</p>}
        </div>
      </div>
    </div>
  )
}
