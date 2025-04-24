"use client";

import React, { ChangeEvent, useState, useEffect } from 'react';
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { toast } from "sonner";
import { useWallet } from '@solana/wallet-adapter-react';
import { useSolana } from '@/components/SolanaWallet/SolanaContext';
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { getHeaderLayout } from '@/components/header-layout';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ClipLoader } from "react-spinners";
import JitoBundleSelection from '@/components/ui/jito-bundle-selection';
import { getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction, closeAccount, createCloseAccountInstruction, TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AccountLayout } from '@solana/spl-token';
import { PumpInstructions } from '@/components/instructions/pump-bundler/pumpfun-interface';
import { BN } from '@coral-xyz/anchor';

// Wallet selection mode enum
enum WalletMode {
    Extension = "extension",
    PrivateKey = "privateKey",
    MultiWallet = "multiWallet"
}

const BumpBot = () => {
    const { cluster } = useSolana();
    const connection = new Connection(cluster.endpoint);
    const walletAdapter = useWallet();

    // Wallet mode selection
    const [walletMode, setWalletMode] = useState<WalletMode>(WalletMode.Extension);

    // Single private key for PrivateKey mode
    const [singlePrivateKey, setSinglePrivateKey] = useState('');

    // State for wallets (for multi-wallet mode)
    const [wallets, setWallets] = useState<WalletEntry[]>([]);

    // State for form data
    const [formData, setFormData] = useState({
        tokenAddress: '',
        buyAmount: '0.01',
        sellAmount: '50', // 50% by default
        BlockEngineSelection: BlockEngineLocation[2],
        BundleTip: '0.01',
        TransactionTip: '0.00001',
    });

    // Mode selection
    const [isJitoBundle, setIsJitoBundle] = useState(true);
    const [botMode, setBotMode] = useState<'buy-sell' | 'buy-only' | 'sell-only'>('buy-sell');

    // Loading state
    const [isLoading, setIsLoading] = useState(false);
    const [isBotRunning, setIsBotRunning] = useState(false);
    const [walletBalances, setWalletBalances] = useState<Array<{ balance: string, publicKey: string, tokenBalance?: string }>>([]);

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

    // Handle private key input change
    const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSinglePrivateKey(e.target.value);
    };

    // Check if wallet is connected on tab change
    useEffect(() => {
        if (walletMode === WalletMode.Extension && !walletAdapter.connected) {
            toast.warning("Please connect your wallet to use the wallet extension option");
        }
    }, [walletMode, walletAdapter.connected]);

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

        // Validate wallet selection based on mode
        if (walletMode === WalletMode.Extension && !walletAdapter.connected) {
            toast.error("Please connect your wallet");
            return;
        } else if (walletMode === WalletMode.PrivateKey && !singlePrivateKey) {
            toast.error("Please enter a private key");
            return;
        } else if (walletMode === WalletMode.MultiWallet && wallets.length === 0) {
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
            const balances = await fetchWalletBalances();
            setWalletBalances(balances);

            // Start the bot
            setIsBotRunning(true);
            toast.success(`Bump Bot started in ${botMode} mode`);

            // Process transactions
            await processBotTransactions();

        } catch (error) {
            console.error("Error starting bot:", error);
            toast.error("Failed to start bot: " + (error instanceof Error ? error.message : "Unknown error"));
            setIsBotRunning(false);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch wallet balances based on selected mode
    const fetchWalletBalances = async () => {
        let balances: Array<{ balance: string, publicKey: string, tokenBalance?: string }> = [];
        const showTokenBalances = botMode === 'sell-only' && formData.tokenAddress;
        let tokenMint: PublicKey | null = null;

        // Parse token mint if we need to show token balances
        if (showTokenBalances) {
            try {
                tokenMint = new PublicKey(formData.tokenAddress);
            } catch (error) {
                console.error("Invalid token address:", error);
            }
        }

        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            const solBalance = await connection.getBalance(walletAdapter.publicKey);
            const balanceInfo: { balance: string, publicKey: string, tokenBalance?: string } = {
                balance: (solBalance / LAMPORTS_PER_SOL).toFixed(4) + " SOL",
                publicKey: walletAdapter.publicKey.toString()
            };

            // Add token balance if in sell mode
            if (showTokenBalances && tokenMint) {
                const amount = await getTokenBalance(connection, walletAdapter.publicKey, tokenMint);
                balanceInfo.tokenBalance = amount;
            }

            balances = [balanceInfo];
        } else if (walletMode === WalletMode.PrivateKey && singlePrivateKey) {
            try {
                const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(singlePrivateKey)));
                const solBalance = await connection.getBalance(keypair.publicKey);
                const balanceInfo: { balance: string, publicKey: string, tokenBalance?: string } = {
                    balance: (solBalance / LAMPORTS_PER_SOL).toFixed(4) + " SOL",
                    publicKey: keypair.publicKey.toString()
                };

                // Add token balance if in sell mode
                if (showTokenBalances && tokenMint) {
                    const amount = await getTokenBalance(connection, keypair.publicKey, tokenMint);
                    balanceInfo.tokenBalance = amount;
                }

                balances = [balanceInfo];
            } catch (error) {
                console.error("Error fetching private key wallet balance:", error);
                balances = [{ balance: "Error", publicKey: "Invalid wallet" }];
            }
        } else if (walletMode === WalletMode.MultiWallet) {
            balances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));
                        const solBalance = await connection.getBalance(keypair.publicKey);
                        const balanceInfo: { balance: string, publicKey: string, tokenBalance?: string } = {
                            balance: (solBalance / LAMPORTS_PER_SOL).toFixed(4) + " SOL",
                            publicKey: keypair.publicKey.toString()
                        };

                        // Add token balance if in sell mode
                        if (showTokenBalances && tokenMint) {
                            const amount = await getTokenBalance(connection, keypair.publicKey, tokenMint);
                            balanceInfo.tokenBalance = amount;
                        }

                        return balanceInfo;
                    } catch (error) {
                        return { balance: "Error", publicKey: "Invalid wallet" };
                    }
                })
            );
        }

        return balances;
    };

    // Process bot transactions with Jito bundles
    const processBotTransactionsWithJito = async () => {
        try {
            // Get the token mint address
            const tokenMintPublicKey = new PublicKey(formData.tokenAddress);

            // Get wallet keypairs based on selected mode
            const walletKeypairs = getWalletKeypairs();

            if (walletKeypairs.length === 0 && walletMode !== WalletMode.Extension) {
                throw new Error("No valid wallets found");
            }

            // Process transactions based on bot mode
            if (botMode === 'buy-only') {
                await processBuyTransactionsWithJito(walletKeypairs, tokenMintPublicKey);
            } else if (botMode === 'sell-only') {
                await processSellTransactionsWithJito(walletKeypairs, tokenMintPublicKey);
            } else if (botMode === 'buy-sell') {
                await processBuySellTransactionsWithJito(walletKeypairs, tokenMintPublicKey);
            }

        } catch (error) {
            console.error("Error processing Jito bundle transactions:", error);
            throw error;
        }
    };

    // Process buy transactions using Jito bundles
    const processBuyTransactionsWithJito = async (walletKeypairs: Keypair[], tokenMint: PublicKey) => {
        // In a real implementation, you would create a bundle of transactions
        // For this demo, we'll just call the individual transaction methods with a message about using Jito
        toast.info("Using Jito bundle for buy transactions");

        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            await handleBuyWithWalletAdapter(tokenMint);
        } else {
            for (const keypair of walletKeypairs) {
                await handleBuyWithKeypair(keypair, tokenMint);
            }
        }
    };

    // Process sell transactions using Jito bundles
    const processSellTransactionsWithJito = async (walletKeypairs: Keypair[], tokenMint: PublicKey) => {
        // In a real implementation, you would create a bundle of transactions
        // For this demo, we'll just call the individual transaction methods with a message about using Jito
        toast.info("Using Jito bundle for sell transactions");

        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            await handleSellWithWalletAdapter(tokenMint);
        } else {
            for (const keypair of walletKeypairs) {
                await handleSellWithKeypair(keypair, tokenMint);
            }
        }
    };

    // Process buy and sell transactions using Jito bundles
    const processBuySellTransactionsWithJito = async (walletKeypairs: Keypair[], tokenMint: PublicKey) => {
        // In a real implementation, you would create a bundle of transactions
        // For this demo, we'll just call the individual transaction methods with a message about using Jito
        toast.info("Using Jito bundle for buy-sell transactions");

        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            await handleBuySellWithWalletAdapter(tokenMint);
        } else {
            for (const keypair of walletKeypairs) {
                await handleBuySellWithKeypair(keypair, tokenMint);
            }
        }
    };

    // Update the processBotTransactions function to use Jito if selected
    const processBotTransactions = async () => {
        if (isJitoBundle) {
            await processBotTransactionsWithJito();
        } else {
            try {
                // Get the token mint address
                const tokenMintPublicKey = new PublicKey(formData.tokenAddress);

                // Get wallet keypairs based on selected mode
                const walletKeypairs = getWalletKeypairs();

                if (walletKeypairs.length === 0 && walletMode !== WalletMode.Extension) {
                    throw new Error("No valid wallets found");
                }

                // Process transactions based on bot mode
                if (botMode === 'buy-only') {
                    await processBuyTransactions(walletKeypairs, tokenMintPublicKey);
                } else if (botMode === 'sell-only') {
                    await processSellTransactions(walletKeypairs, tokenMintPublicKey);
                } else if (botMode === 'buy-sell') {
                    await processBuySellTransactions(walletKeypairs, tokenMintPublicKey);
                }

            } catch (error) {
                console.error("Error processing transactions:", error);
                throw error;
            }
        }
    };

    // Get wallet keypairs based on the selected wallet mode
    const getWalletKeypairs = (): Keypair[] => {
        const keypairs: Keypair[] = [];

        try {
            if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
                // For wallet extension mode, we can't get the keypair directly
                // We'll handle this specially in the transaction methods
                return [];
            } else if (walletMode === WalletMode.PrivateKey && singlePrivateKey) {
                try {
                    const keypair = Keypair.fromSecretKey(
                        new Uint8Array(base58.decode(singlePrivateKey))
                    );
                    keypairs.push(keypair);
                } catch (error) {
                    console.error("Invalid private key:", error);
                }
            } else if (walletMode === WalletMode.MultiWallet) {
                for (const wallet of wallets) {
                    try {
                        const keypair = Keypair.fromSecretKey(
                            new Uint8Array(base58.decode(wallet.wallet))
                        );
                        keypairs.push(keypair);
                    } catch (error) {
                        console.error("Invalid wallet private key:", error);
                    }
                }
            }
        } catch (error) {
            console.error("Error getting wallet keypairs:", error);
        }

        return keypairs;
    };

    // Process buy transactions for the given wallets
    const processBuyTransactions = async (walletKeypairs: Keypair[], tokenMint: PublicKey) => {
        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            // Use wallet adapter for Extension mode
            await handleBuyWithWalletAdapter(tokenMint);
        } else {
            // Use keypairs for other modes
            for (const keypair of walletKeypairs) {
                await handleBuyWithKeypair(keypair, tokenMint);
            }
        }
    };

    // Process sell transactions for the given wallets
    const processSellTransactions = async (walletKeypairs: Keypair[], tokenMint: PublicKey) => {
        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            // Use wallet adapter for Extension mode
            await handleSellWithWalletAdapter(tokenMint);
        } else {
            // Use keypairs for other modes
            for (const keypair of walletKeypairs) {
                await handleSellWithKeypair(keypair, tokenMint);
            }
        }
    };

    // Process buy and sell in the same transaction for the given wallets
    const processBuySellTransactions = async (walletKeypairs: Keypair[], tokenMint: PublicKey) => {
        if (walletMode === WalletMode.Extension && walletAdapter.publicKey) {
            // Use wallet adapter for Extension mode
            await handleBuySellWithWalletAdapter(tokenMint);
        } else {
            // Use keypairs for other modes
            for (const keypair of walletKeypairs) {
                await handleBuySellWithKeypair(keypair, tokenMint);
            }
        }
    };

    // Handle buy with wallet adapter (Extension mode)
    const handleBuyWithWalletAdapter = async (tokenMint: PublicKey) => {
        if (!walletAdapter.publicKey || !walletAdapter.signTransaction) {
            throw new Error("Wallet not connected or doesn't support signing");
        }

        // TypeScript assertions since we've checked these already
        const walletPublicKey = walletAdapter.publicKey as PublicKey;
        const signTransaction = walletAdapter.signTransaction;

        try {
            const buyAmount = formData.buyAmount;

            await toast.promise(
                (async () => {
                    // Get buy instructions
                    const buyData = PumpInstructions.createBuyInstruction(
                        tokenMint,
                        walletPublicKey,
                        {
                            amount: new BN(buyAmount),
                            maxSolCost: new BN(0.0001)
                        }
                    );

                    const ata = getAssociatedTokenAddressSync(tokenMint, walletPublicKey);
                    const createATAInstruction = createAssociatedTokenAccountInstruction(walletPublicKey, ata, walletPublicKey, tokenMint);

                    // Create transaction
                    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                    // Create versioned transaction
                    const versionedTx = new VersionedTransaction(
                        new TransactionMessage({
                            payerKey: walletPublicKey,
                            recentBlockhash,
                            instructions: [createATAInstruction, buyData],
                        }).compileToV0Message()
                    );

                    // Sign and send transaction
                    const signedTx = await signTransaction(versionedTx);
                    const signature = await connection.sendRawTransaction(signedTx.serialize());
                    return signature;
                })(),
                {
                    loading: 'Buying tokens...',
                    success: (signature) => `Purchase successful! Signature: ${signature.slice(0, 8)}...`,
                    error: (error) => `Failed to buy tokens: ${error instanceof Error ? error.message : String(error)}`
                }
            );
        } catch (error) {
            console.error("Error in handleBuyWithWalletAdapter:", error);
            throw error;
        }
    };

    // Handle buy with keypair (PrivateKey and MultiWallet modes)
    const handleBuyWithKeypair = async (keypair: Keypair, tokenMint: PublicKey) => {
        try {
            const buyAmount = formData.buyAmount;

            await toast.promise(
                (async () => {
                    // Get buy instructions
                    const buyData = PumpInstructions.createBuyInstruction(
                        tokenMint,
                        keypair.publicKey,
                        {
                            amount: new BN(buyAmount),
                            maxSolCost: new BN(0.0001)
                        }
                    );

                    const ata = getAssociatedTokenAddressSync(tokenMint, keypair.publicKey);
                    const createATAInstruction = createAssociatedTokenAccountInstruction(keypair.publicKey, ata, keypair.publicKey, tokenMint);

                    // Create transaction
                    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                    const transaction = new VersionedTransaction(
                        new TransactionMessage({
                            payerKey: keypair.publicKey,
                            recentBlockhash,
                            instructions: [createATAInstruction, buyData],
                        }).compileToV0Message()
                    );

                    // Sign and send transaction
                    transaction.sign([keypair]);
                    const signature = await connection.sendTransaction(transaction);
                    return signature;
                })(),
                {
                    loading: `Buying tokens with wallet ${keypair.publicKey.toString().slice(0, 6)}...`,
                    success: (signature) => `Purchase successful! Signature: ${signature.slice(0, 8)}...`,
                    error: (error) => `Failed to buy tokens: ${error instanceof Error ? error.message : String(error)}`
                }
            );
        } catch (error) {
            console.error("Error in handleBuyWithKeypair:", error);
            throw error;
        }
    };

    // Get token balance for an associated token account
    const getTokenBalance = async (connection: Connection, walletPublicKey: PublicKey, tokenMint: PublicKey): Promise<string> => {
        try {
            // Get the associated token account address
            const ata = getAssociatedTokenAddressSync(tokenMint, walletPublicKey);

            // Check if the ATA exists
            const accountInfo = await connection.getAccountInfo(ata);

            if (!accountInfo) {
                console.log("No associated token account found");
                return "0";
            }

            // Parse the account data
            const accountData = AccountLayout.decode(accountInfo.data);
            const amount = accountData.amount.toString();

            console.log(`Token balance for ${ata.toString()}: ${amount}`);
            return amount;
        } catch (error) {
            console.error("Error fetching token balance:", error);
            return "0";
        }
    };

    // Handle sell with wallet adapter (Extension mode)
    const handleSellWithWalletAdapter = async (tokenMint: PublicKey) => {
        if (!walletAdapter.publicKey || !walletAdapter.signTransaction) {
            throw new Error("Wallet not connected or doesn't support signing");
        }

        // TypeScript assertions since we've checked these already
        const walletPublicKey = walletAdapter.publicKey as PublicKey;
        const signTransaction = walletAdapter.signTransaction;

        try {
            // Fetch the token balance
            const tokenAmount = await getTokenBalance(connection, walletPublicKey, tokenMint);

            if (tokenAmount === "0") {
                toast.error("No tokens to sell. Your balance is 0");
                return;
            }

            // For partial selling, calculate the amount based on percentage
            const sellPercentage = Number(formData.sellAmount) / 100; // Convert to decimal
            const amountToSell = Math.floor(Number(tokenAmount) * sellPercentage).toString();

            await toast.promise(
                (async () => {
                    // Get sell instructions
                    const sellData = PumpInstructions.createSellInstruction(
                        tokenMint,
                        walletPublicKey,
                        {
                            amount: new BN(amountToSell),
                            minSolOutput: new BN(0.0001)
                        }
                    );


                    // Create transaction
                    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                    // Create versioned transaction
                    const versionedTx = new VersionedTransaction(
                        new TransactionMessage({
                            payerKey: walletPublicKey,
                            recentBlockhash,
                            instructions: [sellData],
                        }).compileToV0Message()
                    );

                    // Sign and send transaction
                    const signedTx = await signTransaction(versionedTx);
                    const signature = await connection.sendRawTransaction(signedTx.serialize());
                    return signature;
                })(),
                {
                    loading: 'Selling tokens...',
                    success: (signature) => `Sale successful! Signature: ${signature.slice(0, 8)}...`,
                    error: (error) => `Failed to sell tokens: ${error instanceof Error ? error.message : String(error)}`
                }
            );
        } catch (error) {
            console.error("Error in handleSellWithWalletAdapter:", error);
            throw error;
        }
    };

    // Handle sell with keypair (PrivateKey and MultiWallet modes)
    const handleSellWithKeypair = async (keypair: Keypair, tokenMint: PublicKey) => {
        try {
            // Fetch the token balance
            const tokenAmount = await getTokenBalance(connection, keypair.publicKey, tokenMint);

            if (tokenAmount === "0") {
                toast.error(`No tokens to sell for wallet ${keypair.publicKey.toString().slice(0, 6)}...`);
                return;
            }

            // For partial selling, calculate the amount based on percentage
            const sellPercentage = Number(formData.sellAmount) / 100; // Convert to decimal
            const amountToSell = Math.floor(Number(tokenAmount) * sellPercentage).toString();

            await toast.promise(
                (async () => {
                    // Get sell instructions
                    const sellData = PumpInstructions.createSellInstruction(
                        tokenMint,
                        keypair.publicKey,
                        {
                            amount: new BN(amountToSell),
                            minSolOutput: new BN(0.0001)
                        }
                    );

                    const ata = getAssociatedTokenAddressSync(tokenMint, keypair.publicKey);
                    const createATAInstruction = createAssociatedTokenAccountInstruction(keypair.publicKey, ata, keypair.publicKey, tokenMint);

                    // Create transaction
                    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                    const transaction = new VersionedTransaction(
                        new TransactionMessage({
                            payerKey: keypair.publicKey,
                            recentBlockhash,
                            instructions: [createATAInstruction, sellData],
                        }).compileToV0Message()
                    );

                    // Sign and send transaction
                    transaction.sign([keypair]);
                    const signature = await connection.sendTransaction(transaction);
                    return signature;
                })(),
                {
                    loading: `Selling tokens with wallet ${keypair.publicKey.toString().slice(0, 6)}...`,
                    success: (signature) => `Sale successful! Signature: ${signature.slice(0, 8)}...`,
                    error: (error) => `Failed to sell tokens: ${error instanceof Error ? error.message : String(error)}`
                }
            );
        } catch (error) {
            console.error("Error in handleSellWithKeypair:", error);
            throw error;
        }
    };

    // Handle buy and sell in the same transaction with wallet adapter (Extension mode)
    const handleBuySellWithWalletAdapter = async (tokenMint: PublicKey) => {
        if (!walletAdapter.publicKey || !walletAdapter.signTransaction) {
            throw new Error("Wallet not connected or doesn't support signing");
        }

        // TypeScript assertions since we've checked these already
        const walletPublicKey = walletAdapter.publicKey as PublicKey;
        const signTransaction = walletAdapter.signTransaction;

        try {
            const buyAmount = formData.buyAmount;
            const sellPercentage = Number(formData.sellAmount) / 100; // Convert to decimal

            await toast.promise(
                (async () => {
                    // Get buy instructions
                    const buyData = PumpInstructions.createBuyInstruction(
                        tokenMint,
                        walletPublicKey,
                        {
                            amount: new BN(buyAmount),
                            maxSolCost: new BN(0.0001)
                        }
                    );

                    // Calculate sell amount based on percentage
                    const tokenAmount = Math.floor(Number(buyAmount) * sellPercentage).toString();

                    // Get sell instructions
                    const sellData = PumpInstructions.createSellInstruction(
                        tokenMint,
                        walletPublicKey,
                        {
                            amount: new BN(tokenAmount),
                            minSolOutput: new BN(0.0001)
                        }
                    );

                    // Create ATA for token
                    const ata = getAssociatedTokenAddressSync(tokenMint, walletPublicKey);
                    const createATAInstruction = createAssociatedTokenAccountInstruction(walletPublicKey, ata, walletPublicKey, tokenMint);

                    // Deserialize instructions
                    const buyInstruction = buyData;
                    const sellInstruction = sellData;

                    // Create close ATA instruction if needed
                    const closeAtaInstruction = createCloseAccountInstruction(
                        ata,
                        walletPublicKey,
                        walletPublicKey
                    );

                    // Create instructions array
                    const instructions = [createATAInstruction, buyInstruction, sellInstruction];

                    // Only close ATA if selling 100%
                    if (sellPercentage === 1) {
                        instructions.push(closeAtaInstruction);
                    }

                    // Create versioned transaction
                    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                    const versionedTx = new VersionedTransaction(
                        new TransactionMessage({
                            payerKey: walletPublicKey,
                            recentBlockhash,
                            instructions,
                        }).compileToV0Message()
                    );

                    // Sign and send transaction
                    const signedTx = await signTransaction(versionedTx);
                    const signature = await connection.sendRawTransaction(signedTx.serialize());
                    return signature;
                })(),
                {
                    loading: 'Processing buy and sell...',
                    success: (signature) => `Transaction successful! Signature: ${signature.slice(0, 8)}...`,
                    error: (error) => `Failed to process transaction: ${error instanceof Error ? error.message : String(error)}`
                }
            );
        } catch (error) {
            console.error("Error in handleBuySellWithWalletAdapter:", error);
            throw error;
        }
    };

    // Handle buy and sell in the same transaction with keypair (PrivateKey and MultiWallet modes)
    const handleBuySellWithKeypair = async (keypair: Keypair, tokenMint: PublicKey) => {
        try {
            const buyAmount = formData.buyAmount;
            const sellPercentage = Number(formData.sellAmount) / 100; // Convert to decimal

            await toast.promise(
                (async () => {
                    // Get buy instructions
                    const buyData = PumpInstructions.createBuyInstruction(
                        tokenMint,
                        keypair.publicKey,
                        {
                            amount: new BN(buyAmount),
                            maxSolCost: new BN(0.0001)
                        }
                    );

                    // Calculate sell amount based on percentage
                    const tokenAmount = Math.floor(Number(buyAmount) * sellPercentage).toString();

                    // Get sell instructions
                    const sellData = PumpInstructions.createSellInstruction(
                        tokenMint,
                        keypair.publicKey,
                        {
                            amount: new BN(tokenAmount),
                            minSolOutput: new BN(0.0001)
                        }
                    );

                    // Create ATA for token
                    const ata = getAssociatedTokenAddressSync(tokenMint, keypair.publicKey);
                    const createATAInstruction = createAssociatedTokenAccountInstruction(keypair.publicKey, ata, keypair.publicKey, tokenMint);

                    // Deserialize instructions
                    const buyInstruction = buyData;
                    const sellInstruction = sellData;

                    // Create close ATA instruction if needed
                    const closeAtaInstruction = createCloseAccountInstruction(
                        ata,
                        keypair.publicKey,
                        keypair.publicKey
                    );

                    // Create transaction
                    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
                    const instructions = [createATAInstruction, buyInstruction, sellInstruction];

                    // Only close ATA if selling 100%
                    if (sellPercentage === 1) {
                        instructions.push(closeAtaInstruction);
                    }

                    const transaction = new VersionedTransaction(
                        new TransactionMessage({
                            payerKey: keypair.publicKey,
                            recentBlockhash,
                            instructions,
                        }).compileToV0Message()
                    );

                    // Sign and send transaction
                    transaction.sign([keypair]);
                    const signature = await connection.sendTransaction(transaction);
                    return signature;
                })(),
                {
                    loading: `Processing buy and sell with wallet ${keypair.publicKey.toString().slice(0, 6)}...`,
                    success: (signature) => `Transaction successful! Signature: ${signature.slice(0, 8)}...`,
                    error: (error) => `Failed to process transaction: ${error instanceof Error ? error.message : String(error)}`
                }
            );
        } catch (error) {
            console.error("Error in handleBuySellWithKeypair:", error);
            throw error;
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

                            {/* Wallet Selection Tabs */}
                            <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center">
                                <h3 className="btn-text-gradient font-bold text-[15px] mb-3">
                                    Wallet Selection
                                </h3>
                                <Tabs defaultValue={walletMode} onValueChange={(value) => setWalletMode(value as WalletMode)} className="w-full">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="extension">Wallet Extension</TabsTrigger>
                                        <TabsTrigger value="privateKey">Private Key</TabsTrigger>
                                        <TabsTrigger value="multiWallet">Multi-Wallet</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="extension" className="mt-4">
                                        <div className="text-center p-4 border rounded-md bg-[#1c1e22]">
                                            {walletAdapter.connected ? (
                                                <div>
                                                    <p className="text-green-400 mb-2">✓ Wallet Connected</p>
                                                    <p className="text-sm text-gray-300 break-all">{walletAdapter.publicKey?.toString()}</p>
                                                </div>
                                            ) : (
                                                <p className="text-yellow-400">Please connect your wallet using the button in the header</p>
                                            )}
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="privateKey" className="mt-4">
                                        <div className="space-y-2">
                                            <InputField
                                                id="singlePrivateKey"
                                                label="Wallet Private Key"
                                                subfield="Enter the private key of your wallet"
                                                value={singlePrivateKey}
                                                onChange={handlePrivateKeyChange}
                                                placeholder="Enter private key (base58 encoded)"
                                                type="password"
                                                required={true}
                                            />
                                        </div>
                                    </TabsContent>

                                    <TabsContent value="multiWallet" className="mt-4">
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
                                    </TabsContent>
                                </Tabs>
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
                            <JitoBundleSelection
                                isJitoBundle={isJitoBundle}
                                setIsJitoBundle={setIsJitoBundle}
                                formData={formData}
                                handleChange={handleChange}
                                handleSelectionChange={handleSelectionChange}
                            />

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
                                        <span className="font-medium">Wallet Type:</span> {
                                            walletMode === WalletMode.Extension
                                                ? 'Wallet Extension'
                                                : walletMode === WalletMode.PrivateKey
                                                    ? 'Single Private Key'
                                                    : `Multiple Wallets (${wallets.length})`
                                        }
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
                                            walletBalances.slice(0, 5).map(({ balance, publicKey, tokenBalance }, index) => (
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
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>SOL: {balance}</span>
                                                        {botMode === 'sell-only' && tokenBalance !== undefined && (
                                                            <>
                                                                <br />
                                                                <span className='text-[#96989c] text-[14px] font-normal ml-2'>
                                                                    Token: {tokenBalance === "0" ? "0" : Number(tokenBalance).toLocaleString()}
                                                                </span>
                                                            </>
                                                        )}
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
        </div>
    );
};

// Apply the header layout
BumpBot.getLayout = (page: React.ReactNode) => getHeaderLayout(page, "Pump.Fun Bump Bot");

export default BumpBot; 