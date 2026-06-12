import { useState } from 'react'
import { ArrowDown } from 'lucide-react'
import { formatCurrency, calculateSxcpFee } from '@/lib/utils'

export default function Convert() {
  const [fromToken, setFromToken] = useState('EURC')
  const [toToken, setToToken] = useState('USDC')
  const [amount, setAmount] = useState('')

  const exchangeRates: Record<string, Record<string, number>> = {
    EURC: { USDC: 1.08, DAI: 1.07, EURC: 1 },
    USDC: { EURC: 0.926, DAI: 0.999, USDC: 1 },
    DAI: { USDC: 1.001, EURC: 0.927, DAI: 1 },
  }

  const inputAmount = amount ? parseFloat(amount) : 0
  const rate = exchangeRates[fromToken]?.[toToken] || 1
  const grossOutput = inputAmount * rate
  const fee = fromToken !== toToken ? calculateSxcpFee(grossOutput) : 0
  const netOutput = grossOutput - fee

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Convert</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">SXCP Cross-Stablecoin Conversion</h2>
          <p className="text-sm text-neutral-400 mb-6">12% fee deducted from destination stablecoin</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">From</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0"
                    className="bg-transparent text-2xl font-bold w-full focus:outline-none"
                  />
                  <select
                    value={fromToken}
                    onChange={(e) => setFromToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold"
                  >
                    <option value="EURC">EURC</option>
                    <option value="USDC">USDC</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="bg-neutral-800 rounded-full p-2">
                <ArrowDown className="w-5 h-5 text-neutral-400" />
              </div>
            </div>

            <div>
              <label className="block text-sm text-neutral-400 mb-2">To</label>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <div className="flex justify-between items-center">
                  <p className="text-2xl font-bold">{netOutput.toFixed(2)}</p>
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold"
                  >
                    <option value="USDC">USDC</option>
                    <option value="EURC">EURC</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
              </div>
            </div>

            <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition">
              Convert
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Conversion Details</h2>
            {amount ? (
              <div className="space-y-3">
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold">Gross Output</p>
                      <p className="text-xs text-neutral-400">Rate: 1 {fromToken} = {rate} {toToken}</p>
                    </div>
                    <p className="font-semibold">{formatCurrency(grossOutput)}</p>
                  </div>
                </div>
                {fromToken !== toToken ? (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-amber-400">SXCP Fee (12%)</p>
                        <p className="text-xs text-neutral-400">Protocol treasury</p>
                      </div>
                      <p className="font-semibold text-amber-400">-{formatCurrency(fee)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">SXCP Fee</p>
                        <p className="text-xs text-neutral-400">Same token · 0% fee</p>
                      </div>
                      <p className="font-semibold">$0.00</p>
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <p className="font-bold">Net Output</p>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(netOutput)} {toToken}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">Enter an amount to see conversion details</p>
            )}
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">SXEP Conversion</h2>
            <p className="text-sm text-neutral-400 mb-4">5% fee in SXYT for $SXYT → crypto conversion</p>
            <div className="space-y-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-1">$SXYT → USDC</p>
                <p className="font-semibold">5% fee in SXYT · Full USDC received</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-1">$SXYT → ETH</p>
                <p className="font-semibold">5% fee in SXYT · Full ETH received</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
