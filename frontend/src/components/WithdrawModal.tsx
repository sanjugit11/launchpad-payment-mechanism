import { useState } from 'react'
import { X } from 'lucide-react'
import { calculatePenalty } from '@/lib/utils'

export default function WithdrawModal({ onClose }: { onClose: () => void }) {
  const [_token, _setToken] = useState('USDC')
  const [source, setSource] = useState<'uncommitted' | 'committed'>('uncommitted')
  const [subAccount, setSubAccount] = useState('001')
  const [amount, setAmount] = useState('')

  const principal = 10000
  const daysLocked = 45
  const { penalty, userReceives, yieldAccrued } = calculatePenalty(principal, daysLocked)
  const withdrawalFee = principal * 0.06

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
                <option value="001">SXUA-USER-001-COMM-001 · $10,000 USDC</option>
                <option value="002">SXUA-USER-001-COMM-002 · $15,000 USDC</option>
              </select>
              <p className="text-xs text-neutral-500 mt-1">Created Jun 11, 2026 · Matures Sep 19, 2026</p>
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
                <span>${parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">6% Withdrawal Fee</span>
                <span>-${(parseFloat(amount) * 0.06).toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-neutral-800 font-bold">
                <span>You Receive</span>
                <span className="text-emerald-400">${(parseFloat(amount) * 0.94).toFixed(2)}</span>
              </div>
            </div>
          )}

          <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition">
            Withdraw
          </button>
        </div>
      </div>
    </div>
  )
}
