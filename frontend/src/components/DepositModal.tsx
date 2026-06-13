import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useAccount, useBalance, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { formatUnits, parseUnits, type Address } from 'viem'
import { ERC20_ABI, SXUA_ABI } from '@/lib/abi'
import { TARGET_CHAIN_ID, useContractAddresses } from '@/lib/chains'

const HOODI_GAS_LIMIT = 15_000_000n

function formatAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

export default function DepositModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState('USDC')
  const [amount, setAmount] = useState('')
  const [split, setSplit] = useState({ committed: 70, uncommitted: 30 })
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<Address | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, isPending } = useWriteContract()

  const addresses = useContractAddresses()
  const stablecoinAddress = addresses[token as 'USDC' | 'USDT' | 'DAI']
  const sxuaAddress = addresses.SXUA

  const decimalsQuery = useReadContract({
    address: stablecoinAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!stablecoinAddress },
  })

  const symbolQuery = useReadContract({
    address: stablecoinAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
    query: { enabled: !!stablecoinAddress },
  })

  const balanceQuery = useBalance({
    address,
    token: stablecoinAddress,
    query: { enabled: !!address && !!stablecoinAddress },
  })

  const decimals = decimalsQuery.data ?? 18
  const symbol = symbolQuery.data || token
  const amountNumber = amount ? Number(amount) : 0
  const isValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const amountBase = isValidAmount ? parseUnits(amount, decimals) : 0n
  const walletBalance = balanceQuery.data?.value ?? 0n
  const hasEnoughBalance = walletBalance >= amountBase
  const hasSxuaAddress = !!sxuaAddress && sxuaAddress !== '0x0000000000000000000000000000000000000000'
  const canDeposit = isConnected && !!stablecoinAddress && hasSxuaAddress && isValidAmount && hasEnoughBalance
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
      await publicClient.waitForTransactionReceipt({ hash })
    }
  }

  const handleDeposit = async () => {
    if (!isConnected) {
      setError('Connect MetaMask first.')
      return
    }

    if (!stablecoinAddress) {
      setError(`${token} address is not configured.`)
      return
    }

    if (!isValidAmount) {
      setError('Enter a valid deposit amount.')
      return
    }

    if (!sxuaAddress || sxuaAddress === '0x0000000000000000000000000000000000000000') {
      setError('SXUA address is not configured. Please set VITE_SXUA_BASE_ADDRESS in .env.')
      return
    }

    if (!publicClient) {
      setError('Wallet client is not ready.')
      return
    }

    if (walletBalance < amountBase) {
      setError(`Insufficient ${symbol} balance. Required: ${formatAmount(amountBase, decimals)} ${symbol}.`)
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setStatus('')
      setTxHash(null)

      if (chainId !== TARGET_CHAIN_ID) {
        setStatus('Switching MetaMask to Target Network...')
        await switchChainAsync({ chainId: TARGET_CHAIN_ID })
      }

      await sendContractCall(`Approve ${symbol} for SXUA`, {
        address: stablecoinAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [sxuaAddress, amountBase],
        gas: HOODI_GAS_LIMIT,
      })

      await sendContractCall(`Deposit ${symbol} to SXUA`, {
        address: sxuaAddress,
        abi: SXUA_ABI,
        functionName: 'deposit',
        args: [stablecoinAddress, amountBase],
        gas: HOODI_GAS_LIMIT,
      })

      setStatus('Deposit successful.')
      setAmount('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Deposit failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const buttonDisabledReason = !isConnected
    ? 'Connect wallet'
    : !stablecoinAddress
      ? 'Token not configured'
      : !hasSxuaAddress
        ? 'SXUA not configured'
        : !isValidAmount
          ? 'Enter amount'
          : !hasEnoughBalance
            ? `Need ${formatAmount(amountBase - walletBalance, decimals)} ${symbol}`
            : ''

  const committedAmount = isValidAmount ? amountNumber * split.committed / 100 : 0
  const uncommittedAmount = isValidAmount ? amountNumber * split.uncommitted / 100 : 0
  const walletBalanceDisplay = useMemo(() => formatAmount(walletBalance, decimals), [walletBalance, decimals])

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Deposit Stablecoins</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Token</label>
            <select
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            >
              <option value="USDC">USDC</option>
              <option value="USDT">USDT</option>
              <option value="DAI">DAI</option>
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
            <p className="text-xs text-neutral-500 mt-1">Available: {walletBalanceDisplay} {symbol}</p>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Split Allocation</label>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-400 mb-1">Committed</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={split.committed}
                    onChange={(e) => setSplit({ committed: parseInt(e.target.value), uncommitted: 100 - parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-10 text-right">{split.committed}%</span>
                </div>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-xs text-neutral-400 mb-1">Uncommitted</p>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={split.uncommitted}
                    onChange={(e) => setSplit({ uncommitted: parseInt(e.target.value), committed: 100 - parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-sm font-semibold w-10 text-right">{split.uncommitted}%</span>
                </div>
              </div>
            </div>
          </div>

          {isValidAmount && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Deposit to SXUA</span>
                <span className="font-semibold">{formatAmount(amountBase, decimals)} {symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Committed Share</span>
                <span className="font-semibold">{committedAmount.toLocaleString()} {symbol}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Uncommitted Share</span>
                <span className="font-semibold">{uncommittedAmount.toLocaleString()} {symbol}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800">
                <span className="text-emerald-400">SXP Rewards</span>
                <span className="font-semibold text-emerald-400">{amountNumber.toFixed(0)} $SXP</span>
              </div>
            </div>
          )}

          <button
            onClick={handleDeposit}
            disabled={!canDeposit || isLoading}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition"
          >
            {isLoading ? 'Processing...' : buttonDisabledReason || 'Deposit'}
          </button>
          {status && <p className="text-xs text-emerald-400">{status}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {txHash && <p className="text-xs text-neutral-500 break-all">Tx: {txHash}</p>}
        </div>
      </div>
    </div>
  )
}
