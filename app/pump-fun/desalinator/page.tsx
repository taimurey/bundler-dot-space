"use client";

import React, { ChangeEvent, useState, useEffect } from 'react';
import { BN } from 'bn.js';
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { toast } from "sonner";
import { BundleToast } from '@/components/bundler-toasts';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { getHeaderLayout } from '@/components/header-layout';
import { Slider } from "@/components/ui/slider";
import { FaCoins, FaSpinner, FaSync } from "react-icons/fa";
import { ClipLoader } from "react-spinners";
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';
import { truncate } from '@/components/sidebar-drawer';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { createDesalinatorBundle, DesalinatorParams } from '@/components/instructions/pump-bundler/DesalinatorJito';

const ZERO = new BN(0);
type BN = typeof ZERO;

const Desalinator = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);

    // State for form data
    const [formData, setFormData] = useState({
        sellerPrivateKey: '',
        buyerPrivateKey: '',
        tokenAddress: '',
        tokensToSell: '50', // Default percentage
        BundleTip: '0.01',
        TransactionTip: '0.00001',
        BlockEngineSelection: BlockEngineLocation[2],
    });

    const [isJitoBundle, setIsJitoBundle] = useState(true);

    // State for wallet balances
    const [sellerBalances, setSellerBalances] = useState({
        sol: 0,
        token: 0,
        publicKey: ''
    });

    const [buyerBalances, setBuyerBalances] = useState({
        sol: 0,
        token: 0,
        publicKey: ''
    });

    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [displayBalances, setDisplayBalances] = useState<Array<{ balance: string, publicKey: string }>>([]);
    const [fetchingError, setFetchingError] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const [tokenBalancesLoaded, setTokenBalancesLoaded] = useState(false);
    const MAX_RETRIES = 3;

    // Handle form field changes
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));

        // Reset fetch error when changing keys
        if (field === 'sellerPrivateKey' || field === 'buyerPrivateKey') {
            setFetchingError(false);
        }
    };

    // Handle select field changes
    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    // Handle slider value change
    const handleSliderChange = (value: number[]) => {
        setFormData(prevState => ({
            ...prevState,
            tokensToSell: value[0].toString(),
        }));
    };

    // Function to validate and get keypair from private key
    const getKeypairFromPrivateKey = (privateKey: string): Keypair | null => {
        try {
            if (!privateKey || privateKey.trim() === '') return null;

            // Validate key format before attempting to decode
            if (!/^[1-9A-HJ-NP-Za-km-z]{43,88}$/.test(privateKey)) {
                return null;
            }

            // Check if it's a base58 encoded private key
            const decoded = base58.decode(privateKey);
            if (decoded.length !== 64) {
                return null;
            }

            return Keypair.fromSecretKey(decoded);
        } catch (error) {
            console.error("Invalid private key format:", error);
            return null;
        }
    };

    // Fetch wallet balances when private keys change or manual refresh
    const fetchBalances = async (forceRefresh = false) => {
        if (isLoading && !forceRefresh) return;

        let isMounted = true;
        setIsLoading(true);
        setTokenBalancesLoaded(false);

        try {
            // Only proceed if we have at least one key
            if (!formData.sellerPrivateKey && !formData.buyerPrivateKey) {
                setIsLoading(false);
                return;
            }

            const balancesToDisplay = [];
            let hasTokenBalance = false;

            // Helper function to find token accounts for a wallet
            const getTokenAccounts = async (walletPublicKey: PublicKey, tokenMintAddress: string) => {
                try {
                    const tokenMint = new PublicKey(tokenMintAddress);
                    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
                        walletPublicKey,
                        { mint: tokenMint }
                    );

                    // Return the first token account we find for this mint
                    return tokenAccounts.value.length > 0 ? tokenAccounts.value[0] : null;
                } catch (error) {
                    console.error("Error finding token account:", error);
                    return null;
                }
            };

            // Helper function to get token balance
            const getTokenBalance = async (walletPublicKey: PublicKey, tokenMintAddress: string) => {
                try {
                    const tokenAccount = await getTokenAccounts(walletPublicKey, tokenMintAddress);
                    if (!tokenAccount) {
                        return 0;
                    }

                    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.pubkey);
                    return parseFloat(tokenBalance.value.uiAmount?.toString() || '0');
                } catch (error) {
                    // Handle errors for token accounts that don't exist or invalid owners
                    if (error instanceof Error &&
                        (error.message.includes('TokenAccountNotFound') ||
                            error.message.includes('TokenInvalidAccountOwner'))) {
                        return 0;
                    }
                    console.error("Error getting token balance:", error);
                    return 0;
                }
            };

            // Get seller keypair and balance
            if (formData.sellerPrivateKey) {
                try {
                    const sellerKeypair = getKeypairFromPrivateKey(formData.sellerPrivateKey);
                    if (sellerKeypair) {
                        // Get SOL balance
                        const solBalance = await connection.getBalance(sellerKeypair.publicKey);

                        // Get token balance if token address is provided
                        let tokenBalance = 0;
                        if (formData.tokenAddress) {
                            try {
                                tokenBalance = await getTokenBalance(sellerKeypair.publicKey, formData.tokenAddress);
                                hasTokenBalance = tokenBalance > 0;
                            } catch (error) {
                                console.error("Error fetching token balance:", error);
                            }
                        }

                        // Update seller balances
                        setSellerBalances({
                            sol: solBalance / LAMPORTS_PER_SOL,
                            token: tokenBalance,
                            publicKey: sellerKeypair.publicKey.toString()
                        });

                        balancesToDisplay.push({
                            balance: (solBalance / LAMPORTS_PER_SOL).toFixed(4) + " SOL",
                            publicKey: sellerKeypair.publicKey.toString()
                        });

                        // Add token balance display if available
                        if (formData.tokenAddress) {
                            balancesToDisplay.push({
                                balance: tokenBalance.toString() + " Tokens",
                                publicKey: sellerKeypair.publicKey.toString() + "_token"
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching seller balance:", error);
                }
            }

            // Get buyer keypair and balance
            if (formData.buyerPrivateKey) {
                try {
                    const buyerKeypair = getKeypairFromPrivateKey(formData.buyerPrivateKey);
                    if (buyerKeypair) {
                        // Get SOL balance
                        const solBalance = await connection.getBalance(buyerKeypair.publicKey);

                        // Get token balance if token address is provided
                        let tokenBalance = 0;
                        if (formData.tokenAddress) {
                            try {
                                tokenBalance = await getTokenBalance(buyerKeypair.publicKey, formData.tokenAddress);
                                hasTokenBalance = hasTokenBalance || tokenBalance > 0;
                            } catch (error) {
                                console.error("Error fetching token balance:", error);
                            }
                        }

                        // Update buyer balances
                        setBuyerBalances({
                            sol: solBalance / LAMPORTS_PER_SOL,
                            token: tokenBalance,
                            publicKey: buyerKeypair.publicKey.toString()
                        });

                        balancesToDisplay.push({
                            balance: (solBalance / LAMPORTS_PER_SOL).toFixed(4) + " SOL",
                            publicKey: buyerKeypair.publicKey.toString()
                        });

                        // Add token balance display if available
                        if (formData.tokenAddress) {
                            balancesToDisplay.push({
                                balance: tokenBalance.toString() + " Tokens",
                                publicKey: buyerKeypair.publicKey.toString() + "_token"
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching buyer balance:", error);
                }
            }

            setDisplayBalances(balancesToDisplay);
            setFetchingError(false);
            setRetryCount(0);

            // Only enable slider if seller has tokens and token address is valid
            const sellerHasTokens = sellerBalances.token > 0;
            setTokenBalancesLoaded(sellerHasTokens && formData.tokenAddress !== '');

        } catch (error) {
            console.error("Error fetching balances:", error);
            setFetchingError(true);

            if (retryCount < MAX_RETRIES) {
                setRetryCount(prev => prev + 1);
            } else {
                // Only show error after max retries
                toast.error("Failed to fetch wallet balances after multiple attempts");
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Manual refresh handler
    const handleRefreshBalances = (e: React.MouseEvent) => {
        e.preventDefault();
        fetchBalances(true);
    };

    // Update the useEffect to fetch token balance when token address changes
    useEffect(() => {
        // Only run if keys change and not in error state or max retries
        if ((formData.sellerPrivateKey || formData.buyerPrivateKey) &&
            (!fetchingError || retryCount < MAX_RETRIES)) {
            const timer = setTimeout(() => {
                fetchBalances();
            }, retryCount * 1000); // Add delay for retries

            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData.sellerPrivateKey, formData.buyerPrivateKey, formData.tokenAddress, fetchingError, retryCount]);

    // Handle form submission
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate inputs
        if (!formData.sellerPrivateKey) {
            toast.error("Seller private key is required");
            return;
        }

        if (!formData.buyerPrivateKey) {
            toast.error("Buyer private key is required");
            return;
        }

        if (!formData.tokenAddress) {
            toast.error("Token address is required");
            return;
        }

        try {
            setIsSubmitting(true);

            // Get keypairs
            const sellerKeypair = getKeypairFromPrivateKey(formData.sellerPrivateKey);
            const buyerKeypair = getKeypairFromPrivateKey(formData.buyerPrivateKey);

            if (!sellerKeypair || !buyerKeypair) {
                toast.error("Invalid private keys");
                return;
            }

            // Create params for the desalinator bundle
            const params: DesalinatorParams = {
                sellerPrivateKey: formData.sellerPrivateKey,
                buyerPrivateKey: formData.buyerPrivateKey,
                tokenAddress: formData.tokenAddress,
                tokensToSell: formData.tokensToSell,
                BlockEngineSelection: formData.BlockEngineSelection,
                BundleTip: formData.BundleTip,
                TransactionTip: formData.TransactionTip
            };

            // Show pending toast
            toast.info("Creating desalinator bundle...");

            // Create and submit the bundle
            const result = await createDesalinatorBundle(connection, params);

            // Show success message
            toast.success("Desalinator bundle submitted successfully");

            // Show bundle ID toast
            toast(
                () => (
                    <BundleToast
                        txSig={result.bundleId}
                        message={"Bundle ID:"}
                    />
                ),
                { duration: 5000 }
            );

        } catch (error) {
            console.error("Error creating bundle:", error);
            toast.error(`Bundle creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="mb-8 mx-8 flex mt-8 justify-center items-center relative">

            <form onSubmit={handleSubmit}>
                <div className="">
                    <div className="">
                        <div className="flex flex-col md:flex-row h-full gap-6 justify-center">
                            {/* Left column - Main form inputs */}
                            <div className="space-y-4 p-4 bg-[#0c0e11] border border-neutral-500 rounded-2xl sm:p-6 shadow-2xl">
                                <div>
                                    <p className='font-bold text-[25px]'>Desalinator</p>
                                    <p className='text-[12px] text-[#96989c]'>Create a bundled transaction with token seller and buyer</p>
                                </div>

                                <div className='w-full'>
                                    <InputField
                                        id="tokenAddress"
                                        label="Token Address"
                                        subfield='SPL token address to trade'
                                        value={formData.tokenAddress}
                                        onChange={(e) => handleChange(e, 'tokenAddress')}
                                        placeholder="Enter token address"
                                        type="text"
                                        required={true}
                                    />
                                </div>

                                <InputField
                                    id="sellerPrivateKey"
                                    label="Token Seller Private Key"
                                    subfield='Wallet selling the tokens'
                                    value={formData.sellerPrivateKey}
                                    onChange={(e) => handleChange(e, 'sellerPrivateKey')}
                                    placeholder="Enter seller private key"
                                    type="password"
                                    required={true}
                                />

                                <InputField
                                    id="buyerPrivateKey"
                                    label="Token Buyer Private Key"
                                    subfield='Wallet buying the tokens'
                                    value={formData.buyerPrivateKey}
                                    onChange={(e) => handleChange(e, 'buyerPrivateKey')}
                                    placeholder="Enter buyer private key"
                                    type="password"
                                    required={true}
                                />

                                {/* Tokens to Sell Slider */}
                                <div className="space-y-2 mt-4">
                                    <label className="block text-sm font-medium text-white">
                                        Tokens to Sell: {formData.tokensToSell}%
                                    </label>
                                    <Slider
                                        defaultValue={[50]}
                                        max={100}
                                        step={1}
                                        className={`w-full py-4 ${!tokenBalancesLoaded ? 'opacity-50' : ''}`}
                                        onValueChange={tokenBalancesLoaded ? handleSliderChange : undefined}
                                        disabled={!tokenBalancesLoaded}
                                    />
                                    {!tokenBalancesLoaded && formData.tokenAddress && (
                                        <p className="text-xs text-amber-400 mt-1">
                                            {isLoading ? "Loading token balances..." : "Enter token address and wallet keys to enable slider"}
                                        </p>
                                    )}
                                </div>

                                <JitoBundleSelection
                                    isJitoBundle={isJitoBundle}
                                    setIsJitoBundle={setIsJitoBundle}
                                    formData={formData}
                                    handleChange={handleChange}
                                    handleSelectionChange={handleSelectionChange}
                                />

                                {/* Submit Button */}
                                <div className='justify-center'>
                                    <button
                                        type="submit"
                                        disabled={isLoading || isSubmitting}
                                        className="text-center w-full invoke-btn"
                                    >
                                        <span className="btn-text-gradient font-bold">
                                            {isSubmitting ? (
                                                <span className='btn-text-gradient italic font-i ellipsis'>Processing...</span>
                                            ) : (
                                                <>
                                                    Bundle Desalination
                                                    <span className="pl-5 text-[#FFC107] text-[12px] font-normal">(0.25 Bundler Cost)</span>
                                                </>
                                            )}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Right column - Wallet Information */}
                            <div className="min-w-[44px] p-4 bg-[#0c0e11] bg-opacity-70 border border-neutral-600 shadow rounded-2xl sm:p-6 flex flex-col justify-between items-center">
                                <div>
                                    <div className="flex justify-between items-center w-full">
                                        <p className='font-bold text-[25px]'>Wallet Parameters</p>
                                        <button
                                            onClick={handleRefreshBalances}
                                            className="p-2 text-white/70 hover:text-white rounded-full transition-colors"
                                            title="Refresh balances"
                                            disabled={isLoading}
                                        >
                                            <FaSync className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                        </button>
                                    </div>
                                    <p className='text-[12px] text-[#96989c]'>Wallet addresses and balances for the transaction</p>
                                </div>
                                <div className='w-full'>
                                    <label className="block mt-5 text-base text-white font-semibold">
                                        Wallets:
                                    </label>
                                    <br />
                                    <div className="relative rounded-md shadow-sm w-full flex flex-col justify-end">
                                        {displayBalances.length > 0 ? (
                                            displayBalances.map(({ balance, publicKey }, index) => (
                                                <a
                                                    key={index}
                                                    href={publicKey.endsWith("_token")
                                                        ? `https://solscan.io/token/${formData.tokenAddress}`
                                                        : `https://solscan.io/account/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-[300px] bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[10px] select-text"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[15px] font-normal'>
                                                            {publicKey.endsWith("_token")
                                                                ? (index <= 2 ? 'Seller Token: ' : 'Buyer Token: ')
                                                                : (index === 0 || (index === 1 && publicKey.endsWith("_token")) ? 'Seller: ' : 'Buyer: ')}
                                                        </span>
                                                        {publicKey.endsWith("_token")
                                                            ? balance
                                                            : truncate(publicKey, 6, 7)!}
                                                        <br />
                                                        {!publicKey.endsWith("_token") && (
                                                            <span className='text-[#96989c] text-[14px] font-normal ml-2'>Balance: {balance}</span>
                                                        )}
                                                        <br />
                                                    </p>
                                                </a>
                                            ))
                                        ) : (
                                            <p className="text-[#96989c] text-sm">Enter private keys to view wallet information</p>
                                        )}
                                    </div>
                                </div>

                                {formData.tokenAddress && (
                                    <div className="mt-6">
                                        <label className="block text-base text-white font-semibold">
                                            Token Details:
                                        </label>
                                        <a
                                            href={`https://solscan.io/token/${formData.tokenAddress}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block w-full rounded-md text-[#96989c] bg-transparent focus:outline-none max-w-[300px] bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[10px] mt-2 select-text"
                                            style={{ userSelect: 'text' }}
                                        >
                                            {truncate(formData.tokenAddress, 6, 7)!}
                                        </a>
                                    </div>
                                )}

                                {formData.tokensToSell && tokenBalancesLoaded && (
                                    <div className="mt-6">
                                        <label className="block text-base text-white font-semibold">
                                            Trade Amount:
                                        </label>
                                        <p className="text-[#96989c] text-sm mt-2">
                                            {formData.tokensToSell}% of seller's tokens ({(sellerBalances.token * parseInt(formData.tokensToSell) / 100).toFixed(6)} tokens)
                                        </p>
                                    </div>
                                )}

                                {fetchingError && retryCount >= MAX_RETRIES && (
                                    <div className="mt-6 p-3 border border-red-600/40 rounded-md bg-red-900/20">
                                        <p className="text-red-400 text-sm">
                                            Failed to fetch balances. Please check your keys or network connection.
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setFetchingError(false);
                                                    setRetryCount(0);
                                                    fetchBalances(true);
                                                }}
                                                className="ml-2 underline hover:text-red-300"
                                            >
                                                Try again
                                            </button>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

// Apply the header layout
Desalinator.getLayout = (page: React.ReactNode) => getHeaderLayout(page, "Pump.Fun Desalinator");

export default Desalinator; 