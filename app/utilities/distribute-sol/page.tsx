"use client"
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import React, { FC, useState, useEffect, ChangeEvent } from "react";
import { toast } from "sonner";
import { useNetworkConfiguration } from "@/components/context/NetworkConfigurationProvider";
import { FaInfoCircle } from "react-icons/fa";
import WalletAddressInput, { WalletEntry } from "@/components/instructions/pump-bundler/wallet-input";
import { distributeSol } from "@/components/instructions/tokenDistributor/distribute-sol";
import JitoBundleSelection from "@/components/ui/jito-bundle-selection";

// Tooltip component for additional information
const Tooltip: FC<{ title: string; description: string }> = ({ title, description }) => {
    return (
        <div className="group relative inline-block ml-2">
            <FaInfoCircle className="text-gray-400 cursor-pointer" />
            <div className="absolute left-0 mt-2 w-64 p-3 bg-[#232323] text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-lg border border-gray-700">
                <p className="font-semibold mb-1">{title}</p>
                <p>{description}</p>
            </div>
        </div>
    );
};

const SOLDistributor: FC = () => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const { publicKey, signAllTransactions } = wallet;
    const { networkConfiguration } = useNetworkConfiguration();

    const [isLoading, setIsLoading] = useState(false);
    const [solBalance, setSolBalance] = useState(0);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [blockEngine, setBlockEngine] = useState("mainnet-beta-jito-api.bundlr.network");
    const [bundleTip, setBundleTip] = useState("0.01");
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [formData, setFormData] = useState({
        BlockEngineSelection: "",
        BundleTip: "",
        TransactionTip: ""
    });

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }


    // Fetch user's SOL balance
    useEffect(() => {
        if (!publicKey) return;

        const fetchBalance = async () => {
            try {
                const balance = await connection.getBalance(publicKey);
                setSolBalance(balance / LAMPORTS_PER_SOL);
            } catch (error) {
                console.error("Error fetching SOL balance:", error);
                toast.error("Failed to fetch SOL balance");
            }
        };

        fetchBalance();
    }, [publicKey, connection]);

    // Handle wallets entry update
    const handleWalletsUpdate = (updatedWallets: Array<{ wallet: string; solAmount: number }>) => {
        // Convert to proper format for internal state
        const convertedWallets = updatedWallets.map(w => ({
            wallet: w.wallet,
            solAmount: w.solAmount.toString()
        }));
        setWallets(convertedWallets);
    };

    // Validate wallet address
    const validateWalletAddress = (address: string): boolean => {
        try {
            new PublicKey(address);
            return true;
        } catch (error) {
            return false;
        }
    };

    // Handle distribute button click
    const handleDistribute = async () => {
        if (!publicKey || !signAllTransactions) {
            toast.error("Please connect your wallet");
            return;
        }

        // Validate receiving wallets
        const validWallets = wallets.filter(entry => validateWalletAddress(entry.wallet));
        if (validWallets.length === 0) {
            toast.error("Please add at least one valid receiving wallet");
            return;
        }

        setIsLoading(true);
        try {
            // Prepare addresses and amounts 
            const addresses = validWallets.map(entry => entry.wallet);
            const amounts = validWallets.map(entry => parseFloat(entry.solAmount));

            // Prepare form data
            const formData = {
                addresses,
                amounts,
                distribution: "fixed", // Using fixed amounts from wallet entries
                BlockEngineSelection: blockEngine,
                BundleTip: bundleTip
            };

            // Call distributeSol function
            const bundleIds = await distributeSol(connection, wallet, formData);

            toast.success(`SOL distribution complete! ${bundleIds.length} bundles sent.`);
        } catch (error) {
            console.error("Error distributing SOL:", error);
            toast.error(`Failed to distribute SOL: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsLoading(false);
        }
    };



    return (
        <div className="container mx-auto max-w-5xl p-4">
            <h1 className="text-3xl font-bold mb-6">SOL Distributor</h1>


            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">SOL Distribution Settings</h2>

                    {publicKey && (
                        <div className="text-sm text-zinc-400">
                            Your SOL Balance: <span className="font-bold text-white">{solBalance.toFixed(4)} SOL</span>
                        </div>
                    )}
                </div>

                <div className="w-full">
                    <JitoBundleSelection
                        isJitoBundle={isJitoBundle}
                        setIsJitoBundle={setIsJitoBundle}
                        formData={formData}
                        handleChange={handleChange}
                        handleSelectionChange={handleSelectionChange}
                    />
                </div>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">Receiving Wallets</h2>
                <p className="text-sm text-zinc-400 mb-4">
                    Add wallet addresses and specify the SOL amount for each wallet.
                </p>

                <WalletAddressInput
                    Mode={0}
                    walletType="publicKeys"
                    wallets={wallets}
                    setWallets={setWallets}
                    onWalletsUpdate={handleWalletsUpdate}
                />

                <div className="mt-6">
                    <button
                        onClick={handleDistribute}
                        disabled={isLoading || !publicKey || wallets.length === 0}
                        className={`w-full py-3 px-4 rounded-md font-medium ${isLoading || !publicKey || wallets.length === 0
                            ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                            } transition-colors`}
                    >
                        {isLoading ? "Processing..." : "Distribute SOL"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SOLDistributor; 