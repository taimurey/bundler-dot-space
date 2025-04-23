'use client';
import { ChangeEvent, useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { ReactNode } from 'react';
import { getHeaderLayout } from '@/components/header-layout';
import {
    ApiPoolInfoV4,
    CacheLTA,
    jsonInfo2PoolKeys,
    Liquidity,
    LiquidityPoolKeys,
    Token,
    TOKEN_PROGRAM_ID,
    TokenAccount,
    TokenAmount,
    Percent
} from '@raydium-io/raydium-sdk';
import { LAMPORTS_PER_SOL, VersionedTransaction, PublicKey, RpcResponseAndContext, GetProgramAccountsResponse, SystemProgram, Keypair, TransactionMessage } from '@solana/web3.js';
import { formatAmmKeysById } from '@/components/instructions/removeLiquidity/formatAmmKeysById';
import { getWalletTokenAccount } from '@/components/instructions/removeLiquidity/util';
import { addLookupTableInfo, makeTxVersion } from '@/components/instructions/removeLiquidity/config';
import { buildSimpleTransaction } from '@raydium-io/raydium-sdk';
import { toast } from "sonner";
import { BlockEngineLocation, InputField } from '@/components/ui/input-field';
import { BundleToast } from '@/components/bundler-toasts';
import base58 from 'bs58';
import { ApibundleSend } from '@/components/instructions/DistributeTokens/bundler';
import { WalletProfileContext } from '@/components/SolanaWallet/wallet-context';
import WalletInput, { WalletEntry } from '@/components/instructions/pump-bundler/wallet-input';
import assert from 'assert';
import { TAX_WALLET } from '@/components/instructions/pump-bundler/misc';

const RaydiumManager = () => {
    const { connection } = useConnection();
    const [poolID, setPoolID] = useState("");
    const [microLamportsInput, setMicroLamportsInput] = useState("");
    const { publicKey, sendTransaction, wallet, connected } = useWallet();
    const [targetPoolInfo, setTargetPoolInfo] = useState<ApiPoolInfoV4 | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isToggle, setIsToggle] = useState(false);
    const [activeTab, setActiveTab] = useState<'Liquidity' | 'Sell'>('Liquidity');
    const [wallets, setWallets] = useState<WalletEntry[]>([]);

    // Sell tab state
    const [sellFormData, setSellFormData] = useState({
        tokenAddress: '',
        sellPercentage: '90',
        slippagePercentage: '1',
        priorityFee: '0.001',
        BlockEngineSelection: BlockEngineLocation[2],
        BundleTip: "0.01",
        TransactionTip: "0.00001",
    });
    const [sellModeToggle, setSellModeToggle] = useState(false);
    const [sellBalances, setSellBalances] = useState<Array<{
        balance: number,
        publicKey: string,
        tokenAmount: string
    }>>([]);

    const handleMicroLamportsInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setMicroLamportsInput(event.target.value);
    };

    const handlePoolIDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setPoolID(event.target.value);
    };

    useEffect(() => {
        const fetchPoolInfo = async () => {
            setIsLoading(true);
            if (!poolID) {
                setIsLoading(false);
                return;
            }
            const info = await formatAmmKeysById(poolID);

            const deployerPrivateKey = localStorage.getItem('deployerwallets');

            const parsedDeployerPrivateKey = deployerPrivateKey ? JSON.parse(deployerPrivateKey) : null;

            const deployerWallet = parsedDeployerPrivateKey ? parsedDeployerPrivateKey.find((wallet: { name: string, wallet: string }) => wallet.name === 'Deployer') : null;

            setFormData(prevState => ({
                ...prevState,
                PoolID: poolID,
                PoolKeys: JSON.stringify(info),
                DeployerPrivateKey: deployerWallet ? deployerWallet.wallet : '',
            }));
            if (info !== undefined) {
                setTargetPoolInfo(info);
            } else {
                setTargetPoolInfo(null);
            }
            setIsLoading(false);
        };

        fetchPoolInfo();

    }, [poolID]);

    const [formData, setFormData] = useState({
        BlockEngineSelection: BlockEngineLocation[2],
        BundleTip: "0.01",
        TransactionTip: "0.00001",
        DeployerPrivateKey: "",
        PoolID: "",
        PoolKeys: "",
    });

    const handleRemoveLiquidity = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!connected || !publicKey || !wallet) {
            toast.error('Wallet not connected');
            return;
        }
        const microLamports = LAMPORTS_PER_SOL * (parseFloat(microLamportsInput));

        toast.info('Removing liquidity...');

        const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys

        const lpToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(poolKeys.lpMint), poolKeys.lpDecimals, 'LP', 'LP')
        const walletTokenAccounts = await getWalletTokenAccount(connection, publicKey)

        let tokenAccounts: RpcResponseAndContext<GetProgramAccountsResponse>;
        try {
            tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
                programId: TOKEN_PROGRAM_ID,
                mint: new PublicKey(poolKeys.lpMint),
            });
        } catch (error) {
            if (error instanceof Error) {
                toast.error(`Failed to get token accounts by owner: ${error.message}`);
            } else {
                toast.error(`Failed to get token accounts by owner: ${error}`);
            }
            return;
        }

        let balance: number | string = 0;
        for (const account of tokenAccounts.value) {
            const pubkey = account.pubkey;

            balance = await connection.getTokenAccountBalance(pubkey).then((res) => {
                console.log(res.value);
                return res.value.amount;
            });

        }

        toast.info(`LP Token Balance: ${balance}`)

        const removeLpTokenAmount = new TokenAmount(lpToken, balance)

        let removeLiquidityInstructionResponse = null;
        try {
            removeLiquidityInstructionResponse = await Liquidity.makeRemoveLiquidityInstructionSimple({
                connection: connection,
                poolKeys,
                userKeys: {
                    owner: publicKey,
                    payer: publicKey,
                    tokenAccounts: walletTokenAccounts as TokenAccount[],
                },
                amountIn: removeLpTokenAmount,
                makeTxVersion,
                computeBudgetConfig: {
                    units: 10000000,
                    microLamports,
                },
            });
        } catch (error) {
            if (error instanceof Error) {
                toast.info(`Failed to remove liquidity: ${error.message}`);
                return;
            } else {
                toast.info(`Failed to remove liquidity: ${error}`);
                return;
            }
        }

        const instructions = removeLiquidityInstructionResponse.innerTransactions;
        const minLamports = 250000000;

        const taxInstruction = SystemProgram.transfer({
            fromPubkey: publicKey,
            toPubkey: TAX_WALLET,
            lamports: minLamports,
        });

        instructions[0].instructions.push(taxInstruction);

        const {
            context: { slot: minContextSlot },
            value: { blockhash, lastValidBlockHeight },
        } = await connection.getLatestBlockhashAndContext();

        const willSendTx = await buildSimpleTransaction({
            connection: connection,
            makeTxVersion,
            payer: publicKey,
            innerTransactions: removeLiquidityInstructionResponse.innerTransactions,
            addLookupTableInfo: addLookupTableInfo as unknown as CacheLTA,
        })

        if (!isToggle) {
            for (const iTx of willSendTx) {
                if (iTx instanceof VersionedTransaction) {
                    const signature = await sendTransaction(iTx, connection, { minContextSlot });
                    toast.info(`Transaction sent: ${signature}`);
                    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
                    toast.success(`Transaction successful! ${signature}`);
                } else {
                    const signature = await sendTransaction(iTx, connection, { minContextSlot });
                    toast.info(`Transaction sent: ${signature}`);
                    await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
                    toast.success(`Transaction successful! ${signature}`);
                }
            }
        } else {
            if (!formData.DeployerPrivateKey) {
                toast.error('Deployer Private Key is required');
                return;
            }

            const signer = Keypair.fromSecretKey(base58.decode(formData.DeployerPrivateKey));

            const tipIxn = SystemProgram.transfer({
                fromPubkey: signer.publicKey,
                toPubkey: new PublicKey("DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh"),
                lamports: BigInt(Number(formData.BundleTip) * LAMPORTS_PER_SOL),
            });

            const message = new TransactionMessage({
                payerKey: publicKey,
                instructions: [tipIxn],
                recentBlockhash: blockhash,
            }).compileToV0Message();

            const tiptxn = new VersionedTransaction(message);
            willSendTx.push(tiptxn);

            const bundle: VersionedTransaction[] = [];

            if (willSendTx instanceof VersionedTransaction) {
                bundle.push(willSendTx);
            } else {
                willSendTx.forEach(tx => {
                    if (tx instanceof VersionedTransaction) {
                        bundle.push(tx);
                    }
                });
            }

            bundle.map(txn => txn.sign([signer]));

            toast.info('Please wait, bundle acceptance may take a few seconds');
            const EncodedbundledTxns = bundle.map(txn => base58.encode(txn.serialize()));
            const bundledata = {
                jsonrpc: "2.0",
                id: 1,
                method: "sendBundle",
                params: [EncodedbundledTxns]
            };

            console.log('formData:', bundledata);
            const blockengine = formData.BlockEngineSelection;
            try {
                const bundleId = await ApibundleSend(bundledata, blockengine);
                toast(
                    () => (
                        <BundleToast
                            txSig={bundleId}
                            message={'Bundle ID:'}
                        />
                    ),
                    { duration: 5000 }
                );
            } catch (error) {
                console.error(error);
            }
        }
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }

    const handleSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    }

    const handleSellFormChange = (e: ChangeEvent<HTMLInputElement>, field: string) => {
        const { value } = e.target;
        setSellFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSellSelectionChange = (e: ChangeEvent<HTMLSelectElement>, field: string) => {
        const { value } = e.target;
        setSellFormData(prevState => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSellTokens = async (event: React.MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
        if (!connected || !publicKey || !wallet) {
            toast.error('Wallet not connected');
            return;
        }

        if (wallets.length === 0 && !sellFormData.tokenAddress) {
            toast.error('Please enter a token address and add at least one wallet');
            return;
        }

        try {
            toast.info('Preparing to sell tokens...');

            // Getting pool info for the token
            const tokenMint = new PublicKey(sellFormData.tokenAddress);
            const targetPoolInfo = await formatAmmKeysById(sellFormData.tokenAddress);

            if (!targetPoolInfo) {
                toast.error('Failed to fetch pool info');
                return;
            }

            const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

            // For direct transactions (non-bundled)
            if (!sellModeToggle) {
                const walletTokenAccounts = await getWalletTokenAccount(connection, publicKey);

                // Find the token to sell
                let mintToUse = poolKeys.baseMint;
                let decimalToUse = poolKeys.baseDecimals;

                if (poolKeys.baseMint.toString() === 'So11111111111111111111111111111111111111112') {
                    mintToUse = poolKeys.quoteMint;
                    decimalToUse = poolKeys.quoteDecimals;
                }

                const inputToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(mintToUse), decimalToUse, "symbol", "name");

                // Get token accounts for this mint
                let tokenAccounts = await connection.getTokenAccountsByOwner(publicKey, {
                    programId: TOKEN_PROGRAM_ID,
                    mint: new PublicKey(mintToUse),
                });

                let balance: any = 0;
                for (let account of tokenAccounts.value) {
                    let pubkey = account.pubkey;
                    balance = await connection.getTokenAccountBalance(pubkey).then((res) => {
                        return res.value.amount;
                    });
                }

                if (balance === 0) {
                    toast.error('No tokens to sell');
                    return;
                }

                // Calculate amount to sell based on percentage
                const percentageToSell = parseFloat(sellFormData.sellPercentage) / 100;
                const tokensToSell = Math.floor(balance * percentageToSell);

                // Create token amount for the tokens to sell
                const inputTokenAmount = new TokenAmount(inputToken, tokensToSell.toString());

                // Set slippage
                const slippage = new Percent(parseFloat(sellFormData.slippagePercentage), 100);

                // Determine output token (WSOL)
                const outputToken = new Token(
                    TOKEN_PROGRAM_ID,
                    new PublicKey('So11111111111111111111111111111111111111112'),
                    9,
                    'WSOL',
                    'WSOL'
                );

                // Calculate amount out and minimum amount out based on slippage
                let amountOut, minAmountOut;
                try {
                    const result = await Liquidity.computeAmountOut({
                        poolKeys: poolKeys,
                        poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
                        amountIn: inputTokenAmount,
                        currencyOut: outputToken,
                        slippage: slippage,
                    });
                    amountOut = result.amountOut;
                    minAmountOut = result.minAmountOut;
                } catch (e) {
                    console.error("Error calculating amounts:", e);
                    toast.error('Error calculating swap amounts');
                    return;
                }

                if (amountOut.isZero()) {
                    toast.error('Insufficient input amount or liquidity in the pool');
                    return;
                }

                // Create the swap instruction
                const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
                    connection,
                    poolKeys,
                    userKeys: {
                        tokenAccounts: walletTokenAccounts as TokenAccount[],
                        owner: publicKey,
                    },
                    amountIn: inputTokenAmount,
                    amountOut: minAmountOut,
                    fixedSide: 'in',
                    makeTxVersion,
                    computeBudgetConfig: {
                        units: 10000000,
                        microLamports: LAMPORTS_PER_SOL * parseFloat(sellFormData.priorityFee),
                    },
                });

                // Add tax instruction
                const minLamports = 250000000;
                const taxInstruction = SystemProgram.transfer({
                    fromPubkey: publicKey,
                    toPubkey: TAX_WALLET,
                    lamports: minLamports,
                });

                innerTransactions[0].instructions.push(taxInstruction);

                // Get latest blockhash
                const { context: { slot: minContextSlot }, value: { blockhash, lastValidBlockHeight } } =
                    await connection.getLatestBlockhashAndContext();

                // Build the transaction
                const willSendTx = await buildSimpleTransaction({
                    connection: connection,
                    makeTxVersion,
                    payer: publicKey,
                    innerTransactions: innerTransactions,
                    addLookupTableInfo: addLookupTableInfo as unknown as CacheLTA,
                });

                // Send the transaction
                for (const iTx of willSendTx) {
                    if (iTx instanceof VersionedTransaction) {
                        const signature = await sendTransaction(iTx, connection, { minContextSlot });
                        toast.info(`Transaction sent: ${signature}`);
                        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
                        toast.success(`Transaction successful! ${signature}`);
                    } else {
                        const signature = await sendTransaction(iTx, connection, { minContextSlot });
                        toast.info(`Transaction sent: ${signature}`);
                        await connection.confirmTransaction({ blockhash, lastValidBlockHeight, signature });
                        toast.success(`Transaction successful! ${signature}`);
                    }
                }
            } else {
                // For bundled transactions
                if (wallets.length === 0) {
                    toast.error('No wallets loaded for bundles');
                    return;
                }

                // Process each wallet for selling
                const bundleResults: string[] = [];
                const bundleTxns: VersionedTransaction[] = [];
                const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

                for (const walletEntry of wallets) {
                    try {
                        const wallet = Keypair.fromSecretKey(base58.decode(walletEntry.wallet));

                        // Find the token to sell
                        let mintToUse = poolKeys.baseMint;
                        let decimalToUse = poolKeys.baseDecimals;

                        if (poolKeys.baseMint.toString() === 'So11111111111111111111111111111111111111112') {
                            mintToUse = poolKeys.quoteMint;
                            decimalToUse = poolKeys.quoteDecimals;
                        }

                        const inputToken = new Token(TOKEN_PROGRAM_ID, new PublicKey(mintToUse), decimalToUse, "symbol", "name");

                        // Get token account for this wallet and mint
                        let tokenAccounts = await connection.getTokenAccountsByOwner(wallet.publicKey, {
                            programId: TOKEN_PROGRAM_ID,
                            mint: new PublicKey(mintToUse),
                        });

                        let balance: any = 0;
                        let tokenAccount: PublicKey | null = null;

                        for (let account of tokenAccounts.value) {
                            tokenAccount = account.pubkey;
                            balance = await connection.getTokenAccountBalance(tokenAccount).then((res) => {
                                return res.value.amount;
                            });
                        }

                        if (balance === 0 || !tokenAccount) {
                            continue; // Skip wallets with no tokens
                        }

                        // Calculate amount to sell based on percentage
                        const percentageToSell = parseFloat(sellFormData.sellPercentage) / 100;
                        const tokensToSell = Math.floor(balance * percentageToSell);

                        // Create token amount for the tokens to sell
                        const inputTokenAmount = new TokenAmount(inputToken, tokensToSell.toString());

                        // Set slippage
                        const slippage = new Percent(parseFloat(sellFormData.slippagePercentage), 100);

                        // Determine output token (WSOL)
                        const outputToken = new Token(
                            TOKEN_PROGRAM_ID,
                            new PublicKey('So11111111111111111111111111111111111111112'),
                            9,
                            'WSOL',
                            'WSOL'
                        );

                        // Get all wallet token accounts
                        const walletTokenAccounts = await getWalletTokenAccount(connection, wallet.publicKey);

                        // Calculate amount out and minimum amount out based on slippage
                        let amountOut, minAmountOut;
                        try {
                            const result = await Liquidity.computeAmountOut({
                                poolKeys: poolKeys,
                                poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
                                amountIn: inputTokenAmount,
                                currencyOut: outputToken,
                                slippage: slippage,
                            });
                            amountOut = result.amountOut;
                            minAmountOut = result.minAmountOut;
                        } catch (e) {
                            console.error("Error calculating amounts:", e);
                            continue; // Skip this wallet and try the next one
                        }

                        if (amountOut.isZero()) {
                            continue; // Skip this wallet and try the next one
                        }

                        // Create the swap instruction
                        const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
                            connection,
                            poolKeys,
                            userKeys: {
                                tokenAccounts: walletTokenAccounts as TokenAccount[],
                                owner: wallet.publicKey,
                            },
                            amountIn: inputTokenAmount,
                            amountOut: minAmountOut,
                            fixedSide: 'in',
                            makeTxVersion,
                        });

                        // Build the transaction without broadcasting
                        const txs = await buildSimpleTransaction({
                            connection: connection,
                            makeTxVersion,
                            payer: wallet.publicKey,
                            innerTransactions: innerTransactions,
                            addLookupTableInfo: addLookupTableInfo as unknown as CacheLTA,
                        });

                        for (const iTx of txs) {
                            if (iTx instanceof VersionedTransaction) {
                                iTx.sign([wallet]);
                                bundleTxns.push(iTx as VersionedTransaction);
                            } else {
                                bundleTxns.push(iTx as unknown as VersionedTransaction);
                            }
                        }

                        // Add tip transaction for the last wallet
                        if (bundleTxns.length >= 4 || walletEntry === wallets[wallets.length - 1]) {
                            // Create fee payer wallet
                            const feePayerWallet = Keypair.fromSecretKey(base58.decode(formData.DeployerPrivateKey));

                            // Create tip transaction
                            const tipIxn = SystemProgram.transfer({
                                fromPubkey: feePayerWallet.publicKey,
                                toPubkey: new PublicKey("DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh"),
                                lamports: BigInt(Number(sellFormData.BundleTip) * LAMPORTS_PER_SOL),
                            });

                            const message = new TransactionMessage({
                                payerKey: feePayerWallet.publicKey,
                                instructions: [tipIxn],
                                recentBlockhash: recentBlockhash,
                            }).compileToV0Message();

                            const tiptxn = new VersionedTransaction(message);
                            tiptxn.sign([feePayerWallet]);
                            bundleTxns.push(tiptxn);

                            // Send the bundle
                            toast.info('Please wait, bundle acceptance may take a few seconds');
                            const encodedBundledTxns = bundleTxns.map(txn => base58.encode(txn.serialize()));
                            const bundledata = {
                                jsonrpc: "2.0",
                                id: 1,
                                method: "sendBundle",
                                params: [encodedBundledTxns]
                            };

                            try {
                                const bundleId = await ApibundleSend(bundledata, sellFormData.BlockEngineSelection);
                                bundleResults.push(bundleId);

                                // Clear the bundle transactions array for next batch
                                bundleTxns.length = 0;
                            } catch (error) {
                                console.error(error);
                                toast.error('Error sending bundle');
                            }
                        }
                    } catch (error) {
                        console.error(`Error processing wallet:`, error);
                    }
                }

                // Send any remaining transactions in the bundle
                if (bundleTxns.length > 0) {
                    const encodedBundledTxns = bundleTxns.map(txn => base58.encode(txn.serialize()));
                    const bundledata = {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "sendBundle",
                        params: [encodedBundledTxns]
                    };

                    try {
                        const bundleId = await ApibundleSend(bundledata, sellFormData.BlockEngineSelection);
                        bundleResults.push(bundleId);
                    } catch (error) {
                        console.error(error);
                        toast.error('Error sending final bundle');
                    }
                }

                // Show bundle results
                for (const bundleId of bundleResults) {
                    toast(
                        () => (
                            <BundleToast
                                txSig={bundleId}
                                message={'Bundle ID:'}
                            />
                        ),
                        { duration: 5000 }
                    );
                }
            }
        } catch (error) {
            toast.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
            console.error(error);
        }
    };

    // Add useEffect to fetch token balances when wallets or token address changes
    useEffect(() => {
        const fetchBalances = async () => {
            if (!sellFormData.tokenAddress || wallets.length === 0) {
                setSellBalances([]);
                return;
            }

            const allBalances = await Promise.all(
                wallets.map(async (wallet) => {
                    try {
                        const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));

                        // Fetch SOL balance
                        const solBalance = parseFloat((await connection.getBalance(keypair.publicKey) / LAMPORTS_PER_SOL).toFixed(3));

                        // Fetch token balance if tokenAddress is provided
                        let tokenBalance = '0';

                        try {
                            const tokenMint = new PublicKey(sellFormData.tokenAddress);

                            // Get pool information to determine which token to check
                            const targetPoolInfo = await formatAmmKeysById(sellFormData.tokenAddress);
                            if (targetPoolInfo) {
                                const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

                                // Determine which token to check (base or quote)
                                let mintToUse = poolKeys.baseMint;

                                if (poolKeys.baseMint.toString() === 'So11111111111111111111111111111111111111112') {
                                    mintToUse = poolKeys.quoteMint;
                                }

                                // Get token accounts for this wallet and mint
                                try {
                                    const tokenAccounts = await connection.getTokenAccountsByOwner(keypair.publicKey, {
                                        programId: TOKEN_PROGRAM_ID,
                                        mint: new PublicKey(mintToUse),
                                    });

                                    for (const account of tokenAccounts.value) {
                                        const balance = await connection.getTokenAccountBalance(account.pubkey);
                                        tokenBalance = balance.value.amount;
                                    }
                                } catch (error) {
                                    console.error('Error fetching token accounts:', error);
                                }
                            }
                        } catch (error) {
                            console.error('Error fetching token balance:', error);
                        }

                        return {
                            balance: solBalance,
                            publicKey: keypair.publicKey.toString(),
                            tokenAmount: tokenBalance
                        };
                    } catch (error) {
                        console.error('Error processing wallet:', error);
                        return { balance: 0, publicKey: 'Invalid', tokenAmount: '0' };
                    }
                })
            );

            setSellBalances(allBalances);
        };

        fetchBalances();
    }, [wallets, sellFormData.tokenAddress, connection]);

    return (
        <div className="space-y-4 mb-8 mt-10 relative mx-auto h-full">
            <form>
                <div className="flex flex-col justify-center items-center mx-auto space-y-4">
                    <div className="space-y-4 w-1/2">
                        <div>
                            <h1 className="bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] bg-clip-text text-left text-2xl font-semibold text-transparent">
                                Raydium Manager
                            </h1>
                        </div>

                        {/* Tab Buttons */}
                        <div className="flex space-x-2 mb-4 w-full">
                            <button
                                type="button"
                                className={`flex-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ${activeTab === 'Liquidity'
                                    ? 'bg-gradient-to-r from-[#5be2a3] to-[#ff9a03] text-black shadow-lg'
                                    : 'bg-[#0c0e11] text-white border border-neutral-600 hover:border-neutral-400'
                                    }`}
                                onClick={() => setActiveTab('Liquidity')}
                            >
                                Liquidity
                            </button>
                            <button
                                type="button"
                                className={`flex-1 px-6 py-3 text-base font-medium rounded-md transition-all duration-200 ${activeTab === 'Sell'
                                    ? 'bg-gradient-to-r from-[#e2c95b] to-[#03ff03] text-black shadow-lg'
                                    : 'bg-[#0c0e11] text-white border border-neutral-600 hover:border-neutral-400'
                                    }`}
                                onClick={() => setActiveTab('Sell')}
                            >
                                Sell
                            </button>
                        </div>

                        {/* Liquidity Tab */}
                        {activeTab === 'Liquidity' && (
                            <div className='border bg-[#0c0e11] bg-opacity-40 p-6 border-neutral-600 rounded-2xl shadow-[#000000] hover:shadow-2xl duration-300 ease-in-out'>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="toggle"
                                        name="toggle"
                                        checked={isToggle}
                                        onChange={() => setIsToggle(!isToggle)}
                                        className="form-checkbox h-5 w-5 text-[#ff0000] border-[#535353] duration-200 ease-in-out"
                                    />
                                    <label className="text-white font-normal" htmlFor="toggle">
                                        Use Jito Bundles
                                    </label>
                                </div>

                                {isToggle && (
                                    <div className="w-full mb-6">
                                        <label className="block mb-2 text-base text-white font-semibold" htmlFor="BlockEngineSelection">
                                            Block Engine
                                        </label>
                                        <div className="relative rounded-md shadow-sm w-full">
                                            <select
                                                id="BlockEngineSelection"
                                                value={formData.BlockEngineSelection}
                                                onChange={(e) => handleSelectionChange(e, 'BlockEngineSelection')}
                                                required={true}
                                                className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="" disabled>
                                                    Block Engine Location (Closest to you)
                                                </option>
                                                {BlockEngineLocation.map((option, index) => (
                                                    <option key={index} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>)}

                                <div className="grid grid-cols-1 gap-4 mb-6">
                                    <InputField
                                        label='Pool ID'
                                        id="poolID"
                                        type="text"
                                        value={poolID}
                                        onChange={handlePoolIDChange}
                                        placeholder="Enter Pool ID..."
                                        required={true}
                                    />

                                    {!isToggle && (
                                        <InputField
                                            label='Priority Fee (SOL)'
                                            id="microLamports"
                                            type="text"
                                            value={microLamportsInput}
                                            onChange={handleMicroLamportsInputChange}
                                            placeholder="Enter 0.001 etc..."
                                            required={true}
                                        />
                                    )}
                                </div>

                                <button
                                    onClick={handleRemoveLiquidity}
                                    disabled={isLoading}
                                    className="invoke-btn w-full font-bold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                >
                                    <span className='btn-text-gradient text-lg'>{isLoading ? 'Loading Pool...' : 'Remove Liquidity'}</span>
                                </button>
                            </div>
                        )}

                        {/* Sell Tab */}
                        {activeTab === 'Sell' && (
                            <div className='border bg-[#0c0e11] bg-opacity-40 p-6 border-neutral-600 rounded-2xl shadow-[#000000] hover:shadow-2xl duration-300 ease-in-out'>
                                <div className="flex gap-2 mb-4">
                                    <input
                                        type="checkbox"
                                        id="sellToggle"
                                        name="sellToggle"
                                        checked={sellModeToggle}
                                        onChange={() => setSellModeToggle(!sellModeToggle)}
                                        className="form-checkbox h-5 w-5 text-[#ff0000] border-[#535353] duration-200 ease-in-out"
                                    />
                                    <label className="text-white font-normal" htmlFor="sellToggle">
                                        Use Jito Bundles
                                    </label>
                                </div>

                                {sellModeToggle && (
                                    <div className="w-full mb-6">
                                        <label className="block mb-2 text-base text-white font-semibold" htmlFor="SellBlockEngineSelection">
                                            Block Engine
                                        </label>
                                        <div className="relative rounded-md shadow-sm w-full mb-4">
                                            <select
                                                id="SellBlockEngineSelection"
                                                value={sellFormData.BlockEngineSelection}
                                                onChange={(e) => handleSellSelectionChange(e, 'BlockEngineSelection')}
                                                required={true}
                                                className="block w-full px-4 py-2 rounded-md text-base border border-[#404040] text-white bg-input-boxes focus:outline-none focus:border-blue-500"
                                            >
                                                <option value="" disabled>
                                                    Block Engine Location (Closest to you)
                                                </option>
                                                {BlockEngineLocation.map((option, index) => (
                                                    <option key={index} value={option}>
                                                        {option}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className='grid grid-cols-2 gap-4 mb-4'>
                                            <InputField
                                                id="BundleTip"
                                                value={sellFormData.BundleTip}
                                                onChange={(e) => handleSellFormChange(e, 'BundleTip')}
                                                placeholder="0.01"
                                                type="number"
                                                label="Bundle Tip"
                                                required={true}
                                            />
                                            <InputField
                                                id="TransactionTip"
                                                value={sellFormData.TransactionTip}
                                                onChange={(e) => handleSellFormChange(e, 'TransactionTip')}
                                                placeholder="0.0001"
                                                type="number"
                                                label="Txn Tip (SOL)"
                                                required={true}
                                            />
                                        </div>

                                        <div className="border border-dashed border-white rounded-md shadow-lg p-4 items-start justify-center mb-6">
                                            <h3 className="btn-text-gradient font-bold text-[15px] mb-3">
                                                Add Wallets
                                            </h3>
                                            <WalletInput
                                                wallets={wallets}
                                                setWallets={setWallets}
                                                Mode={100}
                                                maxWallets={100}
                                                onChange={(walletData) => {
                                                    // No state updates required, wallets are already set in the component
                                                }}
                                                onWalletsUpdate={(walletData) => {
                                                    console.log('Updated wallet data:', walletData);
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className='grid grid-cols-1 gap-4 mb-6' id="tokeninfo">
                                    <h3 className='btn-text-gradient font-bold text-[16px] mb-2'>Percentage Sell</h3>
                                    <div className='grid grid-cols-2 gap-4'>
                                        <InputField
                                            id="tokenAddress"
                                            label="Pool ID / Token Mint"
                                            subfield='address'
                                            value={sellFormData.tokenAddress}
                                            onChange={(e) => handleSellFormChange(e, 'tokenAddress')}
                                            placeholder="Enter pool ID or token mint..."
                                            type="text"
                                            required={true}
                                        />
                                        <InputField
                                            label="Sell Percentage"
                                            subfield='%'
                                            id="sellPercentage"
                                            value={sellFormData.sellPercentage}
                                            onChange={(e) => handleSellFormChange(e, 'sellPercentage')}
                                            placeholder="90..."
                                            type="text"
                                            required={true}
                                        />
                                    </div>

                                    <div className='grid grid-cols-2 gap-4 mb-4'>
                                        <InputField
                                            label="Slippage"
                                            subfield='%'
                                            id="slippagePercentage"
                                            value={sellFormData.slippagePercentage}
                                            onChange={(e) => handleSellFormChange(e, 'slippagePercentage')}
                                            placeholder="1..."
                                            type="text"
                                            required={true}
                                        />

                                        {!sellModeToggle && (
                                            <InputField
                                                label="Priority Fee"
                                                subfield='SOL'
                                                id="priorityFee"
                                                value={sellFormData.priorityFee}
                                                onChange={(e) => handleSellFormChange(e, 'priorityFee')}
                                                placeholder="0.001"
                                                type="text"
                                                required={true}
                                            />
                                        )}
                                    </div>

                                    <button
                                        className="text-center invoke-btn w-full font-bold py-3 px-4 rounded-lg transition-all duration-200 hover:shadow-lg"
                                        type="button"
                                        onClick={handleSellTokens}
                                    >
                                        <span className="btn-text-gradient text-lg">
                                            Sell Tokens
                                            <span className="pl-3 text-[#FFC107] text-[12px] font-normal">
                                                (Sells % from {sellModeToggle ? 'all wallets' : 'connected wallet'})
                                            </span>
                                        </span>
                                    </button>
                                </div>

                                {/* Display wallet balances if in bundle mode */}
                                {sellModeToggle && sellBalances.length > 0 && (
                                    <div className='mt-4 border rounded-lg p-4 border-gray-600'>
                                        <h3 className='btn-text-gradient font-bold text-[16px] mb-2'>Wallet Balances</h3>
                                        <div className="max-h-60 overflow-y-auto">
                                            {sellBalances.map(({ balance, publicKey, tokenAmount }, index) => (
                                                <a
                                                    key={index}
                                                    href={`https://solscan.io/account/${publicKey}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="block w-full rounded-md text-base text-[#96989c] bg-transparent focus:outline-none sm:text-base max-w-full bg-gradient-to-r from-[#5cf3ac] to-[#8ce3f8] bg-clip-text text-transparent font-semibold text-[12px] select-text mb-2"
                                                    style={{ userSelect: 'text' }}
                                                >
                                                    <p>
                                                        <span className='text-[#96989c] text-[12px] font-normal'>{index + 1}: </span>
                                                        {publicKey.substring(0, 6)}...{publicKey.substring(publicKey.length - 7)}
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>SOL Balance: {balance}</span>
                                                        <br />
                                                        <span className='text-[#96989c] text-[14px] font-normal ml-2'>Token Balance: {tokenAmount}</span>
                                                    </p>
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Pool Data Logger - Moved to the right side */}
                    {/* <div className="w-1/3 mr-8">
                        <div>
                            <h1 className='bg-gradient-to-r from-[#e2c95b] to-[#03ff03] bg-clip-text text-left text-xl font-semibold text-transparent'>
                                Pool Data Logger:
                            </h1>
                            <div className='bg-[#1a232e] bg-opacity-35 border border-neutral-400 shadow rounded-2xl sm:p-6 align-baseline mt-2 max-h-[calc(100vh-200px)] overflow-y-auto'>
                                {targetPoolInfo && (
                                    <div className="mt-4 text-white">
                                        <h2 className="text-lg font-medium mb-2">Fetched Keys:</h2>
                                        <pre className="text-xs bg-black bg-opacity-30 p-3 rounded overflow-x-auto">{JSON.stringify(targetPoolInfo, null, 2)}</pre>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div> */}
                </div>
            </form>
        </div>
    );
}

RaydiumManager.getLayout = (page: ReactNode) => getHeaderLayout(page, "Raydium Manager");

export default RaydiumManager;