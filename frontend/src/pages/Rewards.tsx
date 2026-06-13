import { useState } from 'react'
import { calculateYield, calculateSxepFee } from '@/lib/utils'

export default function Rewards() {
  const [convertAmount, setConvertAmount] = useState('')
  const sxpBalance = 35000
  const sxcpBalance = 1250
  const committedBalance = 25000

  const days = [1, 7, 30, 60, 100, 101]
  const yields = days.map((d) => calculateYield(committedBalance, d))

  const grossSxyValue = convertAmount ? parseFloat(convertAmount) * 0.12 : 0
  const sxepFee = calculateSxepFee(grossSxyValue)
  const netUsdc = grossSxyValue - sxepFee

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Rewards & Earnings</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm text-neutral-400 mb-1">SXP Balance</p>
          <p className="text-3xl font-bold">{sxpBalance.toLocaleString()} $SXP</p>
          <p className="text-xs text-neutral-500 mt-2">1 $SXP per $1 deposited</p>
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <p className="text-sm text-neutral-400 mb-1">SXCP Balance</p>
            <p className="text-xl font-bold">{sxcpBalance.toLocaleString()} SXCP</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm text-neutral-400 mb-1">Daily Yield (Committed)</p>
          <p className="text-3xl font-bold text-emerald-400">${yields[1].toFixed(2)}</p>
          <p className="text-xs text-neutral-500 mt-2">0.12% daily on ${committedBalance.toLocaleString()}</p>
          <div className="mt-4 pt-4 border-t border-neutral-800">
            <p className="text-sm text-neutral-400 mb-1">Annual APY</p>
            <p className="text-xl font-bold text-emerald-400">~44%</p>
          </div>
        </div>
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <p className="text-sm text-neutral-400 mb-1">Uncommitted Balance</p>
          <p className="text-3xl font-bold">$10,000.00</p>
          <p className="text-xs text-neutral-500 mt-2">0% APY · Instant withdrawal</p>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Yield Accrual Projection</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left py-2 text-neutral-400 font-medium">Days</th>
                <th className="text-right py-2 text-neutral-400 font-medium">Yield Accrued</th>
                <th className="text-right py-2 text-neutral-400 font-medium">Total Balance</th>
                <th className="text-right py-2 text-neutral-400 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {days.map((day) => (
                <tr key={day} className="border-b border-neutral-800/50">
                  <td className="py-3">{day}</td>
                  <td className="py-3 text-right">${yields[days.indexOf(day)].toFixed(2)}</td>
                  <td className="py-3 text-right">${(committedBalance + yields[days.indexOf(day)]).toFixed(2)}</td>
                  <td className="py-3 text-right">
                    <span className={day <= 100 ? 'text-amber-400' : 'text-emerald-400'}>
                      {day <= 100 ? 'Locked (penalty)' : 'Mature'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">SXEP Conversion (SXYT → USDC)</h2>
        <p className="text-sm text-neutral-400 mb-4">12% fee deducted in SXYT · You receive full USDC amount</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-neutral-400 mb-2">SXYT Amount</label>
            <input
              type="number"
              value={convertAmount}
              onChange={(e) => setConvertAmount(e.target.value)}
              placeholder="0"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-400 mb-2">You Receive (USDC)</label>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-lg font-bold">
              {netUsdc.toFixed(2)} USDC
            </div>
          </div>
        </div>
        {convertAmount && (
          <div className="mt-4 bg-neutral-950 border border-neutral-800 rounded-lg p-4 text-sm space-y-2">
            <div className="flex justify-between">
              <span className="text-neutral-400">Gross Output (1 SXYT = $0.12)</span>
              <span>${grossSxyValue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-amber-400">SXEP Fee (12%)</span>
              <span className="text-amber-400">-{sxepFee.toFixed(2)} SXYT</span>
            </div>
            <div className="flex justify-between font-semibold pt-2 border-t border-neutral-800">
              <span>You Receive</span>
              <span className="text-emerald-400">${netUsdc.toFixed(2)} USDC</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
