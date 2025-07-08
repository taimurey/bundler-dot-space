'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { ReactNode } from 'react';
import {
    MAINNET_PROGRAM_ID,
} from '@raydium-io/raydium-sdk';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { toast } from "sonner";
import { BundleToast } from '@/components/bundler-toasts';
import { BalanceType } from '@/components/types/solana-types';
import { truncate } from '@/components/sidebar-drawer';
import { PumpSeller } from '@/components/instructions/pump-bundler/PumpSeller';
import WalletInput from '@/components/instructions/pump-bundler/wallet-input';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { InputField } from '@/components/ui/input-field';
import { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { getHeaderLayout } from '@/components/header-layout';
import JitoBundleSelection, { BlockEngineLocation } from '@/components/ui/jito-bundle-selection';

const ZERO = new BN(0)
type BN = typeof ZERO

const PumpfunSell = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [Mode, setMode] = useState(1);
    const [isJitoBundle, setIsJitoBundle] = useState(true);

    const [formData, setFormData] = useState<{
        tokenAddress: string;
        Wallets: string[];
        feeKeypair: string;
        SellPercentage: string;
        GoalSolAmount: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
    }>({
        tokenAddress: '',
        Wallets: [],
        feeKeypair: '',
        SellPercentage: '',
        GoalSolAmount: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
    });

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));

        if (field === 'deployerPrivateKey') {
            try {
                const wallet = (Keypair.fromSecretKey(new Uint8Array(base58.decode(value))));
                console.log(wallet.publicKey);
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }

            setFormData(prevState => ({
                ...prevState,
                deployerPrivateKey: value,
            }));
        }

        if (field === 'buyerPrivateKey') {
            try {
                const wallet = ((Keypair.fromSecretKey(new Uint8Array(base58.decode(value)))));
                console.log(wallet.publicKey);
            } catch (error) {
                toast.error('Invalid Private Key');
                return;
            }
        }
    };

    const handleSubmission = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate form inputs
        if (wallets.length === 0) {
            toast.error('No wallets loaded');
            return;
        }

        if (!formData.tokenAddress) {
            toast.error('Please enter a token address');
            return;
        }

        if (!formData.SellPercentage) {
            toast.error('Please enter a sell percentage');
            return;
        }

        if (!formData.GoalSolAmount) {
            toast.error('Please enter a goal SOL amount');
            return;
        }

        try {
            // Call the PumpSeller function to process the wallets
            const bundleResults = await PumpSeller(
                connection,
                wallets,
                formData.feeKeypair,
                formData.tokenAddress,
                formData.SellPercentage,
                formData.BundleTip,
                formData.BlockEngineSelection
            );

            // Display success toast for each bundle result
            bundleResults.forEach((result) => {
                toast(
                    () => (
                        <BundleToast
                            txSig={result}
                            message={'Bundle ID:'}
                        />
                    ),
                    { duration: 5000 }
                );
            });
        } catch (error) {
            console.error('Error during submission:', error);
            toast.error(`Error bundling: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            const balances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        console.log('wallet:', wallet.wallet);
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));

                        // Fetch SOL balance
                        const solBalance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));

                        // Fetch token balance if tokenAddress is provided
                        let tokenBalance = '0';
                        if (formData.tokenAddress) {
                            try {
                                const tokenMint = new PublicKey(formData.tokenAddress);
                                const tokenAccount = getAssociatedTokenAddressSync(tokenMint, keypair.publicKey);
                                const balance = await connection.getTokenAccountBalance(tokenAccount);
                                tokenBalance = balance.value.amount;
                            } catch (error) {
                                console.error(`Error fetching token balance for wallet ${keypair.publicKey.toString()}:`, error);
                            }
                        }

                        return { balance: solBalance, publicKey: keypair.publicKey.toString(), tokenAmount: tokenBalance };
                    } catch (error) {
                        toast.error(`Error fetching balance: ${error}`);
                        return { balance: 0, publicKey: 'Invalid', tokenAmount: '0' };
                    }
                })
            );

            setFormData(prevState => ({
                ...prevState,
                buyerextraWallets: wallets.map(wallet => wallet.wallet),
            }));

            allBalances = [...allBalances, ...balances];
            setBalances(allBalances);

            // Update wallets with token balances
            const updatedWallets = wallets.map((wallet, index) => ({
                ...wallet,
                tokenAmount: balances[index].tokenAmount || '0',
            }));
            setWallets(updatedWallets);
        };

        fetchBalances();
    }, [wallets, formData.tokenAddress]);

    return (
        <div className="flex py-1 justify-center items-start relative max-w-[100vw]">
            <form className="w-full max-w-[1400px]">
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 h-full">
                    {/* Left Column - Main Form */}
                    <div className="xl:col-span-2 space-y-3">
                        {/* Header Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <p className='font-bold text-[20px]'>Pump.fun Token Manager</p>
                                    <p className='text-[11px] text-[#96989c]'>Sell your pump.fun tokens in bulk with advanced bundling</p>
                                </div>
                                <div className="md:w-1/3">
                                    <label className="block text-sm text-white font-semibold mb-1">Mode</label>
                                    <select
                                        id="BlockEngineSelection"
                                        value={Mode}
                                        onChange={(e) => setMode(Number(e.target.value))}
                                        required={true}
                                        className="block w-full px-3 rounded-md text-sm border border-[#404040] text-white bg-input-boxes h-[35px] focus:outline-none focus:border-blue-500"
                                    >
                                        <option value="" disabled>Bundler Mode</option>
                                        {modeOptions.map((option, index) => (
                                            <option key={index} value={option.value}>
                                                {option.value} {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Wallet Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Wallet Configuration</h3>

                            <div className="space-y-3">
                                <InputField
                                    label="Fee Payer Wallet"
                                    subfield='Private key for transaction fees'
                                    id="feeKeypair"
                                    value={formData.feeKeypair}
                                    onChange={(e) => handleChange(e, 'feeKeypair')}
                                    placeholder="D5bBVBQ....aeVK5W"
                                    type="password"
                                    required={true}
                                />

                                {Mode > 1 && (
                                    <div>
                                        <label className="block text-sm text-white font-semibold mb-2">
                                            Multi-Wallet Configuration ({Mode} wallets)
                                        </label>
                                        <WalletInput
                                            wallets={wallets}
                                            setWallets={setWallets}
                                            Mode={Mode}
                                            maxWallets={Mode}
                                            onChange={(walletData) => {
                                                setFormData(prevState => ({
                                                    ...prevState,
                                                    buyerextraWallets: walletData.map(entry => entry.wallet),
                                                    buyerWalletAmounts: walletData.map(entry => entry.solAmount)
                                                }));
                                            }}
                                            onWalletsUpdate={(walletData) => {
                                                console.log('Updated wallet data:', walletData.map(entry => ({
                                                    wallet: entry.wallet,
                                                    solAmount: entry.solAmount,
                                                    lamports: entry.solAmount * LAMPORTS_PER_SOL
                                                })));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Token Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Token Configuration</h3>

                            <div className="flex flex-col md:flex-row gap-4">
                                <InputField
                                    id="tokenAddress"
                                    label="Token Mint Address"
                                    subfield='The pump.fun token to sell'
                                    value={formData.tokenAddress}
                                    onChange={(e) => handleChange(e, 'tokenAddress')}
                                    placeholder="D5bBVBQ....eVK5W"
                                    type="text"
                                    required={true}
                                />
                                <InputField
                                    label="Sell Percentage"
                                    subfield='% of tokens to sell from each wallet'
                                    id="SellPercentage"
                                    value={formData.SellPercentage}
                                    onChange={(e) => handleChange(e, 'SellPercentage')}
                                    placeholder="90"
                                    type="number"
                                    required={true}
                                />
                            </div>

                            <div className="mt-4">
                                <button
                                    className="text-center w-full invoke-btn"
                                    type="submit"
                                    id="formbutton"
                                    onClick={handleSubmission}
                                >
                                    <span className="btn-text-gradient font-bold">
                                        Execute Percentage Sell
                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(Sells % from all wallets)</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Limit Order Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Limit Order (Coming Soon)</h3>

                            <InputField
                                id="GoalSolAmount"
                                label="Goal SOL Amount"
                                subfield="Sell tokens when this SOL amount is reached"
                                value={formData.GoalSolAmount}
                                onChange={(e) => handleChange(e, 'GoalSolAmount')}
                                placeholder="50"
                                type="number"
                                required={true}
                            />

                            <div className="mt-4">
                                <button
                                    className="text-center w-full invoke-btn opacity-50 cursor-not-allowed"
                                    type="button"
                                    disabled={true}
                                    title="Coming Soon"
                                >
                                    <span className="btn-text-gradient font-bold">
                                        Setup Limit Order
                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">Coming Soon</span>
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Bundle Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Bundle Configuration</h3>

                            <JitoBundleSelection
                                isJitoBundle={isJitoBundle}
                                setIsJitoBundle={setIsJitoBundle}
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectionChange={handleSelectionChange}
                                snipeEnabled={false}
                                setSnipeEnabled={() => { }}
                                snipeAmount={''}
                                setSnipeAmount={() => { }}
                            />
                        </div>
                    </div>

                    {/* Right Column - Status Panel */}
                    <div className="xl:col-span-1 space-y-3">
                        {/* Wallet Status */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-600 rounded-xl shadow-2xl shadow-black sticky top-4">
                            <div className="mb-4">
                                <p className='font-bold text-[18px]'>Wallet Status</p>
                                <p className='text-[11px] text-[#96989c]'>Connected wallets and their balances</p>
                            </div>

                            <div className='mb-4'>
                                <label className="block text-sm text-white font-semibold mb-2">
                                    Active Wallets ({balances.length}):
                                </label>
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {balances.map((walletData, index) => (
                                        <a
                                            key={index}
                                            href={`https://solscan.io/account/${walletData.publicKey}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block p-3 bg-[#101010] rounded-md hover:bg-[#181818] transition-colors"
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className='text-[#96989c] text-xs'>#{index + 1}</span>
                                                <span className='text-xs text-gray-300'>{walletData.balance} SOL</span>
                                            </div>
                                            <div className="text-xs text-blue-400 font-mono mt-1">
                                                {truncate(walletData.publicKey, 6, 6)}
                                            </div>
                                            {formData.tokenAddress && (walletData as any).tokenAmount && (
                                                <div className="text-xs text-green-400 mt-1">
                                                    Token: {parseInt((walletData as any).tokenAmount).toLocaleString()}
                                                </div>
                                            )}
                                        </a>
                                    ))}
                                    {balances.length === 0 && (
                                        <div className="text-xs text-gray-500 italic p-2 text-center">
                                            No wallets loaded yet
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Sell Predictions */}
                            {formData.SellPercentage && balances.length > 0 && (
                                <div className='p-3 bg-[#101010] rounded-md'>
                                    <label className="block text-sm text-white font-semibold mb-2">
                                        Sell Predictions:
                                    </label>
                                    <div className="space-y-2 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Sell Percentage:</span>
                                            <span className="text-yellow-400">{formData.SellPercentage}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-400">Total Wallets:</span>
                                            <span className="text-gray-300">{balances.length}</span>
                                        </div>
                                        {formData.tokenAddress && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Token:</span>
                                                <span className="text-blue-400">{truncate(formData.tokenAddress, 4, 4)}</span>
                                            </div>
                                        )}
                                        {formData.GoalSolAmount && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-400">Goal SOL:</span>
                                                <span className="text-green-400">{formData.GoalSolAmount} SOL</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Bundle Info */}
                            <div className='mt-4 p-3 bg-[#101010] rounded-md'>
                                <label className="block text-sm text-white font-semibold mb-2">
                                    Bundle Information:
                                </label>
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Bundle Tip:</span>
                                        <span className="text-gray-300">{formData.BundleTip} SOL</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Transaction Tip:</span>
                                        <span className="text-gray-300">{formData.TransactionTip} SOL</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Block Engine:</span>
                                        <span className="text-gray-300">{formData.BlockEngineSelection}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

const modeOptions = [
    { value: 1, label: "Single Wallet Mode" },
    { value: 100, label: "Multi-Wallet Mode" },
];

PumpfunSell.getLayout = (page: ReactNode) => getHeaderLayout(page, "Pumpfun - Manage Tokens");

export default PumpfunSell;