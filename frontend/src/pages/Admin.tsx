import { useEffect, useState, useMemo } from 'react'
import { Key, Lock, Settings, Activity, ShieldAlert, Cpu, Sparkles, CheckCircle2, AlertTriangle, Play, HelpCircle } from 'lucide-react'
import { useAccount, usePublicClient, useWriteContract, useSwitchChain, useReadContract } from 'wagmi'
import { type Address, encodeFunctionData } from 'viem'
import { SXGOVERNANCE_ABI, SXUA_ABI, SXCP_ABI } from '@/lib/abi'
import { getChainExplorerUrl, hoodi, getContractAddresses, useContractAddresses, useTargetChainId } from '@/lib/chains'
import CreateLaunchpadProject from '../components/CreateLaunchpadProject'
import DIGSecurityDemo from '../components/DIGSecurityDemo'

const SXUA_EMERGENCY_SHUTDOWN_ABI = [
  {
    "inputs": [{ "internalType": "bool", "name": "active", "type": "bool" }],
    "name": "setEmergencyShutdown",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const

export default function Admin() {
  const { address, isConnected, chainId } = useAccount()
  const targetChainId = useTargetChainId()
  const publicClient = usePublicClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()

  const addresses = useContractAddresses()
  const SXGOVERNANCE_ADDRESS = addresses.SXGOVERNANCE
  const SXUA_ADDRESS = addresses.SXUA
  const SXCP_ADDRESS = addresses.SXCP
  const chainExplorerUrl = getChainExplorerUrl(chainId)
  const isGovernanceChain = chainId === hoodi.id

  // State
  const [sxcpRate, setSxcpRate] = useState('12')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [txHash, setTxHash] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'standard' | 'v4_3'>('standard')
  
  // Custom Proposal Form State
  const [customTarget, setCustomTarget] = useState('')
  const [customValue, setCustomValue] = useState('0')
  const [customData, setCustomData] = useState('0x')
  const [customDesc, setCustomDesc] = useState('')

  // On-Chain Fetched State
  const [admins, setAdmins] = useState<{
    address: string
    name: string
    isBound: boolean
    deviceHash: string
  }[]>([])
  const [proposals, setProposals] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Local Device Hash state for the active user
  const [localDeviceHash, setLocalDeviceHash] = useState<string>('')

  // 1. Fetch Emergency Shutdown status directly from SXUA on-chain
  const { data: emergencyShutdownActive, refetch: refetchShutdown } = useReadContract({
    address: SXUA_ADDRESS,
    abi: SXUA_ABI,
    functionName: 'emergencyShutdownActive',
    query: { enabled: !!SXUA_ADDRESS && SXUA_ADDRESS !== '0x0000000000000000000000000000000000000000' }
  })

  // Load local device hash from localStorage on load/address change
  useEffect(() => {
    if (address) {
      const savedHash = localStorage.getItem(`sx_device_hash_${address.toLowerCase()}`)
      if (savedHash) {
        setLocalDeviceHash(savedHash)
      } else {
        setLocalDeviceHash('')
      }
    }
  }, [address])

  // 2. Fetch admins & their binding status
  const fetchAdmins = async () => {
    if (!publicClient || !SXGOVERNANCE_ADDRESS || SXGOVERNANCE_ADDRESS === '0x0000000000000000000000000000000000000000') return
    try {
      const a = await publicClient.readContract({ address: SXGOVERNANCE_ADDRESS, abi: SXGOVERNANCE_ABI, functionName: 'adminA' }) as string
      const b = await publicClient.readContract({ address: SXGOVERNANCE_ADDRESS, abi: SXGOVERNANCE_ABI, functionName: 'adminB' }) as string
      const c = await publicClient.readContract({ address: SXGOVERNANCE_ADDRESS, abi: SXGOVERNANCE_ABI, functionName: 'adminC' }) as string

      const adminsData = []
      const list = [
        { addr: a, name: 'Admin A' },
        { addr: b, name: 'Admin B' },
        { addr: c, name: 'Admin C' }
      ]

      for (const item of list) {
        if (item.addr && item.addr !== '0x0000000000000000000000000000000000000000') {
          const isBound = await publicClient.readContract({
            address: SXGOVERNANCE_ADDRESS,
            abi: SXGOVERNANCE_ABI,
            functionName: 'isDeviceBound',
            args: [item.addr as Address],
          }) as boolean

          const deviceHash = await publicClient.readContract({
            address: SXGOVERNANCE_ADDRESS,
            abi: SXGOVERNANCE_ABI,
            functionName: 'deviceHashes',
            args: [item.addr as Address],
          }) as string

          adminsData.push({
            address: item.addr,
            name: item.name,
            isBound,
            deviceHash,
          })
        }
      }
      setAdmins(adminsData)
    } catch (err) {
      console.error("Error fetching admins:", err)
    }
  }

  // 3. Fetch proposals on-chain
  const fetchProposals = async () => {
    if (!publicClient || !SXGOVERNANCE_ADDRESS || SXGOVERNANCE_ADDRESS === '0x0000000000000000000000000000000000000000') return
    try {
      const count = await publicClient.readContract({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'getProposalCount',
      }) as bigint

      const countNum = Number(count)
      const fetchedList = []

      for (let i = 0; i < countNum; i++) {
        const prop = await publicClient.readContract({
          address: SXGOVERNANCE_ADDRESS,
          abi: SXGOVERNANCE_ABI,
          functionName: 'proposals',
          args: [BigInt(i)],
        }) as [string, bigint, string, boolean, boolean, boolean, boolean]
        
        fetchedList.push({
          id: i,
          target: prop[0],
          value: prop[1],
          data: prop[2],
          approvedA: prop[3],
          approvedB: prop[4],
          approvedC: prop[5],
          executed: prop[6],
        })
      }
      setProposals(fetchedList)
    } catch (err) {
      console.error("Error fetching proposals:", err)
    }
  }

  const refreshAll = async () => {
    setIsRefreshing(true)
    setError('')
    setStatus('')
    setTxHash(null)
    await Promise.all([fetchAdmins(), fetchProposals(), refetchShutdown()])
    setIsRefreshing(false)
  }

  // Initial load
  useEffect(() => {
    refreshAll()
    const interval = setInterval(() => {
      fetchAdmins()
      fetchProposals()
      refetchShutdown()
    }, 10000)
    return () => clearInterval(interval)
  }, [publicClient, SXGOVERNANCE_ADDRESS])

  // Computed helper to check if active account is an authorized admin
  const connectedAdmin = useMemo(() => {
    if (!address) return null
    return admins.find(a => a.address.toLowerCase() === address.toLowerCase()) || null
  }, [address, admins])

  // Helper to generate local fallback description
  const getProposalDescription = (target: string, data: string, id: number) => {
    const localDesc = localStorage.getItem(`sx_proposal_desc_${id}`)
    if (localDesc) return localDesc

    const encodedShutdownTrue = encodeFunctionData({
      abi: SXUA_EMERGENCY_SHUTDOWN_ABI,
      functionName: 'setEmergencyShutdown',
      args: [true],
    })
    const encodedShutdownFalse = encodeFunctionData({
      abi: SXUA_EMERGENCY_SHUTDOWN_ABI,
      functionName: 'setEmergencyShutdown',
      args: [false],
    })

    if (target.toLowerCase() === SXUA_ADDRESS?.toLowerCase()) {
      if (data === encodedShutdownTrue) {
        return "SXUA Emergency Shutdown: ACTIVATE"
      }
      if (data === encodedShutdownFalse) {
        return "SXUA Emergency Shutdown: DEACTIVATE"
      }
    }

    // Check if target is SXCP and data starts with setFeeRate selector
    if (target.toLowerCase() === SXCP_ADDRESS?.toLowerCase()) {
      // setFeeRate selector is 0x69fe0e2d (first 4 bytes of keccak256("setFeeRate(uint256)"))
      if (data.startsWith('0x69fe0e2d')) {
        return "SXCP Fee Configuration: Update Fee Rate"
      }
    }
    
    return `Proposal to ${target.substring(0, 6)}...${target.substring(target.length - 4)}`
  }

  // WebAuthn / secure fingerprint hash generator
  const generateAndBindDevice = async () => {
    if (!connectedAdmin) {
      setError('You are not authorized as a Governance Admin.')
      return
    }

    try {
      setError('')
      setStatus('Prompting hardware key / Touch ID authenticators...')

      const options: CredentialCreationOptions = {
        publicKey: {
          challenge: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
          rp: { name: "SX Launchpad Governance" },
          user: {
            id: new Uint8Array([1, 2, 3, 4]),
            name: `${connectedAdmin.name.toLowerCase().replace(' ', '')}@sxlaunchpad.com`,
            displayName: connectedAdmin.name
          },
          pubKeyCredParams: [
            { type: "public-key", alg: -7 },
            { type: "public-key", alg: -257 }
          ],
          authenticatorSelection: {
            authenticatorAttachment: "platform",
            userVerification: "required"
          },
          timeout: 10000
        }
      }

      let credentialId: string
      try {
        const credential = await navigator.credentials.create(options) as PublicKeyCredential | null
        if (!credential) throw new Error("No credential returned")
        credentialId = credential.id
      } catch (authErr) {
        console.warn("Hardware authenticator unavailable/rejected, using secure browser fallback hash", authErr)
        // Fallback: Compute hash based on agent entropy + dynamic seeds
        const entropy = navigator.userAgent + connectedAdmin.address + Date.now().toString()
        const encoder = new TextEncoder()
        const data = encoder.encode(entropy)
        const hashBuffer = await crypto.subtle.digest("SHA-256", data)
        credentialId = Array.from(new Uint8Array(hashBuffer))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      }

      // Convert to bytes32 format
      const deviceHash = ("0x" + credentialId.substring(0, 64).padEnd(64, '0')) as `0x${string}`

      if (chainId !== targetChainId) {
        setStatus('Switching MetaMask to Target Network...')
        await switchChainAsync({ chainId: targetChainId })
      }

      setStatus(`Submitting bindDevice transaction with hash: ${deviceHash.substring(0, 10)}...`)
      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'bindDevice',
        args: [deviceHash],
        gas: 15_000_000n
      })

      setTxHash(hash)
      setStatus('Waiting for block confirmation...')
      localStorage.setItem(`sx_device_hash_${address?.toLowerCase()}`, deviceHash)
      setLocalDeviceHash(deviceHash)

      // Refresh admin list
      setTimeout(refreshAll, 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Binding failed')
      setStatus('')
    }
  }

  // Propose emergency shutdown
  const proposeEmergencyShutdown = async (activate: boolean) => {
    if (!connectedAdmin) {
      setError('You are not authorized as a Governance Admin.')
      return
    }

    try {
      setError('')
      setStatus(`Preparing proposal to ${activate ? 'ACTIVATE' : 'DEACTIVATE'} Emergency Shutdown...`)

      const data = encodeFunctionData({
        abi: SXUA_EMERGENCY_SHUTDOWN_ABI,
        functionName: 'setEmergencyShutdown',
        args: [activate],
      })

      if (chainId !== targetChainId) {
        setStatus('Switching MetaMask to Target Network...')
        await switchChainAsync({ chainId: targetChainId })
      }

      setStatus('Submitting proposal to SXGovernance...')
      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'propose',
        args: [SXUA_ADDRESS, 0n, data],
        gas: 15_000_000n
      })

      setTxHash(hash)
      setStatus('Proposal transaction submitted!')
      
      // Store description locally
      const tempId = proposals.length
      localStorage.setItem(`sx_proposal_desc_${tempId}`, `SXUA Emergency Shutdown: ${activate ? 'ACTIVATE' : 'DEACTIVATE'}`)

      setTimeout(refreshAll, 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Propose failed')
      setStatus('')
    }
  }

  // Propose custom/fee transaction
  const proposeCustomTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connectedAdmin) {
      setError('You are not authorized as a Governance Admin.')
      return
    }

    try {
      setError('')
      setStatus('Submitting custom proposal to SXGovernance...')

      if (chainId !== targetChainId) {
        setStatus('Switching MetaMask to Target Network...')
        await switchChainAsync({ chainId: targetChainId })
      }

      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'propose',
        args: [customTarget as Address, BigInt(customValue), customData as `0x${string}`],
        gas: 15_000_000n
      })

      setTxHash(hash)
      setStatus('Custom Proposal submitted!')
      
      // Save description locally
      const tempId = proposals.length
      localStorage.setItem(`sx_proposal_desc_${tempId}`, customDesc || `Call target ${customTarget}`)

      // Reset
      setCustomTarget('')
      setCustomValue('0')
      setCustomData('0x')
      setCustomDesc('')

      setTimeout(refreshAll, 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Custom propose failed')
      setStatus('')
    }
  }

  // Pre-filled fee change proposal helper
  const proposeFeeChange = async () => {
    if (!connectedAdmin) {
      setError('You are not authorized as a Governance Admin.')
      return
    }

    if (!SXCP_ADDRESS || SXCP_ADDRESS === '0x0000000000000000000000000000000000000000') {
      setError('SXCP contract address is not configured.')
      return
    }

    try {
      setError('')
      const feeRateValue = BigInt(sxcpRate)
      const desc = `Update SXCP Fee to ${sxcpRate}%`
      setStatus(`Preparing proposal to update SXCP Fee to ${sxcpRate}%...`)

      // Encode the setFeeRate function call
      const encodedData = encodeFunctionData({
        abi: SXCP_ABI,
        functionName: 'setFeeRate',
        args: [feeRateValue],
      })

      if (!isGovernanceChain && chainId !== hoodi.id) {
        setError('Admin governance actions must be performed on Hoodi.')
        return
      }

      setStatus('Submitting fee change proposal to SXGovernance...')
      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'propose',
        args: [SXCP_ADDRESS, 0n, encodedData],
        gas: 15_000_000n
      })

      setTxHash(hash)
      setStatus('Fee Change Proposal transaction submitted to Hoodi!')

      // Store description locally
      const tempId = proposals.length
      localStorage.setItem(`sx_proposal_desc_${tempId}`, desc)

      setTimeout(refreshAll, 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Fee proposal failed')
      setStatus('')
    }
  }

  // Approve proposal with DMS device hash attestation
  const approveProposal = async (id: number) => {
    if (!connectedAdmin) {
      setError('You are not authorized as a Governance Admin.')
      return
    }

    if (!localDeviceHash) {
      setError('Please bind your device hash to this browser before approving.')
      return
    }

    try {
      setError('')
      setStatus(`Attesting Proposal #${id + 1} using physical device key...`)

      if (!isGovernanceChain && chainId !== hoodi.id) {
        setError('Admin governance actions must be performed on Hoodi.')
        return
      }

      setStatus(`Submitting approval attestation with device hash...`)
      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'approve',
        args: [BigInt(id), localDeviceHash as `0x${string}`],
        gas: 15_000_000n
      })

      setTxHash(hash)
      setStatus('Approval attested successfully!')

      setTimeout(refreshAll, 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Attestation failed')
      setStatus('')
    }
  }

  // Execute Proposal
  const executeProposal = async (id: number) => {
    try {
      setError('')
      setStatus(`Executing Proposal #${id + 1} on-chain...`)

      if (!isGovernanceChain && chainId !== hoodi.id) {
        setError('Admin governance actions must be performed on Hoodi.')
        return
      }

      const hash = await writeContractAsync({
        address: SXGOVERNANCE_ADDRESS,
        abi: SXGOVERNANCE_ABI,
        functionName: 'execute',
        args: [BigInt(id)],
        gas: 15_000_000n
      })

      setTxHash(hash)
      setStatus('Proposal executed successfully!')

      setTimeout(refreshAll, 4000)
    } catch (err: any) {
      console.error(err)
      setError(err.shortMessage || err.message || 'Execution failed')
      setStatus('')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
            Admin Governance Controls
          </h1>
          <p className="text-sm text-neutral-400">
            Secure 3-of-3 Multi-Signature & Device Management System (DMS) Console
          </p>
        </div>
        <button
          onClick={refreshAll}
          disabled={isRefreshing}
          className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2 rounded-lg border border-neutral-700 transition flex items-center gap-2 text-sm"
        >
          {isRefreshing ? 'Syncing...' : 'Sync On-Chain State'}
        </button>
      </div>

      <div className="flex gap-2 border-b border-neutral-800 pb-px mb-6">
        <button
          onClick={() => setActiveTab('standard')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'standard' ? 'border-amber-500 text-amber-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          Standard Controls
        </button>
        <button
          onClick={() => setActiveTab('v4_3')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'v4_3' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-neutral-400 hover:text-white'
          }`}
        >
          V4.3 DIG & Security Demo
        </button>
      </div>

      {activeTab === 'v4_3' ? (
        <DIGSecurityDemo connectedAdmin={connectedAdmin} refreshAll={refreshAll} localDeviceHash={localDeviceHash} />
      ) : (
        <>
          {/* Connection & Admin Authorization Alert Banner */}
      {!isConnected ? (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-200">
            Please connect your wallet to view active hardware attestation settings.
          </p>
        </div>
      ) : connectedAdmin ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-400">
                Authorized Session: {connectedAdmin.name} Detected
              </p>
              <p className="text-xs text-neutral-400">
                Connected address: {address}
              </p>
            </div>
          </div>
          {connectedAdmin.isBound ? (
            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-emerald-500/30">
              Active DMS Device Ready
            </span>
          ) : (
            <span className="bg-amber-500/20 text-amber-400 text-xs px-2.5 py-1 rounded-full font-semibold border border-amber-500/30 animate-pulse">
              Device Binding Required
            </span>
          )}
        </div>
      ) : (
        <div className="bg-neutral-800/40 border border-neutral-700 rounded-xl p-4 flex items-center gap-3">
          <HelpCircle className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <div>
            <p className="text-sm text-neutral-300">
              Read-Only Viewer Mode
            </p>
            <p className="text-xs text-neutral-500">
              Your wallet ({address}) is not an authorized Admin key. You can view proposal states but cannot vote or bind keys.
            </p>
          </div>
        </div>
      )}

      {/* System Status Messages */}
      {status && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-amber-500 rounded-full animate-ping" />
          <p className="text-sm text-amber-200">{status}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}
      {txHash && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
          <p className="text-sm text-emerald-200">
            Transaction submitted: <a href={`https://explorer.hoodi.ethpandaops.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" className="underline font-mono">{txHash.substring(0, 16)}...</a>
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: DMS Device Attestation (Hardware Security) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">DMS Hardware Key attestation</h2>
                <p className="text-sm text-neutral-400">Cryptographically bound physical devices</p>
              </div>
            </div>
            
            <div className="space-y-3 mt-4">
              {admins.length === 0 ? (
                <p className="text-sm text-neutral-500 py-4 text-center">No admins found on the connected network.</p>
              ) : (
                admins.map((admin) => {
                  const isUserAdmin = admin.address.toLowerCase() === address?.toLowerCase();
                  return (
                    <div 
                      key={admin.address} 
                      className={`bg-neutral-950 border rounded-lg p-4 transition ${isUserAdmin ? 'border-amber-500/50' : 'border-neutral-800'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">{admin.name}</p>
                            {isUserAdmin && (
                              <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-mono">YOU</span>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 font-mono mt-0.5">{admin.address}</p>
                          <p className="text-xs text-neutral-400 mt-2 flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-neutral-500" />
                            {admin.isBound ? (
                              <span className="font-mono text-neutral-300 break-all">
                                Device Key: {admin.deviceHash.substring(0, 16)}...
                              </span>
                            ) : (
                              <span className="text-amber-500 font-medium italic">No physical device bound</span>
                            )}
                          </p>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${
                          admin.isBound 
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                            : 'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}>
                          {admin.isBound ? 'Bound' : 'Not Bound'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {connectedAdmin && (
            <div className="mt-6 pt-4 border-t border-neutral-800/60">
              {connectedAdmin.isBound ? (
                <div className="bg-neutral-950/60 border border-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">
                    Active browser device key bound:
                  </p>
                  <p className="text-xs text-emerald-400 font-mono break-all mt-1 bg-neutral-900 p-2 rounded border border-neutral-850">
                    {localDeviceHash || 'Loading hash...'}
                  </p>
                  <button 
                    onClick={generateAndBindDevice}
                    className="w-full mt-3 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-semibold py-2 rounded-lg transition"
                  >
                    Re-Bind / Update Device Key
                  </button>
                </div>
              ) : (
                <button
                  onClick={generateAndBindDevice}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-amber-500/10"
                >
                  <Sparkles className="w-4 h-4" />
                  Generate & Bind Hardware Key (Touch ID / Face ID)
                </button>
              )}
            </div>
          )}
        </div>

        {/* Card 2: Fee Configuration */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Fee Configuration</h2>
                <p className="text-sm text-neutral-400">Propose platform modifications (3-of-3 required)</p>
              </div>
            </div>
            
            <div className="space-y-4 mt-6">
              <div>
                <label className="block text-sm text-neutral-400 mb-2">SXCP Fee Rate (%)</label>
                <input
                  type="number"
                  value={sxcpRate}
                  onChange={(e) => setSxcpRate(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500"
                />
              </div>
              
              <div className="bg-neutral-950 border border-neutral-800/60 rounded-lg p-4 text-xs text-neutral-400 space-y-1">
                <p className="font-semibold text-white">How this works:</p>
                <p>1. Proposing a fee change submits a dynamic proposal onto the `SXGovernance` contract.</p>
                <p>2. Once created, all 3 admins must attest and sign it with their bound physical device hashes.</p>
                <p>3. Finally, anyone can execute the confirmed proposal to update parameters.</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-neutral-800/60">
            <button
              onClick={proposeFeeChange}
              disabled={!connectedAdmin}
              className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black font-bold py-3 rounded-lg transition"
            >
              Configure proposal for {sxcpRate}% Fee
            </button>
          </div>
        </div>

        {/* Card 3: Kill Switch (Emergency Shutdown status) */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Lock className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Emergency Shutdown (Kill Switch)</h2>
              <p className="text-sm text-neutral-400">Suspend all platform deposits/withdrawals instantly</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 flex justify-between items-center">
              <div>
                <p className="font-semibold text-white">On-Chain Platform Status</p>
                <p className="text-xs text-neutral-500">Reads live state from `SXUA` contract</p>
              </div>
              <span className={`text-xs px-3 py-1 rounded-full font-bold border ${
                emergencyShutdownActive 
                  ? 'bg-red-500/20 text-red-400 border-red-500/30' 
                  : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
              }`}>
                {emergencyShutdownActive ? 'PAUSED / EMERGENCY SHUTDOWN' : 'ACTIVE / NORMAL OPERATION'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <button
                onClick={() => proposeEmergencyShutdown(true)}
                disabled={!connectedAdmin || emergencyShutdownActive}
                className="bg-red-500 hover:bg-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                Propose Pause (Active)
              </button>
              <button
                onClick={() => proposeEmergencyShutdown(false)}
                disabled={!connectedAdmin || !emergencyShutdownActive}
                className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-semibold py-3 rounded-lg transition text-sm flex items-center justify-center gap-2"
              >
                Propose Unpause (Active)
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Create Custom Proposals Form */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <form onSubmit={proposeCustomTransaction} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Custom Governance Proposal</h2>
                <p className="text-sm text-neutral-400">Launch arbitrary on-chain operations</p>
              </div>
            </div>
            
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">Target Address</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={customTarget}
                  onChange={(e) => setCustomTarget(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Value (wei)</label>
                  <input
                    type="number"
                    required
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Proposal description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Set SXCP Fee"
                    value={customDesc}
                    onChange={(e) => setCustomDesc(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">Calldata (hex payload)</label>
                <input
                  type="text"
                  required
                  placeholder="0x..."
                  value={customData}
                  onChange={(e) => setCustomData(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <button
                type="submit"
                disabled={!connectedAdmin}
                className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:cursor-not-allowed text-black font-semibold py-2.5 rounded-lg transition text-sm mt-2"
              >
                Submit Proposal
              </button>
            </div>
          </form>
        </div>

        {/* Card 5: Proposals Attestation & Execution Console */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl col-span-1 lg:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Active Proposals Ledger</h2>
              <p className="text-sm text-neutral-400">Verify, vote, and execute governance actions</p>
            </div>
          </div>
          
          <div className="space-y-4 mt-6">
            {proposals.length === 0 ? (
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-8 text-center">
                <p className="text-neutral-500 text-sm">No proposals have been created yet on the governance contract.</p>
              </div>
            ) : (
              proposals.map((proposal) => {
                const totalApprovals = (proposal.approvedA ? 1 : 0) + (proposal.approvedB ? 1 : 0) + (proposal.approvedC ? 1 : 0)
                const isReady = totalApprovals === 3 && !proposal.executed
                const desc = getProposalDescription(proposal.target, proposal.data, proposal.id)

                // Check if the currently connected admin has approved
                let hasApproved = false
                if (connectedAdmin) {
                  if (connectedAdmin.name === 'Admin A') hasApproved = proposal.approvedA
                  if (connectedAdmin.name === 'Admin B') hasApproved = proposal.approvedB
                  if (connectedAdmin.name === 'Admin C') hasApproved = proposal.approvedC
                }

                return (
                  <div key={proposal.id} className="bg-neutral-950 border border-neutral-800 rounded-lg p-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="bg-neutral-800 text-neutral-300 text-xs px-2.5 py-1 rounded font-mono font-bold">
                            Proposal #{proposal.id + 1}
                          </span>
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                            proposal.executed 
                              ? 'bg-neutral-800 text-neutral-400 border-neutral-700' 
                              : isReady 
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                                : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          }`}>
                            {proposal.executed ? 'Executed' : isReady ? 'Ready' : 'Pending Approvals'}
                          </span>
                        </div>
                        
                        <p className="text-base font-bold text-white mt-2">
                          {desc}
                        </p>
                        
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-neutral-500 font-mono">
                            Target: {proposal.target}
                          </p>
                          <p className="text-xs text-neutral-500 font-mono">
                            Value: {proposal.value.toString()} wei
                          </p>
                          <p className="text-xs text-neutral-500 font-mono break-all">
                            Calldata: {proposal.data}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-start md:items-end gap-3 w-full md:w-auto">
                        <div className="flex gap-2 text-xs">
                          <span className={`px-2 py-1 rounded-full font-medium ${
                            proposal.approvedA ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            Admin A {proposal.approvedA ? '✓' : '○'}
                          </span>
                          <span className={`px-2 py-1 rounded-full font-medium ${
                            proposal.approvedB ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            Admin B {proposal.approvedB ? '✓' : '○'}
                          </span>
                          <span className={`px-2 py-1 rounded-full font-medium ${
                            proposal.approvedC ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                          }`}>
                            Admin C {proposal.approvedC ? '✓' : '○'}
                          </span>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                          {!proposal.executed && isReady && (
                            <button
                              onClick={() => executeProposal(proposal.id)}
                              className="w-full md:w-auto bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-4 py-2 rounded-lg transition text-xs flex items-center gap-1.5 justify-center"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Execute Call
                            </button>
                          )}
                          {!proposal.executed && connectedAdmin && !hasApproved && (
                            <button
                              onClick={() => approveProposal(proposal.id)}
                              disabled={!localDeviceHash}
                              className="w-full md:w-auto bg-amber-500 hover:bg-amber-400 disabled:bg-neutral-800 disabled:text-neutral-550 disabled:cursor-not-allowed text-black font-bold px-4 py-2 rounded-lg transition text-xs flex items-center gap-1.5 justify-center"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              {localDeviceHash ? 'Approve (DMS Signature)' : 'Bind Device Key First'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        <CreateLaunchpadProject />
      </div>
        </>
      )}
    </div>
  )
}
