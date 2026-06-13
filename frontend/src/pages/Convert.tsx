import { useState } from 'react'
import { ArrowDown, Coins } from 'lucide-react'
import { formatCurrency, calculateSxcpFee } from '@/lib/utils'
import { useConvert } from '@/hooks/useConvert'
import { useMint } from '@/hooks/useMint'
import { useContractAddresses } from '@/lib/chains'

const TOKEN_DECIMALS: Record<string, number> = {
  USDC: 6,
  USDT: 6,
  DAI: 18,
}

export default function Convert() {
  const addresses = useContractAddresses()
  const TOKEN_ADDRESSES: Record<string, string> = {
    USDC: addresses.USDC,
    USDT: addresses.USDT,
    DAI: addresses.DAI,
  }

  const [fromToken, setFromToken] = useState('USDT')
  const [toToken, setToToken] = useState('USDC')
  const [amount, setAmount] = useState('')

  // Faucet state
  const [faucetToken, setFaucetToken] = useState('USDT')
  const [faucetAmount, setFaucetAmount] = useState('10000')

  const { convertStables, isPending, isSuccess, error } = useConvert()
  const { mintTokens, isPending: isMinting, isSuccess: isMintSuccess, error: mintError } = useMint()

  const exchangeRates: Record<string, Record<string, number>> = {
    USDT: { USDC: 1.00, DAI: 1.00, USDT: 1 },
    USDC: { USDT: 1.00, DAI: 1.00, USDC: 1 },
    DAI: { USDC: 1.00, USDT: 1.00, DAI: 1 },
  }

  const inputAmount = amount ? parseFloat(amount) : 0
  const rate = exchangeRates[fromToken]?.[toToken] || 1
  const grossOutput = inputAmount * rate
  const fee = fromToken !== toToken ? calculateSxcpFee(grossOutput) : 0
  const netOutput = grossOutput - fee

  const handleConvert = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return;
    
    const fromAddress = TOKEN_ADDRESSES[fromToken];
    const toAddress = TOKEN_ADDRESSES[toToken];
    const fromDec = TOKEN_DECIMALS[fromToken];
    const toDec = TOKEN_DECIMALS[toToken];

    if (!fromAddress || !toAddress) {
      console.error("Token addresses not configured");
      return;
    }

    await convertStables(
      fromAddress,
      toAddress,
      amount,
      netOutput.toFixed(toDec === 6 ? 6 : 18),
      fromDec,
      toDec
    );
  }

  const handleFaucetMint = async () => {
    if (!faucetAmount || isNaN(Number(faucetAmount)) || Number(faucetAmount) <= 0) return;
    const tokenAddr = TOKEN_ADDRESSES[faucetToken];
    const dec = TOKEN_DECIMALS[faucetToken];
    if (!tokenAddr) return;

    await mintTokens(tokenAddr, faucetAmount, dec);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Convert Stablecoins</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 text-white">SXCP Cross-Stablecoin Conversion</h2>
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
                    className="bg-transparent text-2xl font-bold w-full focus:outline-none text-white"
                  />
                  <select
                    value={fromToken}
                    onChange={(e) => setFromToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="USDT">USDT</option>
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
                  <p className="text-2xl font-bold text-white">{netOutput.toFixed(2)}</p>
                  <select
                    value={toToken}
                    onChange={(e) => setToToken(e.target.value)}
                    className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none"
                  >
                    <option value="USDC">USDC</option>
                    <option value="USDT">USDT</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleConvert}
              disabled={isPending || !amount || isNaN(Number(amount)) || Number(amount) <= 0}
              className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-bold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Processing Trade...' : 'Convert'}
            </button>

            {isSuccess && (
              <p className="text-emerald-400 text-sm mt-2 text-center font-semibold">
                Trade submitted successfully! The conversion is pending settlement by the market maker.
              </p>
            )}
            {error && (
              <p className="text-red-400 text-sm mt-2 text-center font-semibold text-wrap break-words">
                Error executing conversion: {error.message}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white">Conversion Details</h2>
            {amount ? (
              <div className="space-y-3">
                <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-neutral-300">Gross Output</p>
                      <p className="text-xs text-neutral-500">Rate: 1 {fromToken} = {rate} {toToken}</p>
                    </div>
                    <p className="font-semibold text-neutral-300">{formatCurrency(grossOutput)}</p>
                  </div>
                </div>
                {fromToken !== toToken ? (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-amber-400">SXCP Fee (12%)</p>
                        <p className="text-xs text-neutral-500">Protocol treasury</p>
                      </div>
                      <p className="font-semibold text-amber-400">-{formatCurrency(fee)}</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-neutral-300">SXCP Fee</p>
                        <p className="text-xs text-neutral-500">Same token · 0% fee</p>
                      </div>
                      <p className="font-semibold text-neutral-300">$0.00</p>
                    </div>
                  </div>
                )}
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-white">Net Output</p>
                    <p className="text-2xl font-bold text-amber-400">{formatCurrency(netOutput)} {toToken}</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-neutral-400 text-sm">Enter an amount to see conversion details</p>
            )}
          </div>

          {/* Testnet Faucet Card */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl transform translate-x-8 -translate-y-8" />
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-500/15 p-2 rounded-lg text-amber-400">
                <Coins className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold text-white">Testnet Faucet</h2>
            </div>
            <p className="text-sm text-neutral-400 mb-6">
              Need tokens for testing? Mint mock stablecoins directly to your connected wallet address on Hoodi.
            </p>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Asset</label>
                  <select
                    value={faucetToken}
                    onChange={(e) => setFaucetToken(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-700"
                  >
                    <option value="USDT">USDT</option>
                    <option value="USDC">USDC</option>
                    <option value="DAI">DAI</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1.5">Amount</label>
                  <input
                    type="number"
                    value={faucetAmount}
                    onChange={(e) => setFaucetAmount(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-neutral-700"
                  />
                </div>
              </div>
              <button
                onClick={handleFaucetMint}
                disabled={isMinting || !faucetAmount || isNaN(Number(faucetAmount)) || Number(faucetAmount) <= 0}
                className="w-full bg-neutral-800 hover:bg-neutral-700 text-white font-semibold py-2.5 rounded-lg text-sm transition disabled:opacity-50"
              >
                {isMinting ? 'Minting...' : 'Mint Testnet Tokens'}
              </button>

              {isMintSuccess && (
                <p className="text-emerald-400 text-xs text-center font-semibold mt-1">
                  Successfully minted {faucetAmount} {faucetToken} to your wallet!
                </p>
              )}
              {mintError && (
                <p className="text-red-400 text-xs text-center font-semibold mt-1 text-wrap break-words">
                  Minting failed: {mintError.message}
                </p>
              )}
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white">SXEP Conversion</h2>
            <p className="text-sm text-neutral-400 mb-4">5% fee in SXYT for $SXYT → crypto conversion</p>
            <div className="space-y-3">
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-1">$SXYT → USDC</p>
                <p className="font-semibold text-neutral-300">5% fee in SXYT · Full USDC received</p>
              </div>
              <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4">
                <p className="text-sm text-neutral-400 mb-1">$SXYT → ETH</p>
                <p className="font-semibold text-neutral-300">5% fee in SXYT · Full ETH received</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
