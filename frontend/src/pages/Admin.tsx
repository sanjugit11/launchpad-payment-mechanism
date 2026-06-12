import { useState } from 'react'
import { Key, Lock, Settings, Activity } from 'lucide-react'

export default function Admin() {
  const [sxcpRate, setSxcpRate] = useState('12')
  const [sxepRate, setSxepRate] = useState('5')
  const [killSwitchActive, setKillSwitchActive] = useState(false)

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Controls</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Key className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">DMS Device Attestation</h2>
              <p className="text-sm text-neutral-400">Hardware-bound key verification</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Admin A</p>
                  <p className="text-sm text-neutral-400">Device: iPhone 15 Pro</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">Bound</span>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Admin B</p>
                  <p className="text-sm text-neutral-400">Device: MacBook Pro M3</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">Bound</span>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Admin C</p>
                  <p className="text-sm text-neutral-400">Device: Pixel 8 Pro</p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full font-medium">Bound</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Fee Configuration</h2>
              <p className="text-sm text-neutral-400">3-of-3 approval required</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-2">SXCP Fee Rate (%)</label>
              <input
                type="number"
                value={sxcpRate}
                onChange={(e) => setSxcpRate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-2">SXEP Fee Rate (%)</label>
              <input
                type="number"
                value={sxepRate}
                onChange={(e) => setSxepRate(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 focus:outline-none focus:border-amber-500"
              />
            </div>
            <button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition">
              Propose Fee Change (3-of-3)
            </button>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Kill Switch</h2>
              <p className="text-sm text-neutral-400">Emergency platform pause</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold">Status</p>
                  <p className="text-sm text-neutral-400">
                    {killSwitchActive ? 'Platform paused' : 'Platform active'}
                  </p>
                </div>
                <span className={`${killSwitchActive ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'} text-xs px-2 py-1 rounded-full font-medium`}>
                  {killSwitchActive ? 'PAUSED' : 'ACTIVE'}
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setKillSwitchActive(true)}
                disabled={killSwitchActive}
                className="flex-1 bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2.5 rounded-lg transition text-sm"
              >
                Activate (1 Admin)
              </button>
              <button
                onClick={() => setKillSwitchActive(false)}
                disabled={!killSwitchActive}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg transition text-sm"
              >
                Deactivate (3 Admins)
              </button>
            </div>
          </div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Proposals</h2>
              <p className="text-sm text-neutral-400">3-of-3 governance</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold">Proposal #1: Update SXCP Fee</p>
                <span className="bg-amber-500/20 text-amber-400 text-xs px-2 py-1 rounded-full font-medium">Pending</span>
              </div>
              <p className="text-sm text-neutral-400 mb-2">Change SXCP fee from 12% to 11%</p>
              <div className="flex gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">Admin A ✓</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">Admin B ✓</span>
                <span className="bg-neutral-700 text-neutral-400 text-xs px-2 py-1 rounded-full">Admin C ○</span>
              </div>
            </div>
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
              <div className="flex justify-between items-start mb-2">
                <p className="font-semibold">Proposal #2: Deactivate Kill Switch</p>
                <span className="bg-neutral-700 text-neutral-300 text-xs px-2 py-1 rounded-full font-medium">Executed</span>
              </div>
              <div className="flex gap-2">
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">Admin A ✓</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">Admin B ✓</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-1 rounded-full">Admin C ✓</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
