import { useAccount } from 'wagmi'
import { useState } from 'react'
import { ArrowRightLeft, Shield, TrendingUp } from 'lucide-react'
import { calculateYield } from '@/lib/utils'
import DepositModal from '@/components/DepositModal'
import WithdrawModal from '@/components/WithdrawModal'
import CommitModal from '@/components/CommitModal'

export default function Dashboard() {
  const { isConnected } = useAccount()
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdraw, setShowWithdraw] = useState(false)
  const [showCommit, setShowCommit] = useState(false)

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-4xl md:text-5xl font-bold text-center mb-4 bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
          SX Stablecoin Launchpad
        </h1>
        <p className="text-neutral-400 text-center max-w-2xl mb-8">
          Unified stablecoin account with 44% APY, SX Rewards Point, cross-chain withdrawals, and secure governance.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full mb-10">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <TrendingUp className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">44% APY</h3>
            <p className="text-sm text-neutral-400">0.12% daily on committed balances</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <ArrowRightLeft className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">Cross-Chain</h3>
            <p className="text-sm text-neutral-400">Withdraw to any blockchain network</p>
          </div>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
            <Shield className="w-8 h-8 text-amber-500 mb-3" />
            <h3 className="font-semibold mb-1">Secure</h3>
            <p className="text-sm text-neutral-400">3-of-3 governance, DMS, DPoP, DIG</p>
          </div>
        </div>
      </div>
    )
  }

  const committedBalance = 25000
  calculateYield(committedBalance, 1)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">SX Unified Account (SXUA)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">Uncommitted Balance</p>
              <p className="text-2xl font-bold">$10,000.00</p>
              <p className="text-xs text-neutral-500 mt-1">0% APY · Instant withdrawal</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">Committed Balance</p>
              <p className="text-2xl font-bold">$25,000.00</p>
              <p className="text-xs text-emerald-400 mt-1">44% APY · 0.12% daily</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">SXP Rewards Earned</p>
              <p className="text-2xl font-bold">35,000 $SXP</p>
              <p className="text-xs text-neutral-500 mt-1">1 $SXP per $1 deposited</p>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <p className="text-sm text-neutral-400 mb-1">Daily Yield Accrued</p>
              <p className="text-2xl font-bold">$42.00</p>
              <p className="text-xs text-neutral-500 mt-1">0.12% of $35,000 committed</p>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button onClick={() => setShowDeposit(true)} className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-lg transition">
              Deposit Stablecoins
            </button>
            <button onClick={() => setShowWithdraw(true)} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-lg transition">
              Withdraw
            </button>
            <button onClick={() => setShowCommit(true)} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-lg transition">
              Commit Balance
            </button>
            <button onClick={() => window.location.href = '/convert'} className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-lg transition">
              Convert
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Committed Balances</h2>
          <div className="space-y-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">SXUA-USER-001-COMM-001</p>
                <p className="text-sm text-neutral-400">$10,000 USDC · Created Jun 11, 2026</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-400">Mature</p>
                <p className="text-sm text-neutral-400">Sep 19, 2026</p>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold">SXUA-USER-001-COMM-002</p>
                <p className="text-sm text-neutral-400">$15,000 USDC · Created Jun 12, 2026</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-amber-400">Locked</p>
                <p className="text-sm text-neutral-400">Sep 20, 2026</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-xl font-bold mb-4">Launchpad</h2>
          <div className="space-y-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">Project Alpha</p>
                  <p className="text-sm text-neutral-400">Token: ALPHA · USDC</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">Active</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Price: $0.05</span>
                <span className="text-neutral-400">Ends: Jun 20, 2026</span>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-semibold">Project Beta</p>
                  <p className="text-sm text-neutral-400">Token: BETA · USDC</p>
                </div>
                <span className="bg-neutral-700 text-neutral-300 text-xs px-2 py-1 rounded-full font-medium">Upcoming</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-400">Price: $0.10</span>
                <span className="text-neutral-400">Starts: Jun 25, 2026</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDeposit && <DepositModal onClose={() => setShowDeposit(false)} />}
      {showWithdraw && <WithdrawModal onClose={() => setShowWithdraw(false)} />}
      {showCommit && <CommitModal onClose={() => setShowCommit(false)} />}
    </div>
  )
}
