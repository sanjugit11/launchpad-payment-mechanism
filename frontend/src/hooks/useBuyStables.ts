import { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseEther, formatEther } from 'ethers';

const SX_BUY_STABLES_ADDRESS = import.meta.env.VITE_SX_BUY_STABLES_ADDRESS || "0x1FF4fb43a413B0cCc866675A177FD84c53a3055F";
const USDC_ADDRESS = import.meta.env.VITE_USDC_ADDRESS || "0xEC1B5cc25b5Eb1474b6054740f7f6EBaF45C49A3";

const SXBuyStablesABI = [
    "function buyStables(address stablecoin) external payable",
    "function ethToUsdRate() external view returns (uint256)",
    "function owner() external view returns (address)",
    "function setEthToUsdRate(uint256 _newRate) external",
    "function setSXSE(address _sxse) external",
    "function setSXUA(address _sxua) external",
    "function setSxcpTreasury(address _sxcpTreasury) external",
    "function setSXMM(address _sxmm) external",
    "function setPtfReceiver(address _ptfReceiver) external",
    "function sxse() external view returns (address)",
    "function sxua() external view returns (address)",
    "function sxcpTreasury() external view returns (address)",
    "function sxmm() external view returns (address)",
    "function ptfReceiver() external view returns (address)"
];

export function useBuyStables() {
    const [isPending, setIsPending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [ethToUsdRate, setEthToUsdRate] = useState<number>(3500);

    const [owner, setOwner] = useState<string>('');
    const [configAddresses, setConfigAddresses] = useState<any>({});

    const buyStables = async (ethAmount: string) => {
        setIsPending(true);
        setIsSuccess(false);
        setError(null);

        try {
            if (!(window as any).ethereum) {
                throw new Error("MetaMask is not installed");
            }

            const provider = new BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new Contract(SX_BUY_STABLES_ADDRESS, SXBuyStablesABI, signer);

            console.log("Sending transaction via ethers...");
            const tx = await contract.buyStables(USDC_ADDRESS, {
                value: parseEther(ethAmount),
                gasLimit: 15_000_000 // Keep safely under Hoodi gas limit
            });

            console.log("Transaction sent:", tx.hash);
            await tx.wait();
            console.log("Transaction confirmed!");
            
            setIsSuccess(true);
        } catch (err: any) {
            console.error("Transaction failed:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsPending(false);
        }
    };

    const updateRate = async (newRateStr: string) => {
        setIsPending(true);
        try {
            const provider = new BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new Contract(SX_BUY_STABLES_ADDRESS, SXBuyStablesABI, signer);
            const tx = await contract.setEthToUsdRate(parseEther(newRateStr), { gasLimit: 15_000_000 });
            await tx.wait();
            fetchRate();
            setIsSuccess(true);
        } catch (err: any) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsPending(false);
        }
    };

    const updateConfigAddress = async (
        fnName: 'setSXSE' | 'setSXUA' | 'setSxcpTreasury' | 'setSXMM' | 'setPtfReceiver',
        newAddress: string
    ) => {
        setIsPending(true);
        try {
            const provider = new BrowserProvider((window as any).ethereum);
            const signer = await provider.getSigner();
            const contract = new Contract(SX_BUY_STABLES_ADDRESS, SXBuyStablesABI, signer);
            const tx = await contract[fnName](newAddress, { gasLimit: 15_000_000 });
            await tx.wait();
            fetchRate();
            setIsSuccess(true);
        } catch (err: any) {
            setError(err instanceof Error ? err : new Error(String(err)));
        } finally {
            setIsPending(false);
        }
    };

    const fetchRate = async () => {
        try {
            if ((window as any).ethereum) {
                const provider = new BrowserProvider((window as any).ethereum);
                const contract = new Contract(SX_BUY_STABLES_ADDRESS, SXBuyStablesABI, provider);
                const rateRaw = await contract.ethToUsdRate();
                setEthToUsdRate(parseFloat(formatEther(rateRaw)));
                
                const contractOwner = await contract.owner();
                setOwner(contractOwner);

                const sxse = await contract.sxse();
                const sxua = await contract.sxua();
                const sxcpTreasury = await contract.sxcpTreasury();
                const sxmm = await contract.sxmm();
                const ptfReceiver = await contract.ptfReceiver();
                
                setConfigAddresses({
                    sxse, sxua, sxcpTreasury, sxmm, ptfReceiver
                });
            }
        } catch (err) {
            console.error("Failed to fetch rate:", err);
        }
    };

    useEffect(() => {
        fetchRate();
        const interval = setInterval(fetchRate, 15000);
        return () => clearInterval(interval);
    }, []);

    return {
        buyStables,
        updateRate,
        updateConfigAddress,
        ethToUsdRate,
        owner,
        configAddresses,
        isPending,
        isSuccess,
        error
    };
}
