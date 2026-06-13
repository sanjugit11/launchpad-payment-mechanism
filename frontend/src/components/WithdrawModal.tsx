import { useState } from 'react'
import { X } from 'lucide-react'
import { calculatePenalty } from '@/lib/utils'
import { useAccount, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { BaseError, ContractFunctionRevertedError, formatUnits, parseUnits, parseAbi, type Address } from 'viem'
import { ERC20_ABI } from '@/lib/abi'

const HOODI_CHAIN_ID = 560048
const SXUA_ADDRESS = (import.meta.env.VITE_SXUA_ADDRESS || '0xe24275b09B7eABf3491B6705D00D108421626429') as Address
const STABLECOIN_ADDRESSES: Record<string, Address | undefined> = {
  USDC: (import.meta.env.VITE_USDC_ADDRESS || '0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3') as Address,
  USDT: import.meta.env.VITE_USDT_ADDRESS as Address | undefined,
  DAI: import.meta.env.VITE_DAI_ADDRESS as Address | undefined,
}

const LOCAL_SXUA_ABI = parseAbi([
  "function withdraw(address token, uint256 amount) external",
  "function uncommit(address token, uint256 amount) external",
  "function uncommittedBalances(address user, address token) view returns (uint256)",
  "function committedBalances(address user, address token) view returns (uint256)",
  "error ERC20InsufficientBalance(address sender, uint256 balance, uint256 needed)",
  "error ERC20InvalidReceiver(address receiver)",
  "error EnforcedPause()"
])

function formatAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

function getWithdrawErrorMessage(err: unknown, symbol: string, decimals: number) {
  if (err instanceof BaseError) {
    const revertError = err.walk((error) => error instanceof ContractFunctionRevertedError)

    if (revertError instanceof ContractFunctionRevertedError) {
      const errorName = revertError.data?.errorName
      const args = revertError.data?.args ?? []

      if (errorName === 'ERC20InsufficientBalance') {
        const balance = typeof args[1] === 'bigint' ? args[1] : 0n
        const needed = typeof args[2] === 'bigint' ? args[2] : 0n
        return `SXUA vault has only ${formatAmount(balance, decimals)} ${symbol}, but this withdrawal needs ${formatAmount(needed, decimals)} ${symbol}.`
      }

      if (errorName === 'ERC20InvalidReceiver') {
        return 'Withdrawal receiver is invalid. Check treasury/PTF receiver addresses on the SXUA contract.'
      }

      if (errorName === 'EnforcedPause') {
        return 'SXUA is paused, so withdrawals are currently disabled.'
      }

      if (revertError.reason) {
        return revertError.reason
      }
    }

    return err.shortMessage || err.message
  }

  return err instanceof Error ? err.message : 'Transaction failed.'
}

export default function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState('USDC')
  const [source, setSource] = useState<'uncommitted' | 'committed'>('uncommitted')
  const [subAccount, setSubAccount] = useState('001')
  const [amount, setAmount] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<Address | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { address, isConnected, chainId } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, isPending } = useWriteContract()

  const stablecoinAddress = STABLECOIN_ADDRESSES[token]
  const sxuaAddress = SXUA_ADDRESS

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

  const uncommittedBalanceQuery = useReadContract({
    address: sxuaAddress,
    abi: LOCAL_SXUA_ABI,
    functionName: 'uncommittedBalances',
    args: address && stablecoinAddress ? [address, stablecoinAddress] : undefined,
    query: { enabled: !!address && !!stablecoinAddress && !!sxuaAddress },
  })

  const committedBalanceQuery = useReadContract({
    address: sxuaAddress,
    abi: LOCAL_SXUA_ABI,
    functionName: 'committedBalances',
    args: address && stablecoinAddress ? [address, stablecoinAddress] : undefined,
    query: { enabled: !!address && !!stablecoinAddress && !!sxuaAddress },
  })

  const decimals = decimalsQuery.data ?? 18
  const symbol = symbolQuery.data || token
  const amountNumber = amount ? Number(amount) : 0
  const isValidAmount = Number.isFinite(amountNumber) && amountNumber > 0
  const amountBase = isValidAmount ? parseUnits(amount, decimals) : 0n

  const uncommittedBalance = uncommittedBalanceQuery.data ?? 0n
  const committedBalance = committedBalanceQuery.data ?? 0n
  const availableBalance = source === 'uncommitted' ? uncommittedBalance : committedBalance
  const hasEnoughBalance = availableBalance >= amountBase

  const isLoading = isPending || isSubmitting

  const handleWithdraw = async () => {
    if (!isConnected) {
      setError('Connect MetaMask first.')
      return
    }
    if (!stablecoinAddress || !sxuaAddress) {
      setError('Contract addresses not configured.')
      return
    }
    if (!isValidAmount) {
      setError('Enter a valid amount.')
      return
    }
    if (!hasEnoughBalance) {
      setError(`Insufficient balance. Available: ${formatAmount(availableBalance, decimals)} ${symbol}.`)
      return
    }

    try {
      setIsSubmitting(true)
      setError('')
      setStatus('')
      setTxHash(null)

      if (chainId !== HOODI_CHAIN_ID) {
        setStatus('Switching MetaMask to Hoodi...')
        await switchChainAsync({ chainId: HOODI_CHAIN_ID })
      }

      const functionName = source === 'uncommitted' ? 'withdraw' : 'uncommit'
      const label = source === 'uncommitted' ? 'Withdrawing to wallet' : 'Uncommitting balance'
      const contractCallBase = {
        address: sxuaAddress,
        abi: LOCAL_SXUA_ABI,
        functionName,
        args: [stablecoinAddress, amountBase],
      } as const
      setStatus(`${label}...`)
      const hash = await writeContractAsync(contractCallBase)

      setStatus(`${label} submitted.`)
      setTxHash(hash)
      setStatus('Transaction submitted.')
      setAmount('')
      uncommittedBalanceQuery.refetch()
      committedBalanceQuery.refetch()
    } catch (err) {
      console.error('Withdraw error:', err)
      setError(getWithdrawErrorMessage(err, symbol, decimals))
    } finally {
      setIsSubmitting(false)
    }
  }

  const principal = amountNumber > 0 ? amountNumber : 10000
  const daysLocked = 45
  const { penalty, userReceives, yieldAccrued } = calculatePenalty(principal, daysLocked)
  const withdrawalFee = source === 'committed' ? principal * 0.06 : (amountNumber * 0.06)
  const ptfFee = source === 'uncommitted' ? amountNumber * 0.01 : 0

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Withdraw</h3>
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
            <label className="block text-sm text-neutral-400 mb-2">Source</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSource('uncommitted')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition ${source === 'uncommitted' ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-white'}`}
              >
                Uncommitted
              </button>
              <button
                onClick={() => setSource('committed')}
                className={`py-2.5 rounded-lg text-sm font-semibold transition ${source === 'committed' ? 'bg-amber-500 text-black' : 'bg-neutral-800 text-white'}`}
              >
                Committed
              </button>
            </div>
          </div>

          {source === 'committed' && (
            <div>
              <label className="block text-sm text-neutral-400 mb-2">Sub-Account</label>
              <select
                value={subAccount}
                onChange={(e) => setSubAccount(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
              >
                <option value="001">SXUA-COMM-001 · {formatAmount(committedBalance, decimals)} {symbol}</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">Penalty applies if uncommitted before maturity.</p>
            </div>
          )}

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-lg font-bold focus:outline-none focus:border-amber-500"
            />
            <p className="text-xs text-neutral-500 mt-1">Available: {formatAmount(availableBalance, decimals)} {symbol}</p>
          </div>

          {source === 'committed' && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 space-y-2 text-sm">
              <p className="font-semibold text-amber-400">Early Withdrawal Penalty (Days 1-100)</p>
              <div className="flex justify-between">
                <span className="text-neutral-400">Principal</span>
                <span>${principal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Yield Accrued ({daysLocked} days)</span>
                <span>${yieldAccrued.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-amber-400">10% Principal Penalty</span>
                <span className="text-amber-400">-${(principal * 0.10).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-400">Forfeited to SXMM</span>
                <span className="text-red-400">-${penalty.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">6% Withdrawal Fee</span>
                <span>-${withdrawalFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800 font-bold">
                <span>You Receive</span>
                <span className="text-emerald-400">${(userReceives - withdrawalFee).toFixed(2)}</span>
              </div>
            </div>
          )}

          {source === 'uncommitted' && amount && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Amount</span>
                <span>${amountNumber.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">6% Withdrawal Fee</span>
                <span>-${withdrawalFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">1% PTF Fee</span>
                <span>-${ptfFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800 font-bold">
                <span>You Receive</span>
                <span className="text-emerald-400">${(amountNumber - withdrawalFee - ptfFee).toFixed(2)}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleWithdraw}
            disabled={!isValidAmount || isLoading || !hasEnoughBalance || !stablecoinAddress || !sxuaAddress}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition"
          >
            {isLoading ? 'Processing...' : 'Withdraw'}
          </button>
          {status && <p className="text-xs text-emerald-400">{status}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
          {txHash && <p className="text-xs text-neutral-500 break-all">Tx: {txHash}</p>}
        </div>
      </div>
    </div>
  )
}
