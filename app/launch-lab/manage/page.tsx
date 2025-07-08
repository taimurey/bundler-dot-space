'use client';

import React, { ChangeEvent, useState } from 'react';
import { BN } from 'bn.js';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { toast } from "sonner";
import { BundleToast } from '@/components/bundler-toasts';
import { BalanceType } from '@/components/types/solana-types';
import { truncate } from '@/components/sidebar-drawer';
import WalletInput from '@/components/instructions/pump-bundler/wallet-input';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { InputField } from '@/components/ui/input-field';
import { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { Listbox } from '@headlessui/react';
import { FaSpinner } from 'react-icons/fa';
import JitoBundleSelection, { BlockEngineLocation } from '@/components/ui/jito-bundle-selection';
import { LaunchLabBuyer, LaunchLabSeller } from '@/components/LaunchLabSDK/LaunchLabBundler';
import Image from 'next/image';

import LetsBonkLogo from '@/public/bonk_fun.png';

const ZERO = new BN(0)
type BN = typeof ZERO

const WalletmodeOptions = [
    { value: 1, label: "Wallet Mode" },
    { value: 100, label: "Multi-Wallet" },
];

const LaunchLabManage = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const [balances, setBalances] = useState<BalanceType[]>([]);
    const [wallets, setWallets] = useState<WalletEntry[]>([]);
    const [Mode, setMode] = useState(0);
    const [WalletMode, setWalletMode] = useState(1);
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
    const [isLoading, setIsLoading] = useState(false);
    const [bundleIds, setBundleIds] = useState<string[]>([]);

    const [formData, setFormData] = useState<{
        tokenAddress: string;
        Wallets: string[];
        feeKeypair: string;
        SellPercentage: string;
        buyAmount: string;
        BundleTip: string;
        TransactionTip: string;
        BlockEngineSelection: string;
        GoalSolAmount: string;
        buyerextraWallets?: string[];
        buyerWalletAmounts?: string[];
    }>({
        tokenAddress: '',
        Wallets: [],
        feeKeypair: '',
        SellPercentage: '',
        buyAmount: '',
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[0],
        GoalSolAmount: '',
        buyerextraWallets: [],
        buyerWalletAmounts: [],
    });

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    // Function to handle buying tokens with a single wallet
    const handleSingleBuy = async () => {
        if (!formData.tokenAddress || !formData.feeKeypair || !formData.buyAmount) {
            toast.error('Token address, private key, and buy amount are required');
            return;
        }

        try {
            // Execute the buy operation
            const result = await LaunchLabBuyer(
                connection,
                formData.feeKeypair,
                formData.tokenAddress,
                formData.buyAmount,
                formData.BundleTip,
                formData.BlockEngineSelection
            );

            // Display bundle ID toast
            toast(() => (
                <BundleToast
                    txSig={result.bundleId}
                    message={'Buy Bundle ID:'}
                />
            ));

            setBundleIds(prev => [...prev, result.bundleId]);
            toast.success('Buy transaction sent successfully!');
        } catch (error) {
            console.error('Error executing buy:', error);
            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    // Function to handle buying tokens with multiple wallets
    const handleMultiBuy = async () => {
        if (!formData.tokenAddress || wallets.length === 0) {
            toast.error('Token address and at least one wallet are required');
            return;
        }

        try {
            const results = [];
            // Process each wallet and create a buy transaction
            for (let i = 0; i < wallets.length; i++) {
                const wallet = wallets[i];

                // Skip wallets with no SOL amount specified
                if (!wallet.solAmount || Number(wallet.solAmount) <= 0) {
                    continue;
                }

                // Execute buy operation for this wallet
                const result = await LaunchLabBuyer(
                    connection,
                    wallet.wallet,
                    formData.tokenAddress,
                    wallet.solAmount.toString(),
                    formData.BundleTip,
                    formData.BlockEngineSelection
                );

                results.push(result);

                // Display bundle ID toast
                toast(() => (
                    <BundleToast
                        txSig={result.bundleId}
                        message={`Buy Bundle ID (Wallet ${i + 1}):`}
                    />
                ));

                setBundleIds(prev => [...prev, result.bundleId]);
            }

            toast.success(`${results.length} buy transactions sent successfully!`);
        } catch (error) {
            console.error('Error executing multi-wallet buy:', error);
            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const handleBuy = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Validate token address
            try {
                new PublicKey(formData.tokenAddress);
            } catch (error) {
                toast.error('Invalid token address');
                setIsLoading(false);
                return;
            }

            // Check wallet mode and handle accordingly
            if (WalletMode === 1) {
                // Single wallet mode
                await handleSingleBuy();
            } else {
                // Multi-wallet mode
                await handleMultiBuy();
            }
        } catch (error) {
            console.error('Error executing buy:', error);
            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSell = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
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

            try {
                // Validate token address
                new PublicKey(formData.tokenAddress);

                // Call the LaunchLabSeller function to process the wallets
                const bundleResults = await LaunchLabSeller(
                    connection,
                    wallets,
                    formData.feeKeypair || wallets[0].wallet, // Use the first wallet as fee payer if none specified
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
                                message={'Sell Bundle ID:'}
                            />
                        ),
                        { duration: 5000 }
                    );
                });

                setBundleIds(prev => [...prev, ...bundleResults]);
                toast.success(`${bundleResults.length} sell transactions sent successfully!`);
            } catch (error) {
                console.error('Error during submission:', error);
                toast.error(`Error bundling: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error processing sell:', error);
            toast.error(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    React.useEffect(() => {
        const fetchBalances = async () => {
            let allBalances: BalanceType[] = [];

            const balances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));

                        // Fetch SOL balance
                        const solBalance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));

                        // Fetch token balance if tokenAddress is provided
                        let tokenBalance = '0';
                        if (formData.tokenAddress) {
                            try {
                                const tokenMint = new PublicKey(formData.tokenAddress);
                                const tokenAccount = getAssociatedTokenAddressSync(tokenMint, keypair.publicKey);
                                try {
                                    const balance = await connection.getTokenAccountBalance(tokenAccount);
                                    tokenBalance = balance.value.amount;
                                } catch (e) {
                                    // Token account may not exist yet
                                    console.log(`No token account for ${keypair.publicKey.toString()}`);
                                }
                            } catch (error) {
                                console.error(`Error fetching token balance for wallet ${keypair.publicKey.toString()}:`, error);
                            }
                        }

                        return {
                            name: truncate(keypair.publicKey.toString(), 4, 4),
                            address: keypair.publicKey.toString(),
                            sol: solBalance,
                            token: tokenBalance,
                            balance: parseFloat(solBalance.toString()),
                            publicKey: keypair.publicKey.toString(),
                        } as BalanceType;
                    } catch (error) {
                        console.error('Error processing wallet:', error);
                        return null;
                    }
                })
            );

            // Filter out null values from failed wallet processing
            const validBalances = balances.filter(balance => balance !== null) as BalanceType[];
            setBalances(validBalances);
        };

        // Fetch balances when wallets or tokenAddress changes
        if (wallets.length > 0) {
            fetchBalances();
        }
    }, [wallets, formData.tokenAddress, connection]);

    const modeOptions = [
        { value: 0, label: 'LetsBonk.fun', image: LetsBonkLogo },
    ];

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
                                    <p className='font-bold text-[20px]'>Launch Lab Manager</p>
                                    <p className='text-[11px] text-[#96989c]'>Manage your existing tokens with buy and sell operations</p>
                                </div>
                                <div className="md:w-1/3">
                                    <label className="block text-sm text-white font-semibold mb-1">Platform</label>
                                    <Listbox value={Mode} onChange={(value) => setMode(Number(value))}>
                                        <div className="relative">
                                            <Listbox.Button className="w-full px-3 rounded-md text-sm border border-[#404040] text-white bg-input-boxes h-[35px] focus:outline-none focus:border-blue-500 text-left flex items-center gap-2">
                                                <Image
                                                    src={modeOptions.find((opt) => opt.value === Mode)?.image || '/path/to/fallback/image.png'}
                                                    alt={modeOptions.find((opt) => opt.value === Mode)?.label || 'Platform'}
                                                    width={16}
                                                    height={16}
                                                />
                                                {modeOptions.find((opt) => opt.value === Mode)?.label || 'Platform'}
                                            </Listbox.Button>
                                            <Listbox.Options className="absolute z-10 mt-1 w-full bg-[#0c0e11] border border-[#404040] rounded-md shadow-lg max-h-60 overflow-auto">
                                                {modeOptions.map((option) => (
                                                    <Listbox.Option
                                                        key={option.value}
                                                        value={option.value}
                                                        className={({ active }) =>
                                                            `flex items-center gap-2 px-4 py-2 text-white text-xs cursor-pointer ${active ? 'bg-blue-500' : ''}`
                                                        }
                                                    >
                                                        <Image src={option.image} alt={option.label} width={16} height={16} />
                                                        {option.label}
                                                    </Listbox.Option>
                                                ))}
                                            </Listbox.Options>
                                        </div>
                                    </Listbox>
                                </div>
                            </div>
                        </div>

                        {/* Tab Navigation and Configuration Section */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='font-bold text-[16px] mb-3 text-white'>Operation Configuration</h3>

                            {/* Tab Navigation */}
                            <div className="flex border-b border-neutral-700 mb-4">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('buy')}
                                    className={`py-2 px-4 ${activeTab === 'buy' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
                                >
                                    Buy
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('sell')}
                                    className={`py-2 px-4 ${activeTab === 'sell' ? 'border-b-2 border-blue-500 text-blue-500' : 'text-gray-400'}`}
                                >
                                    Sell
                                </button>
                            </div>

                            {/* Wallet Mode Selection */}
                            <div className="mb-3">
                                <label className="block text-sm text-white font-semibold mb-1">Wallet Mode</label>
                                <select
                                    id="WalletMode"
                                    value={WalletMode}
                                    onChange={(e) => setWalletMode(Number(e.target.value))}
                                    required={true}
                                    className="block w-full px-3 rounded-md text-sm border border-[#404040] text-white bg-input-boxes focus:outline-none h-[35px] focus:border-blue-500"
                                >
                                    <option value="" disabled>Select Mode</option>
                                    {WalletmodeOptions.map((option, index) => (
                                        <option key={index} value={option.value}>
                                            {option.value} {option.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Token Address */}
                            <InputField
                                id="tokenAddress"
                                label="Token Address"
                                subfield='Mint address'
                                value={formData.tokenAddress}
                                onChange={(e) => handleChange(e, 'tokenAddress')}
                                placeholder="Enter token mint address"
                                type="text"
                                required={true}
                            />

                            {/* Display content based on active tab */}
                            {activeTab === 'buy' ? (
                                <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center">
                                    {WalletMode === 1 ? (
                                        <>
                                            {/* Single Wallet Buy */}
                                            <InputField
                                                label="Private Key"
                                                subfield='buyer wallet'
                                                id="feeKeypair"
                                                value={formData.feeKeypair}
                                                onChange={(e) => handleChange(e, 'feeKeypair')}
                                                placeholder="Enter private key"
                                                type="password"
                                                required={true}
                                            />
                                            <InputField
                                                label="Buy Amount"
                                                subfield='SOL'
                                                id="buyAmount"
                                                value={formData.buyAmount}
                                                onChange={(e) => handleChange(e, 'buyAmount')}
                                                placeholder="Enter amount in SOL"
                                                type="number"
                                                required={true}
                                            />
                                        </>
                                    ) : (
                                        <>
                                            {/* Multi Wallet Buy */}
                                            <h3 className="text-white text-sm mb-2">Enter Multiple Wallets</h3>
                                            <WalletInput
                                                wallets={wallets}
                                                setWallets={setWallets}
                                                Mode={WalletMode}
                                                maxWallets={WalletMode}
                                                onChange={(walletData) => {
                                                    setFormData(prevState => ({
                                                        ...prevState,
                                                        buyerextraWallets: walletData.map(entry => entry.wallet),
                                                        buyerWalletAmounts: walletData.map(entry => entry.solAmount.toString())
                                                    }));
                                                }}
                                                onWalletsUpdate={(walletData) => {
                                                    console.log('Updated wallet data:', walletData);
                                                }}
                                            />
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center">
                                    <InputField
                                        label="Fee Payer Private Key"
                                        subfield='(optional - first wallet used if empty)'
                                        id="feeKeypair"
                                        value={formData.feeKeypair}
                                        onChange={(e) => handleChange(e, 'feeKeypair')}
                                        placeholder="Enter fee payer's private key"
                                        type="password"
                                        required={false}
                                    />

                                    <h3 className="text-white text-sm my-2">Wallets to Sell From</h3>
                                    <WalletInput
                                        wallets={wallets}
                                        setWallets={setWallets}
                                        Mode={WalletMode}
                                        maxWallets={WalletMode}
                                        onChange={(walletData) => {
                                            setFormData(prevState => ({
                                                ...prevState,
                                                buyerextraWallets: walletData.map(entry => entry.wallet),
                                                buyerWalletAmounts: walletData.map(entry => entry.solAmount.toString())
                                            }));
                                        }}
                                        onWalletsUpdate={(walletData) => {
                                            console.log('Updated wallet data for sell:', walletData);
                                        }}
                                    />

                                    <InputField
                                        label="Sell Percentage"
                                        subfield='%'
                                        id="SellPercentage"
                                        value={formData.SellPercentage}
                                        onChange={(e) => handleChange(e, 'SellPercentage')}
                                        placeholder="Enter percentage to sell (e.g. 50)"
                                        type="number"
                                        required={true}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Wallet Input Section */}
                        {WalletMode !== 1 && (
                            <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                                <h3 className="text-[16px] font-semibold text-white mb-3">
                                    {WalletMode} Wallet Mode
                                </h3>
                                <WalletInput
                                    wallets={wallets}
                                    setWallets={setWallets}
                                    Mode={WalletMode}
                                    walletType='privateKeys'
                                    maxWallets={WalletMode}
                                    onChange={(walletData) => {
                                        setFormData(prevState => ({
                                            ...prevState,
                                            buyerextraWallets: walletData.map(entry => entry.wallet),
                                            buyerWalletAmounts: walletData.map(entry => entry.solAmount.toString())
                                        }));
                                    }}
                                    onWalletsUpdate={(walletData) => {
                                        console.log('Updated wallet data:', walletData);
                                    }}
                                />
                            </div>
                        )}

                        {/* Limit Order Section - Disabled */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <h3 className='btn-text-gradient font-bold text-[16px] mb-3'>Limit Order</h3>
                            <InputField
                                id="GoalSolAmount"
                                label={`Goal SOL Amount`}
                                subfield={`Sell tokens at specific goal`}
                                value={formData.GoalSolAmount}
                                onChange={(e) => handleChange(e, 'GoalSolAmount')}
                                placeholder="Enter target SOL amount"
                                type="number"
                                required={false}
                            />

                            <div className='justify-center'>
                                <button
                                    className="text-center w-full invoke-btn"
                                    type="button"
                                    disabled={true}
                                    title="Coming Soon"
                                    style={{ backgroundColor: 'black', color: 'white', cursor: 'not-allowed' }}
                                >
                                    <span className="btn-text-gradient font-bold">
                                        Limit Order
                                        <span className="pl-5 text-[#FFC107] text-[12px] font-normal">Coming Soon</span>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Bundle Configuration, Action Buttons and Status Panel */}
                    <div className="xl:col-span-1 space-y-3">
                        {/* Bundle Configuration */}
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

                        {/* Action Button */}
                        <div className="p-4 bg-[#0c0e11] border border-neutral-500 rounded-xl shadow-2xl shadow-black">
                            <div className='justify-center'>
                                <button
                                    className="text-center w-full invoke-btn"
                                    type="submit"
                                    onClick={activeTab === 'buy' ? handleBuy : handleSell}
                                    disabled={isLoading}
                                >
                                    <span className="btn-text-gradient font-bold">
                                        {isLoading ? (
                                            <div className='flex justify-center items-center gap-2'>
                                                <span className="italic font-i">Processing</span>
                                                <FaSpinner className='animate-spin' />
                                            </div>
                                        ) : (
                                            <>
                                                {activeTab === 'buy' ? 'Buy Tokens' : 'Sell Tokens'}
                                                <span className="pl-5 text-[#FFC107] text-[12px] font-normal">
                                                    ({WalletMode === 1 ? 'Single wallet' : 'Multi wallet'})
                                                </span>
                                            </>
                                        )}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Status Panel */}
                        <div className="space-y-3">
                            <div className="p-4 bg-[#0c0e11] border border-neutral-600 rounded-xl shadow-2xl shadow-black sticky top-4">
                                <div>
                                    <div>
                                        <p className='font-bold text-[25px]'>Wallet Information</p>
                                        <p className='text-[12px] text-[#96989c]'>Current wallet balances and token holdings</p>
                                    </div>

                                    {balances.length > 0 ? (
                                        <div className='w-full'>
                                            <label className="block mt-5 text-base text-white font-semibold">
                                                Wallets ({balances.length}):
                                            </label>
                                            <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end mt-2">
                                                {balances.map(({ balance, publicKey, token }, index) => (
                                                    <a
                                                        key={index}
                                                        href={`https://solscan.io/account/${publicKey}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="block w-full rounded-md text-base bg-transparent focus:outline-none sm:text-base mb-3 select-text p-2 border border-neutral-800 hover:border-neutral-700"
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[#96989c] text-sm">{index + 1}:</span>
                                                            <span className="bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold">{truncate(publicKey, 6, 6)}</span>
                                                        </div>
                                                        <div className="mt-1 flex justify-between items-center">
                                                            <span className="text-[#96989c] text-xs">SOL:</span>
                                                            <span className="text-white text-sm">{balance}</span>
                                                        </div>
                                                        {formData.tokenAddress && (
                                                            <div className="mt-1 flex justify-between items-center">
                                                                <span className="text-[#96989c] text-xs">Token:</span>
                                                                <span className="text-white text-sm">{token}</span>
                                                            </div>
                                                        )}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-5 p-3 bg-neutral-900 rounded-md text-gray-400 text-sm">
                                            No wallets loaded yet. Add wallets to see balance information.
                                        </div>
                                    )}

                                    {bundleIds.length > 0 && (
                                        <div className="mt-5">
                                            <label className="block text-base text-white font-semibold">
                                                Recent Bundles:
                                            </label>
                                            <div className="mt-2 max-h-40 overflow-y-auto">
                                                {bundleIds.map((id, index) => (
                                                    <div key={index} className="mb-2 p-2 bg-neutral-900 rounded border border-neutral-800">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-gray-400 text-xs">{index + 1}:</span>
                                                            <a
                                                                href={`https://explorer.jito.wtf/bundle/${id}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-blue-400 text-xs hover:underline"
                                                            >
                                                                {id.substring(0, 8)}...
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default LaunchLabManage; 