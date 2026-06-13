import { useState } from 'react';
import { useBuyStables } from '../hooks/useBuyStables';
import { useAccount, useBalance } from 'wagmi';

export default function BuyStablesComponent() {
    const [ethAmount, setEthAmount] = useState<string>('');
    const { buyStables, isPending, isSuccess, error } = useBuyStables();
    const { address } = useAccount();
    const { data: ethBalance } = useBalance({ address });

    const handleBuy = () => {
        if (!ethAmount || isNaN(Number(ethAmount))) return;
        buyStables(ethAmount);
    };

    return (
        <div className="p-6 border rounded-lg shadow-sm bg-white max-w-sm">
            <h2 className="text-xl font-bold mb-4">Buy USDC</h2>
            <p className="text-sm text-gray-500 mb-4">
                Send ETH to receive USDC directly into your SXUA vault.
            </p>

            {address && (
                <p className="text-sm font-medium text-gray-700 mb-4">
                    Wallet Balance: {ethBalance ? Number(ethBalance.formatted).toFixed(4) : '0.0000'} ETH
                </p>
            )}

            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    value={ethAmount}
                    onChange={(e) => setEthAmount(e.target.value)}
                    placeholder="Amount in ETH"
                    className="border p-2 flex-grow rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    onClick={handleBuy}
                    disabled={isPending}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded disabled:opacity-50"
                >
                    {isPending ? 'Processing...' : 'Buy'}
                </button>
            </div>

            {isSuccess && <p className="text-green-600 text-sm">Purchase successful! Stables deposited to vault.</p>}
            {error && <p className="text-red-500 text-sm">Error: {(error as Error).message}</p>}
        </div>
    );
}