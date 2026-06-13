import { useState } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { isSupportedChain } from '@/lib/chains';

const ERC20_MINT_ABI = [
  "function mint(address to, uint256 amount) external"
];

export function useMint() {
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mintTokens = async (
    tokenAddress: string,
    amountStr: string,
    decimals: number
  ) => {
    setIsPending(true);
    setIsSuccess(false);
    setError(null);

    try {
      if (!(window as any).ethereum) {
        throw new Error("MetaMask is not installed");
      }

      const provider = new BrowserProvider((window as any).ethereum);
      const network = await provider.getNetwork();
      if (!isSupportedChain(Number(network.chainId))) {
        throw new Error('Please switch your wallet network to Base Sepolia or Hoodi.');
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      const tokenContract = new Contract(tokenAddress, ERC20_MINT_ABI, signer);
      const amount = ethers.parseUnits(amountStr, decimals);

      console.log(`Minting ${amountStr} tokens...`);
      const tx = await tokenContract.mint(userAddress, amount, {
        gasLimit: 15_000_000
      });

      console.log("Transaction sent:", tx.hash);
      await tx.wait();
      console.log("Minting complete!");

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Minting failed:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  return {
    mintTokens,
    isPending,
    isSuccess,
    error
  };
}
