"use client";

import React, { ChangeEvent, useState } from 'react';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { toast } from "sonner";
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { getHeaderLayout } from '@/components/header-layout';
import WalletsDrawer from '@/components/sidebar-drawer';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ClipLoader } from "react-spinners";
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';

const BumpBot = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);

    // State for wallets
    const [wallets, setWallets] = useState<WalletEntry[]>([]);

    // State for form data
    const [formData, setFormData] = useState({
        tokenAddress: '',
        buyAmount: '0.01',
        sellAmount: '0.01',
        BlockEngineSelection: BlockEngineLocation[2],
        BundleTip: '0.01',
        TransactionTip: '0.00001',
    });

    // Mode selection
    const [isJitoBundle, setIsJitoBundle] = useState(false);
    const [botMode, setBotMode] = useState<'buy-sell' | 'buy-only' | 'sell-only'>('buy-sell');

    // Loading state
    const [isLoading, setIsLoading] = useState(false);
    const [isBotRunning, setIsBotRunning] = useState(false);
    const [walletBalances, setWalletBalances] = useState<Array<{ balance: string, publicKey: string }>>([]);

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    // Handle select field changes
    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    // Handle wallet state change
    const handleWalletsChange = (walletData: Array<{ wallet: string; solAmount: number }>) => {
        console.log('Updated wallet data:', walletData);
    };

    // Start/Stop bot
    const toggleBot = async () => {
        if (isBotRunning) {
            setIsBotRunning(false);
            toast.info("Bot stopped");
            return;
        }

        // Validate inputs
        if (!formData.tokenAddress) {
            toast.error("Token address is required");
            return;
        }

        if (wallets.length === 0) {
            toast.error("Please add at least one wallet");
            return;
        }

        try {
            setIsLoading(true);

            // Validate token address
            try {
                new PublicKey(formData.tokenAddress);
            } catch (error) {
                toast.error("Invalid token address");
                setIsLoading(false);
                return;
            }

            // Fetch wallet balances for preview
            const balances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));
                        const solBalance = await connection.getBalance(keypair.publicKey);
                        return {
                            balance: (solBalance / LAMPORTS_PER_SOL).toFixed(4) + " SOL",
                            publicKey: keypair.publicKey.toString()
                        };
                    } catch (error) {
                        return { balance: "Error", publicKey: "Invalid wallet" };
                    }
                })
            );

            setWalletBalances(balances);

            // Start the bot (in a real implementation, this would initiate continuous transactions)
            setIsBotRunning(true);
            toast.success(`Bump Bot started in ${botMode} mode with ${wallets.length} wallets`);

            // Here would be the bot's actual functionality
            // This is a placeholder for now

        } catch (error) {
            console.error("Error starting bot:", error);
            toast.error("Failed to start bot: " + (error instanceof Error ? error.message : "Unknown error"));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="mb-8 mx-8 flex mt-8 justify-center items-center relative">
            {isLoading && (
                <div className="absolute top-0 left-0 z-50 flex h-screen w-full items-center justify-center bg-black/[.3] backdrop-blur-[10px]">
                    <ClipLoader />
                </div>
            )}

            <div className="">
                <div className="">
                    <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                        {/* Left column - Main form inputs */}
                        <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl">
                            <div>
                                <p className='font-bold text-[25px]'>Bump Bot</p>
                                <p className='text-[12px] text-[#96989c]'>Automated buying and selling to generate volume for a token</p>
                            </div>

                            <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center">
                                <h3 className="btn-text-gradient font-bold text-[15px] mb-3">
                                    Add Wallets
                                </h3>
                                <WalletInput
                                    wallets={wallets}
                                    setWallets={setWallets}
                                    Mode={100}
                                    maxWallets={100}
                                    onChange={handleWalletsChange}
                                    onWalletsUpdate={(walletData) => {
                                        console.log('Updated wallet data:', walletData);
                                    }}
                                />
                            </div>

                            <div className='w-full'>
                                <InputField
                                    id="tokenAddress"
                                    label="Token Address"
                                    subfield='SPL token address for trading'
                                    value={formData.tokenAddress}
                                    onChange={(e) => handleChange(e, 'tokenAddress')}
                                    placeholder="Enter token address"
                                    type="text"
                                    required={true}
                                />
                            </div>

                            <JitoBundleSelection
                                isJitoBundle={isJitoBundle}
                                setIsJitoBundle={setIsJitoBundle}
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectionChange={handleSelectionChange}
                            />

                            <div className="border rounded-lg p-4 border-gray-600">
                                <h3 className="text-sm font-medium text-white mb-4">Bot Mode</h3>

                                <RadioGroup
                                    defaultValue="buy-sell"
                                    className="flex flex-col space-y-2"
                                    value={botMode}
                                    onValueChange={(value: string) => setBotMode(value as 'buy-sell' | 'buy-only' | 'sell-only')}
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="buy-sell" id="buy-sell" />
                                        <Label htmlFor="buy-sell">Same Transaction Buy and Sell</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="buy-only" id="buy-only" />
                                        <Label htmlFor="buy-only">Only Buy</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="sell-only" id="sell-only" />
                                        <Label htmlFor="sell-only">Only Sell</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField
                                    id="buyAmount"
                                    label="Buy Amount (SOL)"
                                    value={formData.buyAmount}
                                    onChange={(e) => handleChange(e, 'buyAmount')}
                                    placeholder="0.01"
                                    type="number"
                                    required={botMode === 'buy-sell' || botMode === 'buy-only'}
                                    disabled={botMode === 'sell-only'}
                                />

                                <InputField
                                    id="sellAmount"
                                    label="Sell Amount (%)"
                                    value={formData.sellAmount}
                                    onChange={(e) => handleChange(e, 'sellAmount')}
                                    placeholder="50"
                                    type="number"
                                    required={botMode === 'buy-sell' || botMode === 'sell-only'}
                                    disabled={botMode === 'buy-only'}
                                />
                            </div>

                            <div className='justify-center'>
                                <button
                                    type="button"
                                    onClick={toggleBot}
                                    disabled={isLoading}
                                    className={`text-center w-full ${isBotRunning ? 'bg-red-500 hover:bg-red-600' : 'invoke-btn'}`}
                                >
                                    <span className={`${isBotRunning ? 'text-white font-bold' : 'btn-text-gradient font-bold'}`}>
                                        {isLoading ? (
                                            <span className='italic font-i ellipsis'>Processing...</span>
                                        ) : isBotRunning ? (
                                            'Stop Bot'
                                        ) : (
                                            <>
                                                Start Bump Bot
                                                <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(0.50 Bundler Cost)</span>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Right column - Status and Info */}
                        <div className="min-w-[44px] p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
                            <div>
                                <div className="flex justify-between items-center w-full">
                                    <p className='font-bold text-[25px]'>Bot Status</p>
                                    <div className={`w-3 h-3 rounded-full ${isBotRunning ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                                </div>
                                <p className='text-[12px] text-[#96989c] mb-4'>Current bot configuration and status</p>

                                <div className="bg-black/20 rounded-lg p-3 mb-4">
                                    <h3 className="text-sm font-medium text-white mb-2">Configuration</h3>
                                    <p className="text-xs text-gray-300">
                                        <span className="font-medium">Mode:</span> {botMode === 'buy-sell' ? 'Buy and Sell' : botMode === 'buy-only' ? 'Buy Only' : 'Sell Only'}
                                    </p>
                                    <p className="text-xs text-gray-300">
                                        <span className="font-medium">Transaction Type:</span> {isJitoBundle ? 'Jito Bundles' : 'Regular Transactions'}
                                    </p>
                                    <p className="text-xs text-gray-300">
                                        <span className="font-medium">Wallets:</span> {wallets.length}
                                    </p>
                                    {formData.tokenAddress && (
                                        <p className="text-xs text-gray-300 truncate">
                                            <span className="font-medium">Token:</span> {formData.tokenAddress.slice(0, 8)}...{formData.tokenAddress.slice(-8)}
                                        </p>
                                    )}
                                </div>

                                <div className='w-full'>
                                    <label className="block text-base text-white font-semibold">
                                        Wallet Status:
                                    </label>
                                    <br />
                                    <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                        {walletBalances.length > 0 ? (
                                            walletBalances.slice(0, 5).map(({ balance, publicKey }, index) => (
                                                <a
                                                    key={index}
                                                    href={`https://solscan.io/account/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-[300px] bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[10px] select-text"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[15px] font-normal'>
                                                            {index + 1}:
                                                        </span>
                                                        {publicKey.slice(0, 6)}...{publicKey.slice(-6)}
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>Balance: {balance}</span>
                                                        <br />
                                                    </p>
                                                </a>
                                            ))
                                        ) : (
                                            <p className="text-[#96989c] text-sm">No wallets loaded or bot not started</p>
                                        )}

                                        {walletBalances.length > 5 && (
                                            <p className="text-[#96989c] text-xs mt-2">
                                                + {walletBalances.length - 5} more wallets
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {isBotRunning && (
                                    <div className="mt-6 border-t border-gray-700 pt-4">
                                        <h3 className="text-sm font-medium text-white mb-2">Statistics</h3>
                                        <p className="text-xs text-gray-300">
                                            <span className="font-medium">Running Time:</span> 00:00:00
                                        </p>
                                        <p className="text-xs text-gray-300">
                                            <span className="font-medium">Transactions:</span> 0
                                        </p>
                                        <p className="text-xs text-gray-300">
                                            <span className="font-medium">Volume Generated:</span> 0 SOL
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className='absolute -top-[70px] right-0 h-screen'>
                <WalletsDrawer />
            </div>
        </div>
    );
};

// Apply the header layout
BumpBot.getLayout = (page: React.ReactNode) => getHeaderLayout(page, "Pump.Fun Bump Bot");

export default BumpBot; 