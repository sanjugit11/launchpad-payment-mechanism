import { useState } from 'react'
import { formatCurrency, calculateSxcpFee, calculateSxmmSpread, calculatePtf } from '@/lib/utils'
import { useAccount, useBalance } from 'wagmi'
import { useBuyStables } from '../hooks/useBuyStables'
import { Settings, ShieldAlert, Sparkles, RefreshCw } from 'lucide-react'

export default function BuyStables() {
  const [sourceToken, setSourceToken] = useState('ETH')
  const [destToken, setDestToken] = useState('USDC')
  const [amount, setAmount] = useState('')

  // Admin states
  const [newRate, setNewRate] = useState('')
  const [selectedConfigField, setSelectedConfigField] = useState<'setSXSE' | 'setSXUA' | 'setSxcpTreasury' | 'setSXMM' | 'setPtfReceiver'>('setSXMM')
  const [newConfigAddress, setNewConfigAddress] = useState('')
  const [isAdminStatusMsg, setIsAdminStatusMsg] = useState('')

  const grossAmount = amount ? parseFloat(amount) : 0
  const { address } = useAccount()
  const { data: ethBalance } = useBalance({ address })
  
  const { 
    buyStables, 
    updateRate, 
    updateConfigAddress, 
    ethToUsdRate, 
    owner, 
    configAddresses, 
    isPending, 
    isSuccess, 
    error 
  } = useBuyStables()

  const exchangeRate = sourceToken === 'ETH' ? ethToUsdRate : 1
  const grossOutput = grossAmount * exchangeRate

  const sxcpFee = calculateSxcpFee(grossOutput)
  const sxmmFee = calculateSxmmSpread(grossOutput)
  const subtotalAfterSxcp = grossOutput - sxcpFee
  const ptf = calculatePtf(subtotalAfterSxcp)
  const netOutput = subtotalAfterSxcp - sxmmFee - ptf

  const handleBuy = () => {
    if (!amount || isNaN(Number(amount))) return;
    buyStables(amount);
  };

  const handleUpdateRate = async () => {
    if (!newRate || isNaN(Number(newRate))) return;
    try {
      setIsAdminStatusMsg('Updating rate...');
      await updateRate(newRate);
      setIsAdminStatusMsg('Rate update transaction submitted!');
      setNewRate('');
    } catch (err: any) {
      setIsAdminStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleUpdateConfigAddress = async () => {
    if (!newConfigAddress || !newConfigAddress.startsWith('0x')) return;
    try {
      setIsAdminStatusMsg(`Updating ${selectedConfigField}...`);
      await updateConfigAddress(selectedConfigField, newConfigAddress);
      setIsAdminStatusMsg(`Update transaction for ${selectedConfigField} submitted!`);
      setNewConfigAddress('');
    } catch (err: any) {
      setIsAdminStatusMsg(`Error: ${err.message}`);
    }
  };

  const isOwner = address && owner && address.toLowerCase() === owner.toLowerCase();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Buy Stablecoins</h1>
          <p className="text-neutral-400 text-sm mt-1">Convert native assets to Unified Account stables instantly.</p>
        </div>
        {isOwner && (
          <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-xs font-semibold text-amber-400">
            <Settings className="w-3.5 h-3.5 animate-spin-slow" /> Owner Access
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Main Swapper */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
          
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-neutral-400 font-medium">SXSE Registration Active</p>
            </div>
            <p className="text-xs text-neutral-500">Your address is registered on-chain with SXSE</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">You Pay</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 transition-all focus-within:border-neutral-700">
                <div className="flex justify-between items-center mb-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="bg-transparent text-2xl font-bold w-full focus:outline-none text-white placeholder-neutral-700"
                  />
                  <select
                    value={sourceToken}
                    onChange={(e) => setSourceToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="ETH">ETH</option>
                  </select>
                </div>
                <p className="text-xs text-neutral-500">
                  Balance: {address && ethBalance ? Number(ethBalance.formatted).toFixed(4) : '0.0000'} ETH
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">You Receive</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-2xl font-bold text-white">{netOutput.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <select
                    value={destToken}
                    onChange={(e) => setDestToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="USDC">USDC</option>
                  </select>
                </div>
                <p className="text-xs text-neutral-500 flex items-center gap-1">
                  Rate: 1 ETH = {exchangeRate.toLocaleString()} USDC <RefreshCw className="w-3 h-3 text-neutral-500" />
                </p>
              </div>
            </div>

            <button
              onClick={handleBuy}
              disabled={isPending || !amount || isNaN(Number(amount))}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3.5 rounded-xl transition shadow-lg shadow-amber-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Processing...' : `Buy ${destToken}`}
            </button>
            {isSuccess && <p className="text-emerald-400 text-sm mt-2 text-center font-medium">Purchase successful! Stables deposited to your SXUA vault.</p>}
            {error && <p className="text-red-400 text-sm mt-2 text-center font-medium">Transaction failed: {error.message}</p>}
          </div>
        </div>

        {/* Fee Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-1.5 text-white">
            <Sparkles className="w-5 h-5 text-amber-500" /> Fee Breakdown (18% Total)
          </h2>
          <div className="space-y-3">
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-neutral-300">Gross Amount</p>
                  <p className="text-xs text-neutral-500">{sourceToken} → {destToken}</p>
                </div>
                <p className="font-semibold text-neutral-300">{formatCurrency(grossOutput)}</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-amber-400">SXCP Fee (12%)</p>
                  <p className="text-xs text-neutral-500">Protocol treasury</p>
                </div>
                <p className="font-semibold text-amber-400">-{formatCurrency(sxcpFee)}</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-blue-400">SXMM Spread (5%)</p>
                  <p className="text-xs text-neutral-500">Market Maker</p>
                </div>
                <p className="font-semibold text-blue-400">-{formatCurrency(sxmmFee)}</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-purple-400">PTF (1%)</p>
                  <p className="text-xs text-neutral-500">Platform operator</p>
                </div>
                <p className="font-semibold text-purple-400">-{formatCurrency(ptf)}</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <p className="font-bold text-white">You Receive</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(netOutput)} {destToken}</p>
              </div>
            </div>
            <div className="bg-neutral-950/80 border border-neutral-800 rounded-lg p-3">
              <p className="text-xs text-neutral-400 text-center">
                Total fees: {formatCurrency(sxcpFee + sxmmFee + ptf)} ({((sxcpFee + sxmmFee + ptf) / (grossOutput || 1) * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Panel */}
      {isOwner && (
        <div className="bg-neutral-900 border border-amber-500/20 rounded-xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
          <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2 mb-4">
            <ShieldAlert className="w-5 h-5 text-amber-400" /> Admin Settings (SXBuyStables)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Update Exchange Rate */}
            <div className="space-y-3">
              <label className="block text-sm text-neutral-300 font-medium">Update Exchange Rate (1 ETH = ? USD)</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="e.g. 3600"
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 w-full text-white placeholder-neutral-700 focus:outline-none focus:border-amber-500/50"
                />
                <button
                  onClick={handleUpdateRate}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition whitespace-nowrap"
                >
                  Update Rate
                </button>
              </div>
            </div>

            {/* Configure Addresses */}
            <div className="space-y-3">
              <label className="block text-sm text-neutral-300 font-medium">Configure System Addresses</label>
              <div className="flex flex-col gap-2">
                <select
                  value={selectedConfigField}
                  onChange={(e) => setSelectedConfigField(e.target.value as any)}
                  className="bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none"
                >
                  <option value="setSXMM">Market Maker (SXMM)</option>
                  <option value="setSxcpTreasury">SXCP Treasury</option>
                  <option value="setPtfReceiver">PTF Receiver</option>
                  <option value="setSXUA">SXUA Vault Address</option>
                  <option value="setSXSE">SXSE Registry Address</option>
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newConfigAddress}
                    onChange={(e) => setNewConfigAddress(e.target.value)}
                    className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 w-full text-white placeholder-neutral-700 focus:outline-none focus:border-amber-500/50 text-sm"
                  />
                  <button
                    onClick={handleUpdateConfigAddress}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-lg transition whitespace-nowrap"
                  >
                    Update Address
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Current Configuration View */}
          <div className="mt-6 pt-6 border-t border-neutral-800/80">
            <h3 className="text-sm font-semibold text-neutral-400 mb-3">Current System Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block mb-1">Market Maker (SXMM)</span>
                <span className="font-mono text-neutral-300 break-all">{configAddresses.sxmm || 'N/A'}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block mb-1">SXCP Treasury</span>
                <span className="font-mono text-neutral-300 break-all">{configAddresses.sxcpTreasury || 'N/A'}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block mb-1">PTF Receiver</span>
                <span className="font-mono text-neutral-300 break-all">{configAddresses.ptfReceiver || 'N/A'}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block mb-1">SXUA Vault</span>
                <span className="font-mono text-neutral-300 break-all">{configAddresses.sxua || 'N/A'}</span>
              </div>
              <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800/40">
                <span className="text-neutral-500 block mb-1">SXSE Registry</span>
                <span className="font-mono text-neutral-300 break-all">{configAddresses.sxse || 'N/A'}</span>
              </div>
            </div>
          </div>

          {isAdminStatusMsg && (
            <div className="mt-4 p-3 bg-neutral-950 rounded-lg border border-amber-500/10 text-center">
              <p className="text-xs text-amber-400 font-medium">{isAdminStatusMsg}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
