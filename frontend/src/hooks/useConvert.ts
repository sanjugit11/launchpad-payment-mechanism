import { useState } from 'react';
import { BrowserProvider, Contract, ethers } from 'ethers';
import { TARGET_CHAIN_ID, useContractAddresses } from '@/lib/chains';

const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function decimals() external view returns (uint8)"
];

const SXEP_ABI = [
  "function executeTrade(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOutExpected) external returns (uint256)"
];

export function useConvert() {
  const addresses = useContractAddresses();
  const SX_EXCHANGE_ADDRESS = addresses.SXEP;
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const convertStables = async (
    fromTokenAddress: string,
    toTokenAddress: string,
    amountStr: string,
    amountOutStr: string,
    fromDecimals: number,
    toDecimals: number
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
      if (Number(network.chainId) !== TARGET_CHAIN_ID) {
        throw new Error(`Please switch your wallet network to the correct Testnet (Chain ID: ${TARGET_CHAIN_ID}) to convert stablecoins.`);
      }

      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Separate read-only instance connected to provider to bypass Hoodi RPC "from" address nonce check bug
      const tokenInContractReadOnly = new Contract(fromTokenAddress, ERC20_ABI, provider);
      const tokenInContractWrite = new Contract(fromTokenAddress, ERC20_ABI, signer);
      const exchangeContract = new Contract(SX_EXCHANGE_ADDRESS, SXEP_ABI, signer);

      // Parse amounts based on native token decimals
      const amountIn = ethers.parseUnits(amountStr, fromDecimals);
      const amountOutExpected = ethers.parseUnits(amountOutStr, toDecimals);

      // Check current allowance using read-only instance
      console.log("Checking allowance for exchange contract...");
      const currentAllowance = await tokenInContractReadOnly.allowance(userAddress, SX_EXCHANGE_ADDRESS);

      if (currentAllowance < amountIn) {
        console.log("Approving exchange contract...");
        const approveTx = await tokenInContractWrite.approve(SX_EXCHANGE_ADDRESS, ethers.MaxUint256, {
          gasLimit: 15_000_000
        });
        await approveTx.wait();
        console.log("Approval successful");
      }

      // Execute Trade
      console.log("Executing trade...");
      const tradeTx = await exchangeContract.executeTrade(
        fromTokenAddress,
        toTokenAddress,
        amountIn,
        amountOutExpected,
        {
          gasLimit: 15_000_000 // Ensure we don't trigger gas cap errors on Hoodi
        }
      );

      console.log("Transaction sent:", tradeTx.hash);
      await tradeTx.wait();
      console.log("Trade successfully executed/submitted!");

      setIsSuccess(true);
    } catch (err: any) {
      console.error("Conversion failed:", err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  return {
    convertStables,
    isPending,
    isSuccess,
    error
  };
}
