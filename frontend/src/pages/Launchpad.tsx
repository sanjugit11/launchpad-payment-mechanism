import { useMemo, useState } from 'react'
import { useAccount, useBalance, usePublicClient, useReadContract, useSwitchChain, useWriteContract } from 'wagmi'
import { formatUnits, parseUnits, type Address } from 'viem'
import { ERC20_ABI, SXLAUNCHPAD_ABI, SXUA_ABI } from '@/lib/abi'

const HOODI_CHAIN_ID = 560048
const PROJECT_ID = 0
const SXUA_ADDRESS = (import.meta.env.VITE_SXUA_ADDRESS || '0xe24275b09B7eABf3491B6705D00D108421626429') as Address
const SXLAUNCHPAD_ADDRESS = (import.meta.env.VITE_SXLAUNCHPAD_ADDRESS || '0xD82AeeA3e5528E11967BBFff54751Acf8129DcF1') as Address
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || '0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3') as Address
const DEFAULT_TOKEN_DECIMALS = 18
const DEFAULT_STABLECOIN_DECIMALS = 6
const PRICE_DENOMINATOR = 10n ** 18n

type Project = {
  tokenAddress: Address
  stablecoinAddress: Address
  price: bigint
  saleStart: bigint
  saleEnd: bigint
  lockPeriod: bigint
  penaltyPercent: bigint
  buybackStart: bigint
  buybackEnd: bigint
  buybackPrice: bigint
  finalized: boolean
  active: boolean
}

type Allocation = {
  tokenAllocation: bigint
  stablecoinPaid: bigint
  claimed: boolean
  refunded: boolean
}

function formatAmount(value: bigint, decimals: number) {
  return Number(formatUnits(value, decimals)).toLocaleString(undefined, {
    maximumFractionDigits: 6,
  })
}

function formatDate(timestamp: bigint) {
  return new Date(Number(timestamp) * 1000).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function Launchpad() {
  const [tokenAmount, setTokenAmount] = useState('')
  const [buybackAmount, setBuybackAmount] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<Address | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { address, isConnected, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, isPending } = useWriteContract()

  const launchpadProjectQuery = useReadContract({
    address: SXLAUNCHPAD_ADDRESS,
    abi: SXLAUNCHPAD_ABI,
    functionName: 'getProject',
    args: [BigInt(PROJECT_ID)],
    query: { enabled: !!SXLAUNCHPAD_ADDRESS && SXLAUNCHPAD_ADDRESS !== '0x0000000000000000000000000000000000000000' },
  })

  const sxuaAddress = SXUA_ADDRESS

  const project = useMemo<Project | null>(() => {
    const data = launchpadProjectQuery.data

    if (!data) return null

    return {
      tokenAddress: data[0],
      stablecoinAddress: data[1],
      price: data[2],
      saleStart: data[3],
      saleEnd: data[4],
      lockPeriod: data[5],
      penaltyPercent: data[6],
      buybackStart: data[7],
      buybackEnd: data[8],
      buybackPrice: data[9],
      finalized: data[10],
      active: data[11],
    }
  }, [launchpadProjectQuery.data])

  const stablecoinAddress = project?.stablecoinAddress ?? USDC_ADDRESS
  const tokenAddress = project?.tokenAddress

  const stablecoinDecimalsQuery = useReadContract({
    address: stablecoinAddress,
    abi: ERC20_ABI,
    functionName: 'decimals',
  })

  const stablecoinSymbolQuery = useReadContract({
    address: stablecoinAddress,
    abi: ERC20_ABI,
    functionName: 'symbol',
  })

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

  const stablecoinBalanceQuery = useBalance({
    address,
    token: stablecoinAddress,
    query: { enabled: !!address },
  })

  const uncommittedBalanceQuery = useReadContract({
    address: sxuaAddress,
    abi: SXUA_ABI,
    functionName: 'uncommittedBalances',
    args: address && sxuaAddress && stablecoinAddress ? [address, stablecoinAddress] : undefined,
    query: { enabled: !!address && !!sxuaAddress && !!stablecoinAddress },
  })

  const allocationQuery = useReadContract({
    address: SXLAUNCHPAD_ADDRESS,
    abi: SXLAUNCHPAD_ABI,
    functionName: 'allocations',
    args: address ? [BigInt(PROJECT_ID), address] : undefined,
    query: { enabled: !!address && !!SXLAUNCHPAD_ADDRESS },
  })

  const tokenDecimals = tokenDecimalsQuery.data ?? DEFAULT_TOKEN_DECIMALS
  const stablecoinDecimals = stablecoinDecimalsQuery.data ?? DEFAULT_STABLECOIN_DECIMALS
  const stablecoinSymbol = stablecoinSymbolQuery.data || 'USDC'
  const tokenSymbol = tokenSymbolQuery.data || 'TOKEN'
  const tokenAmountNumber = tokenAmount ? Number(tokenAmount) : 0
  const isValidAmount = Number.isFinite(tokenAmountNumber) && tokenAmountNumber > 0
  const tokenAmountBase = isValidAmount ? parseUnits(tokenAmount, tokenDecimals) : 0n
  const cost = project ? (tokenAmountBase * project.price) / PRICE_DENOMINATOR : 0n
  const purchaseFee = cost / 100n
  const totalPayment = cost + purchaseFee
  const currentUncommittedBalance = uncommittedBalanceQuery.data ?? 0n
  const hasEnoughSxuaBalance = currentUncommittedBalance >= totalPayment
  const needsDeposit = !hasEnoughSxuaBalance
  const walletStablecoinBalance = stablecoinBalanceQuery.data?.value ?? 0n
  const hasEnoughWalletBalance = needsDeposit ? walletStablecoinBalance >= totalPayment : true
  const saleActive = project
    ? project.active && BigInt(Math.floor(Date.now() / 1000)) >= project.saleStart && BigInt(Math.floor(Date.now() / 1000)) <= project.saleEnd
    : false
  const buybackActive = project
    ? project.finalized && BigInt(Math.floor(Date.now() / 1000)) >= project.buybackStart && BigInt(Math.floor(Date.now() / 1000)) <= project.buybackEnd
    : false
  const canRefund = isConnected && !!project && !project.finalized
  const canUseAllocation = isConnected && !!project
  const canBuy = isConnected && !!chainId && isValidAmount && saleActive && (hasEnoughSxuaBalance || hasEnoughWalletBalance)
  const isLoading = isPending || isSubmitting

  const allocation = useMemo<Allocation>(() => {
    const data = allocationQuery.data
    if (!data) {
      return { tokenAllocation: 0n, stablecoinPaid: 0n, claimed: false, refunded: false }
    }

    return {
      tokenAllocation: data[0],
      stablecoinPaid: data[1],
      claimed: data[2],
      refunded: data[3],
    }
  }, [allocationQuery.data])

  const buybackAmountNumber = buybackAmount ? Number(buybackAmount) : 0
  const isValidBuybackAmount = Number.isFinite(buybackAmountNumber) && buybackAmountNumber > 0
  const buybackAmountBase = isValidBuybackAmount ? parseUnits(buybackAmount, tokenDecimals) : 0n
  const hasEnoughAllocationForBuyback = allocation.tokenAllocation >= buybackAmountBase
  const buybackReturn = project ? (buybackAmountBase * project.buybackPrice) / PRICE_DENOMINATOR : 0n
  const buybackFee = buybackReturn / 100n
  const userBuybackReturn = buybackReturn - buybackFee
  const refundFee = allocation.stablecoinPaid / 100n
  const userRefund = allocation.stablecoinPaid - refundFee

  const sendContractCall = async (label: string, config: Parameters<typeof writeContractAsync>[0]) => {
    setStatus(`${label}...`)
    const hash = await writeContractAsync(config)
    setStatus(`${label} submitted. Waiting for confirmation...`)
    setTxHash(hash)
    if (publicClient) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash })
      if (receipt.status === 'reverted') {
        throw new Error('Transaction reverted on-chain.')
      }
    }
  }

  const handleBuyTokens = async () => {
    if (!isConnected) {
      setError('Connect MetaMask first.')
      return
    }

    if (!isValidAmount) {
      setError('Enter a valid token amount.')
      return
    }

    if (!project) {
      setError('Project is not available on-chain.')
      return
    }

    if (!saleActive) {
      setError('This sale is not active.')
      return
    }

    if (!sxuaAddress) {
      setError('SXUA address is not available.')
      return
    }

    if (!publicClient) {
      setError('Wallet client is not ready.')
      return
    }

    if (!SXLAUNCHPAD_ADDRESS) {
      setError('Launchpad address is not configured.')
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

      if (needsDeposit) {
        if (walletStablecoinBalance < cost) {
          setError(`Insufficient ${stablecoinSymbol} balance. Required: ${formatAmount(cost, stablecoinDecimals)} ${stablecoinSymbol}.`)
          return
        }

        await sendContractCall(`Approve ${stablecoinSymbol} for SXUA`, {
          address: stablecoinAddress!,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [sxuaAddress!, totalPayment],
        })

        await sendContractCall(`Deposit ${stablecoinSymbol} into SXUA`, {
          address: sxuaAddress,
          abi: SXUA_ABI,
          functionName: 'deposit',
          args: [stablecoinAddress, totalPayment],
        })
      }

      await sendContractCall('Buying launchpad tokens', {
        address: SXLAUNCHPAD_ADDRESS!,
        abi: SXLAUNCHPAD_ABI,
        functionName: 'buyTokens',
        args: [BigInt(PROJECT_ID), tokenAmountBase],
      })

      setStatus('Tokens purchased successfully.')
      setTokenAmount('')
      uncommittedBalanceQuery.refetch()
      allocationQuery.refetch()
    } catch (err: any) {
      console.error('Buy tokens error:', err)
      setError(err.shortMessage || (err instanceof Error ? err.message : 'Transaction failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestRefund = async () => {
    if (!canUseAllocation || allocation.stablecoinPaid === 0n) {
      setError('No refundable allocation found.')
      return
    }

    if (!project || project.finalized) {
      setError('Refunds are only available before project finalization.')
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

      await sendContractCall('Requesting refund', {
        address: SXLAUNCHPAD_ADDRESS,
        abi: SXLAUNCHPAD_ABI,
        functionName: 'requestRefund',
        args: [BigInt(PROJECT_ID)],
      })

      setStatus('Refund submitted. Allocation tokens forfeited to SXMM.')
      uncommittedBalanceQuery.refetch()
      allocationQuery.refetch()
    } catch (err: any) {
      console.error('Refund error:', err)
      setError(err.shortMessage || (err instanceof Error ? err.message : 'Refund failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestBuyback = async () => {
    if (!project || !buybackActive) {
      setError('Buyback is not active.')
      return
    }

    if (!isValidBuybackAmount) {
      setError('Enter a valid buyback token amount.')
      return
    }

    if (!hasEnoughAllocationForBuyback) {
      setError(`Insufficient allocation. Available: ${formatAmount(allocation.tokenAllocation, tokenDecimals)} ${tokenSymbol}.`)
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

      await sendContractCall('Requesting buyback', {
        address: SXLAUNCHPAD_ADDRESS,
        abi: SXLAUNCHPAD_ABI,
        functionName: 'requestBuyback',
        args: [BigInt(PROJECT_ID), buybackAmountBase],
      })

      setStatus('Buyback submitted. Sold allocation is forfeited to SXMM.')
      setBuybackAmount('')
      uncommittedBalanceQuery.refetch()
      allocationQuery.refetch()
    } catch (err: any) {
      console.error('Buyback error:', err)
      setError(err.shortMessage || (err instanceof Error ? err.message : 'Buyback failed.'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const priceDisplay = project ? `$${Number(formatUnits(project.price, 18)).toFixed(2)}` : '$0.05'
  const costDisplay = formatAmount(cost, stablecoinDecimals)
  const purchaseFeeDisplay = formatAmount(purchaseFee, stablecoinDecimals)
  const totalPaymentDisplay = formatAmount(totalPayment, stablecoinDecimals)
  const uncommittedDisplay = formatAmount(currentUncommittedBalance, stablecoinDecimals)
  const walletBalanceDisplay = formatAmount(walletStablecoinBalance, stablecoinDecimals)
  const allocationDisplay = formatAmount(allocation.tokenAllocation, tokenDecimals)
  const stablecoinPaidDisplay = formatAmount(allocation.stablecoinPaid, stablecoinDecimals)
  const userRefundDisplay = formatAmount(userRefund, stablecoinDecimals)
  const refundFeeDisplay = formatAmount(refundFee, stablecoinDecimals)
  const userBuybackReturnDisplay = formatAmount(userBuybackReturn, stablecoinDecimals)
  const buybackFeeDisplay = formatAmount(buybackFee, stablecoinDecimals)
  const lockDays = project ? Math.max(1, Math.round(Number(project.lockPeriod) / 86400)) : 100
  const buybackPriceDisplay = project ? `$${Number(formatUnits(project.buybackPrice, 18)).toFixed(2)}` : '$1.25'
  const buttonDisabledReason = !isConnected
    ? 'Connect wallet'
    : !saleActive
      ? 'Sale is not active'
      : !isValidAmount
        ? 'Enter amount'
        : !hasEnoughSxuaBalance && !hasEnoughWalletBalance
          ? `Need ${formatAmount(totalPayment > currentUncommittedBalance ? totalPayment - currentUncommittedBalance : 0n, stablecoinDecimals)} ${stablecoinSymbol}`
          : ''

  const projectLoading = launchpadProjectQuery.isLoading
  const wrongChain = !!chainId && chainId !== HOODI_CHAIN_ID
  const buybackDisabledReason = !isConnected
    ? 'Connect wallet'
    : wrongChain
      ? 'Switch wallet to Hoodi'
      : projectLoading
        ? 'Loading project...'
        : launchpadProjectQuery.isError
          ? 'Unable to load project'
          : !project
            ? 'Project unavailable'
            : !buybackActive
              ? 'Buyback window is closed'
              : !isValidBuybackAmount
                ? 'Enter amount'
                : !hasEnoughAllocationForBuyback
                  ? 'Insufficient allocation' 
                  : allocation.claimed
                    ? 'Allocation already claimed'
                    : allocation.refunded
                      ? 'Allocation already refunded'
                      : ''

  const buybackButtonLabel = isLoading ? 'Processing...' : buybackDisabledReason || 'Buyback'

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Launchpad</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Active Projects</h2>
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-lg">Project Alpha</p>
                  <p className="text-sm text-neutral-400">
                    Token: {tokenSymbol} · Stablecoin: {stablecoinSymbol}
                  </p>
                  {project && <p className="text-xs text-neutral-500 mt-1">Project ID: {PROJECT_ID}</p>}
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${saleActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-700 text-neutral-300'}`}>
                  {saleActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-neutral-400">Price per Token</p>
                  <p className="font-semibold">{priceDisplay}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Sale Ends</p>
                  <p className="font-semibold">{project ? formatDate(project.saleEnd) : 'Jun 20, 2026'}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Buyback Price</p>
                  <p className="font-semibold">{buybackPriceDisplay}</p>
                </div>
                <div>
                  <p className="text-neutral-400">Lock Period</p>
                  <p className="font-semibold">{lockDays} days</p>
                </div>
              </div>
              <div className="border-t border-neutral-800 pt-4">
                <p className="text-sm text-neutral-400 mb-2">Purchase Tokens</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={tokenAmount}
                    onChange={(e) => setTokenAmount(e.target.value)}
                    placeholder="Amount"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <div className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-neutral-400">
                    = {costDisplay} {stablecoinSymbol}
                  </div>
                </div>
                {isValidAmount && (
                  <div className="mt-3 bg-neutral-800 border border-neutral-700 rounded-lg p-3 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-neutral-400">Token cost</span>
                      <span>{costDisplay} {stablecoinSymbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-neutral-400">PTF fee (1%)</span>
                      <span>{purchaseFeeDisplay} {stablecoinSymbol}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-neutral-700 font-semibold">
                      <span>Total SXUA debit</span>
                      <span>{totalPaymentDisplay} {stablecoinSymbol}</span>
                    </div>
                  </div>
                )}
                <button
                  onClick={handleBuyTokens}
                  disabled={!canBuy || isLoading}
                  className="w-full mt-3 bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg transition text-sm"
                >
                  {isLoading ? 'Processing...' : buttonDisabledReason || 'Buy Tokens'}
                </button>
                {status && <p className="text-xs text-emerald-400 mt-2">{status}</p>}
                {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
                {txHash && <p className="text-xs text-neutral-500 mt-2">Tx: {txHash}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">SXUA Payment Status</h2>
            <div className="space-y-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-2">SXUA Uncommitted {stablecoinSymbol}</p>
                <p className="text-lg font-semibold">{uncommittedDisplay} {stablecoinSymbol}</p>
                <p className="text-xs text-neutral-400 mt-1">Used by launchpad buy transaction through SXUA.payForLaunchpad</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-2">Wallet {stablecoinSymbol} Balance</p>
                <p className="text-lg font-semibold">{walletBalanceDisplay} {stablecoinSymbol}</p>
                <p className="text-xs text-neutral-400 mt-1">Used only when SXUA balance is not enough</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-2">Launchpad</p>
                <p className="text-xs text-neutral-500 break-all">{SXLAUNCHPAD_ADDRESS}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-2">Stablecoin</p>
                <p className="text-xs text-neutral-500 break-all">{stablecoinAddress}</p>
              </div>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Your Allocation</h2>
            <div className="grid grid-cols-2 gap-3 text-sm mb-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-neutral-400">Tokens allocated</p>
                <p className="font-semibold">{allocationDisplay} {tokenSymbol}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-neutral-400">Stablecoin paid</p>
                <p className="font-semibold">{stablecoinPaidDisplay} {stablecoinSymbol}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-neutral-400">Claimed</p>
                <p className="font-semibold">{allocation.claimed ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="text-neutral-400">Refunded</p>
                <p className="font-semibold">{allocation.refunded ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-amber-400">Refund before finalization</p>
                    <p className="text-neutral-400 text-sm">You receive {userRefundDisplay} {stablecoinSymbol}; {allocationDisplay} {tokenSymbol} goes to SXMM.</p>
                    <p className="text-xs text-neutral-500 mt-1">PTF fee: {refundFeeDisplay} {stablecoinSymbol}</p>
                  </div>
                  <button
                    onClick={handleRequestRefund}
                    disabled={!canRefund || allocation.stablecoinPaid === 0n || allocation.claimed || allocation.refunded || isLoading}
                    className="shrink-0 bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-semibold px-3 py-2 rounded-lg text-sm transition"
                  >
                    Refund
                  </button>
                </div>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="font-semibold text-amber-400 mb-2">Buyback window</p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={buybackAmount}
                    onChange={(e) => setBuybackAmount(e.target.value)}
                    placeholder="Token amount"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleRequestBuyback}
                    disabled={!!buybackDisabledReason || isLoading}
                    className="bg-neutral-800 hover:bg-neutral-700 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-white font-semibold px-3 py-2 rounded-lg text-sm transition"
                  >
                    {buybackButtonLabel}
                  </button>
                </div>
                {buybackDisabledReason && !isLoading && (
                  <p className="text-xs text-neutral-500 mt-2">{buybackDisabledReason}</p>
                )}
                <p className="text-neutral-400 text-sm mt-2">You receive {userBuybackReturnDisplay} {stablecoinSymbol}; {buybackAmount || '0'} {tokenSymbol} goes to SXMM.</p>
                <p className="text-xs text-neutral-500 mt-1">PTF fee: {buybackFeeDisplay} {stablecoinSymbol}</p>
              </div>

              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-3">
                <p className="font-semibold text-emerald-400">Exit after vesting</p>
                <p className="text-neutral-400 text-sm">Claiming after the lock period sends the remaining allocation with no token forfeiture.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
