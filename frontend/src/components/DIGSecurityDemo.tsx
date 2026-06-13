import { useState } from 'react'
import { Shield, ShieldAlert, Smartphone, Fingerprint, Lock, Unlock, PlayCircle, AlertTriangle, KeyRound, Cpu, CheckCircle2, XCircle } from 'lucide-react'
import { useAccount, usePublicClient, useWriteContract, useReadContract, useSwitchChain } from 'wagmi'
import { encodeFunctionData, type Address } from 'viem'
import { SXGOVERNANCE_ABI, SXUA_ABI, SXCP_ABI } from '@/lib/abi'
import { useTargetChainId, useContractAddresses } from '@/lib/chains'

const SXUA_EMERGENCY_SHUTDOWN_ABI = [
  {
    "inputs": [{ "internalType": "bool", "name": "active", "type": "bool" }],
    "name": "setEmergencyShutdown",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export default function DIGSecurityDemo({ connectedAdmin, refreshAll, localDeviceHash }: { connectedAdmin: any, refreshAll: () => void, localDeviceHash: string }) {
  const [scene, setScene] = useState<number>(1)
  const [demoLog, setDemoLog] = useState<string[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  
  const { address, chainId } = useAccount()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const targetChainId = useTargetChainId()
  const addresses = useContractAddresses()
  const SXGOVERNANCE_ADDRESS = addresses.SXGOVERNANCE
  const SXUA_ADDRESS = addresses.SXUA
   console.log("adminnnnnnnnnn==>", connectedAdmin)
  const { data: deviceStatusData, refetch: refetchStatus } = useReadContract({
    address: SXGOVERNANCE_ADDRESS,
    abi: SXGOVERNANCE_ABI,
    functionName: 'deviceStatus',
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!SXGOVERNANCE_ADDRESS }
  })

  // DeviceStatus enum: 0 = UNREGISTERED, 1 = ACTIVE, 2 = QUARANTINED
  const isQuarantined = deviceStatusData === 2

  const log = (msg: string) => setDemoLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const requireNetwork = async () => {
    if (chainId !== targetChainId) {
      log('Switching MetaMask to Target Network...')
      await switchChainAsync({ chainId: targetChainId })
    }
  }

  const runDigScan = () => {
    setIsProcessing(true)
    log('Initiating OS-level DIG Security Scan...')
    setTimeout(() => {
      log('Analyzing kernel integrity...')
      setTimeout(() => {
        log('⚠️ FATAL: su binary detected in /system/xbin')
        log('⚠️ FATAL: Frida server process (frida-server) detected')
        setScene(2)
        setIsProcessing(false)
      }, 1500)
    }, 1000)
  }

  const triggerRemediation = async () => {
    // if (!connectedAdmin) return log('Not an admin.')
    try {
      setIsProcessing(true)
      await requireNetwork()
      log('DIG Backend triggers automated remediation...')
      log('Calling smart contract: quarantineDevice(address)')
      
      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'quarantineDevice',
        args: [address as Address],
      })
      log(`Transaction submitted: ${hash.substring(0, 10)}...`)
      
      if (publicClient) {
         await publicClient.waitForTransactionReceipt({ hash })
      }
      
      log('✅ Device successfully QUARANTINED on-chain.')
      log('Session Revoked. Token Revoked.')
      refetchStatus()
      setScene(3)
    } catch (err: any) {
      log(`Error: ${err.shortMessage || err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const attemptAction = async () => {
    try {
      setIsProcessing(true)
      await requireNetwork()
      log('Attempting Governance Action: Propose Fee Change...')
      
      const encodedData = encodeFunctionData({
        abi: SXCP_ABI,
        functionName: 'setFeeRate',
        args: [15n],
      })

      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'propose',
        args: [addresses.SXCP, 0n, encodedData],
      })
      // This should fail before reaching here if quarantined
      log(`Transaction hash: ${hash}`)
    } catch (err: any) {
      log(`❌ REVERTED: ${err.shortMessage || err.message}`)
      log('As expected! The stolen/quarantined device cannot execute governance actions.')
      setTimeout(() => setScene(4), 1000)
    } finally {
      setIsProcessing(false)
    }
  }

  const activateKillSwitch = async () => {
    try {
      setIsProcessing(true)
      await requireNetwork()
      log('Admin 1 activating Emergency Kill Switch (1-Admin bypass)...')
      
      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'triggerEmergencyShutdown',
        args: [SXUA_ADDRESS],
      })
      log(`Transaction submitted: ${hash.substring(0, 10)}...`)
      if (publicClient) {
         await publicClient.waitForTransactionReceipt({ hash })
      }
      log('✅ Platform Paused! Deposits/Withdrawals Reverted.')
      setTimeout(() => setScene(7), 1500)
    } catch (err: any) {
      log(`Error: ${err.shortMessage || err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const proposeDeactivation = async () => {
    try {
      setIsProcessing(true)
      await requireNetwork()
      log('Proposing 3-Admin Kill Switch Deactivation...')
      
      const data = encodeFunctionData({
        abi: SXUA_EMERGENCY_SHUTDOWN_ABI,
        functionName: 'setEmergencyShutdown',
        args: [false],
      })

      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'propose',
        args: [SXUA_ADDRESS, 0n, data],
      })
      log(`Proposal submitted! Hash: ${hash.substring(0, 10)}...`)
      if (publicClient) {
         await publicClient.waitForTransactionReceipt({ hash })
      }
      log('✅ Proposal created. Awaiting Admin 1, 2, and 3 approvals.')
      setTimeout(() => setScene(8), 1500)
      refreshAll()
    } catch (err: any) {
      log(`Error: ${err.shortMessage || err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl w-full">
      <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
        <div className="w-10 h-10 bg-indigo-500/20 rounded-lg flex items-center justify-center">
          <ShieldAlert className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">V4.3 DIG & Security Flow Demo</h2>
          <p className="text-sm text-neutral-400">Interactive simulation of device compromise, DPoP, and Kill Switch</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visualizer Panel */}
        <div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 p-3 opacity-10 pointer-events-none">
             <Fingerprint className="w-48 h-48" />
          </div>

          <div className="relative z-10 flex flex-col h-full justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-mono text-neutral-500 bg-neutral-900 px-2 py-1 rounded">SCENE {scene} / 8</span>
                {isProcessing && <span className="flex items-center gap-2 text-xs text-indigo-400"><div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div> Processing...</span>}
              </div>

              {scene === 1 && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-lg font-bold text-white mb-2">1. Normal Device State</h3>
                  <div className="flex items-center gap-4 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg">
                    <Smartphone className="w-8 h-8 text-emerald-400" />
                    <div>
                      <p className="text-emerald-400 font-semibold">Device-001 (Active)</p>
                      <p className="text-xs text-emerald-500/70">Registered in DMS • DPoP Key Bound</p>
                    </div>
                  </div>
                  <button onClick={runDigScan} disabled={isProcessing} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    <PlayCircle className="w-4 h-4" /> Run DIG Jailbreak Scan
                  </button>
                </div>
              )}

              {scene === 2 && (
                <div className="animate-in fade-in zoom-in-95">
                  <h3 className="text-lg font-bold text-red-400 mb-2">2. Compromise Detected!</h3>
                  <div className="flex items-center gap-4 bg-red-500/10 border border-red-500/20 p-4 rounded-lg">
                    <AlertTriangle className="w-8 h-8 text-red-500 animate-pulse" />
                    <div>
                      <p className="text-red-400 font-semibold">DIG ALERT: Risk Level HIGH</p>
                      <ul className="text-xs text-red-500/70 list-disc list-inside mt-1">
                        <li>Rooted Device detected (su binary)</li>
                        <li>Frida framework detected</li>
                      </ul>
                    </div>
                  </div>
                  <button onClick={triggerRemediation} disabled={isProcessing} className="mt-6 w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    <Shield className="w-4 h-4" /> Trigger Automated Remediation
                  </button>
                </div>
              )}

              {scene === 3 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-lg font-bold text-amber-400 mb-2">3. Automated Remediation</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                      <span className="text-sm text-neutral-300">Session Status</span>
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">REVOKED</span>
                    </div>
                    <div className="flex justify-between items-center bg-neutral-900 border border-neutral-800 p-3 rounded-lg">
                      <span className="text-sm text-neutral-300">DPoP Token</span>
                      <span className="text-xs font-bold text-red-400 bg-red-500/10 px-2 py-1 rounded">INVALIDATED</span>
                    </div>
                    <div className="flex justify-between items-center bg-neutral-900 border border-amber-500/30 p-3 rounded-lg">
                      <span className="text-sm text-neutral-300">Smart Contract State</span>
                      <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">QUARANTINED</span>
                    </div>
                  </div>
                  <button onClick={attemptAction} disabled={isProcessing} className="mt-6 w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    Attempt Governance Action
                  </button>
                </div>
              )}

              {scene === 4 && (
                <div className="animate-in fade-in zoom-in">
                  <h3 className="text-lg font-bold text-white mb-2">4. Governance Denied</h3>
                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-center">
                    <XCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <p className="text-red-400 font-bold">Transaction Reverted</p>
                    <p className="text-xs text-red-500/80 mt-1 font-mono bg-neutral-950 p-2 rounded">"Governance: Device quarantined"</p>
                  </div>
                  <button onClick={() => setScene(5)} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    Proceed to DPoP Demo
                  </button>
                </div>
              )}

              {scene === 5 && (
                <div className="animate-in fade-in slide-in-from-bottom-4">
                  <h3 className="text-lg font-bold text-white mb-2">5. DPoP Stolen Token Scenario</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span className="text-sm font-bold text-emerald-400">Original Device A</span>
                        </div>
                        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 rounded">200 OK</span>
                      </div>
                      <p className="text-xs text-emerald-500/70 mt-1 flex items-center gap-1"><KeyRound className="w-3 h-3"/> Token Signature matches Device A Public Key</p>
                    </div>

                    <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl">STOLEN JWT</div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <XCircle className="w-4 h-4 text-red-400" />
                          <span className="text-sm font-bold text-red-400">Attacker Device B</span>
                        </div>
                        <span className="text-[10px] bg-red-500/20 text-red-300 px-2 rounded">401 UNAUTHORIZED</span>
                      </div>
                      <p className="text-xs text-red-500/70 mt-1 flex items-center gap-1"><Cpu className="w-3 h-3"/> Signature From Key B ≠ Expected Key A</p>
                    </div>
                  </div>

                  <button onClick={() => setScene(6)} className="mt-6 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    Proceed to Kill Switch Demo
                  </button>
                </div>
              )}

              {scene === 6 && (
                <div className="animate-in fade-in slide-in-from-right-4">
                  <h3 className="text-lg font-bold text-white mb-2">6. Asymmetric Kill Switch</h3>
                  <p className="text-xs text-neutral-400 mb-4">Activation requires only 1 Admin via fast-track function.</p>
                  
                  <div className="bg-neutral-900 border border-neutral-800 p-4 rounded-lg text-center">
                    <Lock className="w-12 h-12 text-red-500 mx-auto mb-2" />
                    <p className="text-white font-bold">Emergency Shutdown</p>
                  </div>
                  
                  <button onClick={activateKillSwitch} disabled={isProcessing} className="mt-6 w-full bg-red-600 hover:bg-red-500 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    <Lock className="w-4 h-4" /> 1-Admin Activate Kill Switch
                  </button>
                </div>
              )}

              {scene === 7 && (
                <div className="animate-in fade-in zoom-in">
                  <h3 className="text-lg font-bold text-white mb-2">7. Kill Switch Deactivation</h3>
                  <p className="text-xs text-neutral-400 mb-4">Deactivation requires standard 3-of-3 Admin consensus.</p>
                  
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg flex items-center justify-between">
                    <div>
                      <p className="text-amber-400 font-bold">Proposal: UNPAUSE SYSTEM</p>
                      <p className="text-xs text-amber-500/70">Awaiting 3 Approvals</p>
                    </div>
                    <Unlock className="w-6 h-6 text-amber-500" />
                  </div>
                  
                  <button onClick={proposeDeactivation} disabled={isProcessing} className="mt-6 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 rounded-lg transition flex justify-center items-center gap-2">
                    Propose Deactivation (3-of-3)
                  </button>
                </div>
              )}

              {scene === 8 && (
                <div className="animate-in fade-in zoom-in flex flex-col items-center justify-center py-6">
                  <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-xl font-bold text-white text-center">Demo Complete</h3>
                  <p className="text-sm text-neutral-400 text-center mt-2">V4.3 DIG & Security Requirements Successfully Validated.</p>
                  <button onClick={() => {setScene(1); setDemoLog([])}} className="mt-6 px-6 bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2 rounded-lg transition">
                    Restart Demo
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Console Log Panel */}
        <div className="bg-[#0a0a0a] border border-neutral-800 rounded-xl p-4 flex flex-col font-mono text-xs text-emerald-400 h-[380px]">
          <div className="flex items-center gap-2 pb-2 mb-2 border-b border-neutral-800/60 text-neutral-500">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
            <span className="ml-2">DIG_SYSTEM_CONSOLE</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-2">
            {demoLog.length === 0 ? (
              <span className="text-neutral-600">Waiting for system events...</span>
            ) : (
              demoLog.map((log, i) => (
                <div key={i} className="break-all">
                  <span className="opacity-50 select-none">&gt; </span>
                  {log.includes('FATAL') || log.includes('❌') || log.includes('REVOKED') || log.includes('INVALIDATED') ? (
                    <span className="text-red-400">{log}</span>
                  ) : log.includes('QUARANTINED') || log.includes('⚠️') ? (
                    <span className="text-amber-400">{log}</span>
                  ) : log.includes('✅') ? (
                    <span className="text-emerald-300 font-bold">{log}</span>
                  ) : (
                    <span>{log}</span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
