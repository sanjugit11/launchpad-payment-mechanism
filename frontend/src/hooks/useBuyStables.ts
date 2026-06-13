import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseAbi } from 'viem';

const SX_BUY_STABLES_ADDRESS = (import.meta.env.VITE_SX_BUY_STABLES_ADDRESS || "0x03e0cbfFcc6e75a02601a73e61ca2a5BA12c7A24") as `0x${string}`;
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || "0x6956CB8346A494eE095Df2358b01Da4445674f2E") as `0x${string}`;
const HOODI_GAS_LIMIT = 15_000_000n; // Safe gas cap for Hoodi network

const SXBuyStablesABI = parseAbi([
    "function buyStables(address stablecoin) external payable"
]);

export function useBuyStables() {
    const { writeContract, data: hash, error: writeError, isPending: isWritePending } = useWriteContract();

    const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
        hash,
    });

    const buyStables = (ethAmount: string) => {
        writeContract({
            address: SX_BUY_STABLES_ADDRESS,
            abi: SXBuyStablesABI,
            functionName: 'buyStables',
            args: [USDC_ADDRESS],
            value: parseEther(ethAmount),
            gas: HOODI_GAS_LIMIT,
        });
    };

    return {
        buyStables,
        isPending: isWritePending || isConfirming,
        isSuccess: isConfirmed,
        error: writeError || receiptError
    };
}