import { useState, useEffect } from 'react';
import { useAccount, useContractWrite, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, parseAbi } from 'viem';

const SXUA_ADDRESS = (import.meta.env.VITE_SXUA_ADDRESS || "0xe24275b09B7eABf3491B6705D00D108421626429") as `0x${string}`;
const USDC_ADDRESS = (import.meta.env.VITE_USDC_ADDRESS || "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3") as `0x${string}`;

const SXUA_ABI = parseAbi([
  "function withdraw(address token, uint256 amount) external",
  "function uncommittedBalances(address user, address token) view returns (uint256)",
  "function committedBalances(address user, address token) view returns (uint256)",
]);

export function useWithdraw() {
  const { address } = useAccount();
  const [withdrawType, setWithdrawType] = useState<'uncommitted' | 'committed'>('uncommitted');
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');
  const [error, setError] = useState('');

  // For uncommitted withdrawals
  const { writeContract: withdrawUncommitted, data: withdrawHash, isPending: isWithdrawPending } = useContractWrite();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: withdrawHash,
  });

  const getBalance = async () => {
    if (!address) return;

    try {
      // This is a placeholder - actual implementation would use wagmi's useReadContract or ethers
      // For now, we'll set up the structure for the hook
      setBalance('0');
    } catch (err) {
      console.error('Error fetching balance:', err);
    }
  };

  useEffect(() => {
    getBalance();
  }, [address, withdrawType]);

  const handleWithdraw = async () => {
    if (!address || !amount) {
      setError('Please enter an amount');
      return;
    }

    if (withdrawType === 'uncommitted') {
      const amountInWei = parseEther(amount);

      withdrawUncommitted({
        address: SXUA_ADDRESS,
        abi: SXUA_ABI,
        functionName: 'withdraw',
        args: [USDC_ADDRESS, amountInWei],
      });
    } else {
      // For committed - we may need to implement a separate function in the contract
      setError('Committed withdrawal requires contract update');
    }
  };

  return {
    withdrawType,
    setWithdrawType,
    amount,
    setAmount,
    balance,
    error,
    setError,
    handleWithdraw,
    isPending: isWithdrawPending || isConfirming,
    isSuccess: isConfirmed,
  };
}
