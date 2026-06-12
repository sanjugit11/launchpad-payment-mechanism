import { useState } from 'react'
import { formatCurrency, calculateSxcpFee, calculateSxmmSpread, calculatePtf } from '@/lib/utils'

export default function BuyStables() {
  const [sourceToken, setSourceToken] = useState('ETH')
  const [destToken, setDestToken] = useState('USDC')
  const [amount, setAmount] = useState('')

  const grossAmount = amount ? parseFloat(amount) : 0
  const exchangeRate = sourceToken === 'ETH' ? 3500 : 1
  const grossOutput = grossAmount * exchangeRate

  const sxcpFee = calculateSxcpFee(grossOutput)
  const sxmmFee = calculateSxmmSpread(grossOutput)
  const subtotalAfterSxcp = grossOutput - sxcpFee
  const ptf = calculatePtf(subtotalAfterSxcp)
  const netOutput = subtotalAfterSxcp - sxmmFee - ptf

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Buy Stablecoins</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
              <p className="text-sm text-neutral-400">SXSE Registration Required</p>
            </div>
            {!true && (
              <button className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-lg transition">
                Complete SXSE Registration
              </button>
            )}
            <p className="text-xs text-neutral-500 mt-2">You are registered with SXSE</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">You Pay</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="bg-transparent text-2xl font-bold w-full focus:outline-none"
                  />
                  <select
                    value={sourceToken}
                    onChange={(e) => setSourceToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold"
                  >
                    <option value="ETH">ETH</option>
                    <option value="BTC">BTC</option>
                    <option value="SOL">SOL</option>
                  </select>
                </div>
                <p className="text-xs text-neutral-500">Balance: 2.5 ETH</p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">You Receive</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-2xl font-bold">{netOutput.toFixed(2)}</p>
                  <select
                    value={destToken}
                    onChange={(e) => setDestToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <p className="text-xs text-neutral-500">Rate: 1 ETH = {exchangeRate.toLocaleString()} USDC</p>
              </div>
            </div>

            <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition">
              Buy {destToken}
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Fee Breakdown (18% Total)</h2>
          <div className="space-y-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Gross Amount</p>
                  <p className="text-xs text-neutral-400">{sourceToken} → {destToken}</p>
                </div>
                <p className="font-semibold">{formatCurrency(grossOutput)}</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-amber-400">SXCP Fee (12%)</p>
                  <p className="text-xs text-neutral-400">Protocol treasury</p>
                </div>
                <p className="font-semibold text-amber-400">-{formatCurrency(sxcpFee)}</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-blue-400">SXMM Spread (5%)</p>
                  <p className="text-xs text-neutral-400">Market Maker</p>
                </div>
                <p className="font-semibold text-blue-400">-{formatCurrency(sxmmFee)}</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-purple-400">PTF (1%)</p>
                  <p className="text-xs text-neutral-400">Platform operator</p>
                </div>
                <p className="font-semibold text-purple-400">-{formatCurrency(ptf)}</p>
              </div>
            </div>
            <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <p className="font-bold">You Receive</p>
                <p className="text-2xl font-bold text-amber-400">{formatCurrency(netOutput)} {destToken}</p>
              </div>
            </div>
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-xs text-red-400 text-center">
                Total fees: {formatCurrency(sxcpFee + sxmmFee + ptf)} ({((sxcpFee + sxmmFee + ptf) / grossOutput * 100).toFixed(1)}%)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
