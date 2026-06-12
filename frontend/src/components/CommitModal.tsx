import { useState } from 'react'
import { X } from 'lucide-react'

export default function CommitModal({ onClose }: { onClose: () => void }) {
  const [token, setToken] = useState('USDC')
  const [amount, setAmount] = useState('')
  const availableUncommitted = 3000

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
            <p className="text-xs text-neutral-500 mt-1">Available: ${availableUncommitted.toLocaleString()}</p>
          </div>

          {amount && (
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-400">Committed Balance</span>
                <span className="font-semibold">${(parseFloat(amount) * 0.0012).toFixed(2)}/day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Monthly Yield (30 days)</span>
                <span className="font-semibold text-emerald-400">${(parseFloat(amount) * 0.0012 * 30).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">Annual Yield (365 days)</span>
                <span className="font-semibold text-emerald-400">${(parseFloat(amount) * 0.0012 * 365).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800">
                <span className="text-emerald-400">SXP Rewards</span>
                <span className="font-semibold text-emerald-400">{parseFloat(amount).toFixed(0)} $SXP</span>
              </div>
            </div>
          )}

          <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition">
            Commit
          </button>
        </div>
      </div>
    </div>
  )
}
