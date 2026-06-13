import { useState, useEffect } from 'react'
import { Rocket } from 'lucide-react'
import { useWriteContract, useAccount, useReadContract, useSwitchChain } from 'wagmi'
import { parseUnits, type Address } from 'viem'
import { SXLAUNCHPAD_ABI, ERC20_ABI } from '@/lib/abi'
import { useTargetChainId, useContractAddresses } from '@/lib/chains'

export default function CreateLaunchpadProject() {
  const { isConnected, chainId } = useAccount()
  const targetChainId = useTargetChainId()
  const addresses = useContractAddresses()
  const SXLAUNCHPAD_ADDRESS = addresses.SXLAUNCHPAD

  const [tokenAddress, setTokenAddress] = useState('')
  const [stablecoinAddress, setStablecoinAddress] = useState('')
  const [price, setPrice] = useState('0.05')
  const [saleStart, setSaleStart] = useState('')
  const [saleEnd, setSaleEnd] = useState('')
  const [lockPeriodDays, setLockPeriodDays] = useState('30')
  const [penaltyPercent, setPenaltyPercent] = useState('10')
  const [buybackStart, setBuybackStart] = useState('')
  const [buybackEnd, setBuybackEnd] = useState('')
  const [buybackPrice, setBuybackPrice] = useState('0.04')

  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const [lastChainId, setLastChainId] = useState<number | undefined>(undefined)

  useEffect(() => {
    if (chainId !== lastChainId) {
      setLastChainId(chainId)
      if (addresses.USDC) {
        setStablecoinAddress(addresses.USDC)
      }
    }
  }, [chainId, lastChainId, addresses.USDC])

  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync, isPending } = useWriteContract()

  const decimalsQuery = useReadContract({
    address: stablecoinAddress as Address,
    abi: ERC20_ABI,
    functionName: 'decimals',
    query: { enabled: !!stablecoinAddress }
  })
  const stablecoinDecimals = decimalsQuery.data ?? 6

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isConnected) {
      setError('Connect wallet first.')
      return
    }

    try {
      setError('')
      setStatus('Prompting wallet...')

      if (chainId !== targetChainId) {
        setStatus('Switching MetaMask to Target Network...')
        await switchChainAsync({ chainId: targetChainId })
      }

      const startTimestamp = Math.floor(new Date(saleStart).getTime() / 1000)
      const endTimestamp = Math.floor(new Date(saleEnd).getTime() / 1000)
      const lockPeriodSeconds = Number(lockPeriodDays) * 86400
      const penalty = Number(penaltyPercent)
      const bbStartTimestamp = Math.floor(new Date(buybackStart).getTime() / 1000)
      const bbEndTimestamp = Math.floor(new Date(buybackEnd).getTime() / 1000)

      if (isNaN(startTimestamp) || isNaN(endTimestamp) || isNaN(bbStartTimestamp) || isNaN(bbEndTimestamp)) {
        throw new Error('Please fill in all dates correctly.')
      }

      // Convert prices to stablecoin decimals
      const priceBase = parseUnits(price, stablecoinDecimals)
      const bbPriceBase = parseUnits(buybackPrice, stablecoinDecimals)

      const hash = await writeContractAsync({
        address: SXLAUNCHPAD_ADDRESS,
        abi: SXLAUNCHPAD_ABI,
        functionName: 'addProject',
        args: [
          tokenAddress as Address,
          stablecoinAddress as Address,
          priceBase,
          BigInt(startTimestamp),
          BigInt(endTimestamp),
          BigInt(lockPeriodSeconds),
          BigInt(penalty),
          BigInt(bbStartTimestamp),
          BigInt(bbEndTimestamp),
          bbPriceBase,
        ],
        gas: 15000000n, // Safe limit for testnet RPC
      })

      setStatus(`Transaction submitted! Hash: ${hash}`)
      
      // Reset form
      setTokenAddress('')
      setSaleStart('')
      setSaleEnd('')
      setBuybackStart('')
      setBuybackEnd('')
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Transaction failed')
      setStatus('')
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 mt-6 w-full col-span-1 lg:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
          <Rocket className="w-5 h-5 text-amber-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Launchpad Project Creation</h2>
          <p className="text-sm text-neutral-400">Deploy a new token to the SX Launchpad (Admin Only)</p>
        </div>
      </div>

      <form onSubmit={handleCreateProject} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Token Address</label>
            <input
              type="text"
              required
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Stablecoin Address (e.g. USDC)</label>
            <input
              type="text"
              required
              value={stablecoinAddress}
              onChange={(e) => setStablecoinAddress(e.target.value)}
              placeholder="0x..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Sale Price (USD)</label>
            <input
              type="number"
              step="0.001"
              required
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Buyback Price (USD)</label>
            <input
              type="number"
              step="0.001"
              required
              value={buybackPrice}
              onChange={(e) => setBuybackPrice(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Sale Start</label>
            <input
              type="date"
              required
              value={saleStart}
              onChange={(e) => setSaleStart(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Sale End</label>
            <input
              type="date"
              required
              value={saleEnd}
              onChange={(e) => setSaleEnd(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Buyback Window Start</label>
            <input
              type="date"
              required
              value={buybackStart}
              onChange={(e) => setBuybackStart(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Buyback Window End</label>
            <input
              type="date"
              required
              value={buybackEnd}
              onChange={(e) => setBuybackEnd(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Lock Period (Days)</label>
            <input
              type="number"
              required
              value={lockPeriodDays}
              onChange={(e) => setLockPeriodDays(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">Early Exit Penalty (%)</label>
            <input
              type="number"
              required
              max="100"
              min="0"
              value={penaltyPercent}
              onChange={(e) => setPenaltyPercent(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        <div className="pt-4 border-t border-neutral-800">
          <button
            type="submit"
            disabled={isPending || !isConnected}
            className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-700 disabled:text-neutral-400 disabled:cursor-not-allowed text-black font-bold py-3.5 rounded-xl transition"
          >
            {isPending ? 'Publishing Project...' : 'Add Project to Launchpad'}
          </button>
          
          {status && <p className="mt-3 text-sm text-emerald-400 break-all">{status}</p>}
          {error && <p className="mt-3 text-sm text-red-400 break-all">{error}</p>}
        </div>
      </form>
    </div>
  )
}
