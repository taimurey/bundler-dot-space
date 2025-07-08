import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, TransactionInstruction, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import LaunchLabSDK from './launch-lab-interface';
import base58 from 'bs58';
import { WalletEntry } from '../instructions/pump-bundler/wallet-input';
import { tipAccounts } from '../instructions/pump-bundler/constants';
import { sendBundleToPuff } from './puff-bundle-api';

// Interface for LaunchLab token creator parameters
interface LaunchLabTokenCreator {
    tokenName: string;
    tokenSymbol: string;
    decimals: number;
    tokenUri: string;
    deployerPrivateKey: string;
    sniperPrivateKey: string;
    buyerextraWallets: string[];
    buyerWalletAmounts: string[];
    initialBuyAmount: string;
    snipeEnabled: boolean;
    snipeAmount: string;
    platform?: string;
    bundleTip: string;
    blockEngine: string;
}

// Helper function to get a random element from an array (same as in misc.ts)
function getRandomElement<T>(array: T[]): T {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

export const LaunchLabBundler = async (
    connection: Connection,
    pool_data: LaunchLabTokenCreator,
    TokenKeypair: Keypair
) => {
    try {
        // Create the deployer keypair from private key
        const devKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(pool_data.deployerPrivateKey)));

        // Convert amount to lamports (SOL * 10^9)
        const buyAmount = parseFloat(pool_data.initialBuyAmount) * LAMPORTS_PER_SOL;

        // Create an array to store all the versioned transactions for the bundle
        const bundleTxns: VersionedTransaction[] = [];

        console.log(buyAmount);

        let createonly = true;
        if (buyAmount > 0) {
            createonly = false;
        } else {
            createonly = true;
        }

        // Create the token and launch pad
        const { mintAddress, poolId, transactions } = await LaunchLabSDK.createMint({
            privateKey: pool_data.deployerPrivateKey,
            connection,
            name: pool_data.tokenName,
            symbol: pool_data.tokenSymbol,
            decimals: pool_data.decimals,
            uri: pool_data.tokenUri,
            buyAmount: buyAmount,
            platform: pool_data.platform,
            createOnly: createonly,
        });

        console.log(poolId);

        // Add creation transactions to the bundle
        for (const tx of transactions) {
            if (tx instanceof VersionedTransaction) {
                bundleTxns.push(tx);
            } else {
                // Convert legacy transaction to versioned if needed
                const versionedTx = await convertToVersionedTransaction(connection, tx, devKeypair);
                bundleTxns.push(versionedTx);
            }
        }

        // Create the buy transaction
        const { transaction: sniperTransaction } = await LaunchLabSDK.buyToken({
            privateKey: pool_data.sniperPrivateKey,
            connection,
            mintAddress,
            buyAmount: buyAmount.toString(),
        });



        // Skip buyer wallets processing if there are no buyer wallets
        const buyerWallets = [...pool_data.buyerextraWallets];
        if (buyerWallets.length > 0) {
            let lastNonZeroBalanceIndex = -1;

            // Add main buyer wallet if provided
            if (pool_data.sniperPrivateKey) {
                buyerWallets.unshift(pool_data.sniperPrivateKey);
            }

            // Find the last non-zero balance wallet
            for (let i = 0; i < buyerWallets.length; i++) {
                const buyerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(buyerWallets[i])));
                let balance;

                if (buyerWallets.length === 1) {
                    balance = parseFloat(pool_data.buyerWalletAmounts[i]) * LAMPORTS_PER_SOL;
                } else {
                    const walletBalance = await connection.getBalance(buyerWallet.publicKey);
                    // Ensure balance is at least enough for transaction fees
                    if (walletBalance <= 0.003 * LAMPORTS_PER_SOL) {
                        console.log(`Skipping buyer ${i} due to insufficient balance`);
                        continue;
                    }
                    balance = walletBalance - (0.003 * LAMPORTS_PER_SOL);
                }

                if (balance <= 0) {
                    console.log(`Skipping buyer ${i} due to zero or negative balance`);
                    continue;
                }

                // Track the last non-zero balance wallet
                lastNonZeroBalanceIndex = i;
            }

            // Track if any buyer transactions were actually added
            let buyerTxAdded = false;

            // Create a bundle for each buyer
            for (let i = 0; i < buyerWallets.length; i++) {
                try {
                    const buyerWallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(buyerWallets[i])));

                    let balance;
                    if (buyerWallets.length === 1) {
                        balance = parseFloat(pool_data.buyerWalletAmounts[i]) * LAMPORTS_PER_SOL;
                    } else {
                        const walletBalance = await connection.getBalance(buyerWallet.publicKey);
                        // Ensure balance is at least enough for transaction fees
                        if (walletBalance <= 0.003 * LAMPORTS_PER_SOL) {
                            console.log(`Skipping buyer ${i} due to insufficient balance`);
                            continue;
                        }
                        balance = walletBalance - (0.003 * LAMPORTS_PER_SOL);
                    }

                    if (balance <= 0) {
                        console.log(`Skipping buyer ${i} due to zero or negative balance`);
                        continue;
                    }

                    // Use 98% of the balance for the buy to allow for fees
                    const buyerSolAmount = Math.floor(balance * 0.98);

                    // Create a buyer transaction
                    const { transaction: buyerTransaction } = await LaunchLabSDK.buyToken({
                        privateKey: buyerWallets[i],
                        connection,
                        mintAddress,
                        buyAmount: buyerSolAmount.toString(),
                    });

                    // Add buyer transactions to bundle
                    if (buyerTransaction instanceof VersionedTransaction) {
                        // Add tip instruction if this is the last non-zero balance wallet
                        if (i === lastNonZeroBalanceIndex) {
                            // Need to create a new transaction with tip added
                            const tipAmount = parseFloat(pool_data.bundleTip) * LAMPORTS_PER_SOL;

                            // Get a random block engine tip address
                            const tipAddressStr = getRandomTipAddress();
                            const tipAddress = new PublicKey(tipAddressStr);

                            // Decompile the versioned transaction
                            const originalMessage = TransactionMessage.decompile(buyerTransaction.message);

                            // Create a tip instruction
                            const tipIx = SystemProgram.transfer({
                                fromPubkey: devKeypair.publicKey,
                                toPubkey: tipAddress,
                                lamports: tipAmount
                            });

                            // Create a new message with the tip instruction added
                            const newMessage = new TransactionMessage({
                                payerKey: buyerWallet.publicKey,
                                recentBlockhash: originalMessage.recentBlockhash,
                                instructions: [...originalMessage.instructions, tipIx],
                            }).compileToV0Message();

                            // Create and sign the new transaction
                            const newTx = new VersionedTransaction(newMessage);
                            newTx.sign([buyerWallet, devKeypair]); // Need both signers

                            bundleTxns.push(newTx);
                        } else {
                            bundleTxns.push(buyerTransaction);
                        }
                    } else {
                        // For legacy transactions, need to convert to versioned
                        if (i === lastNonZeroBalanceIndex) {
                            // For the last wallet, need to add the tip instruction
                            const tipAmount = parseFloat(pool_data.bundleTip) * LAMPORTS_PER_SOL;

                            // Clone the transaction and add the tip instruction
                            const txClone = Transaction.from(buyerTransaction.serialize());

                            // Get a random block engine tip address
                            const tipAddressStr = getRandomTipAddress();
                            const tipAddress = new PublicKey(tipAddressStr);

                            // Add tip instruction
                            txClone.add(
                                SystemProgram.transfer({
                                    fromPubkey: devKeypair.publicKey,
                                    toPubkey: tipAddress,
                                    lamports: tipAmount
                                })
                            );

                            // Convert to versioned transaction
                            const versionedBuyerTx = await convertToVersionedTransaction(
                                connection,
                                txClone,
                                buyerWallet,
                                [devKeypair] // Additional signers for the tip
                            );

                            bundleTxns.push(versionedBuyerTx);
                        } else {
                            // Regular conversion without tip
                            const versionedBuyerTx = await convertToVersionedTransaction(
                                connection,
                                buyerTransaction,
                                buyerWallet
                            );
                            bundleTxns.push(versionedBuyerTx);
                        }
                    }

                    buyerTxAdded = true;
                } catch (error) {
                    console.error(`Error processing buyer wallet ${i}:`, error);
                    // Continue with other wallets even if one fails
                }
            }

            // If no buyer transactions were added due to all being skipped,
            // we need to ensure a tip transaction is included
            if (!buyerTxAdded) {
                console.log("All buyers were skipped. Adding a tip transaction to the bundle.");

                // Get the latest blockhash
                const { blockhash } = await connection.getLatestBlockhash();

                // Create a tip instruction using the dev keypair
                const tipAmount = parseFloat(pool_data.bundleTip) * LAMPORTS_PER_SOL;

                // Get a random block engine tip address
                const tipAddressStr = getRandomTipAddress();
                const tipAddress = new PublicKey(tipAddressStr);

                // Create tip instruction
                const tipIx = SystemProgram.transfer({
                    fromPubkey: devKeypair.publicKey,
                    toPubkey: tipAddress,
                    lamports: tipAmount
                });

                // Create a versioned transaction for the tip
                const tipMessage = new TransactionMessage({
                    payerKey: devKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions: [tipIx],
                }).compileToV0Message();

                const tipTx = new VersionedTransaction(tipMessage);
                tipTx.sign([devKeypair]);

                bundleTxns.push(tipTx);
            }
        } else {
            console.log("No buyer wallets");

            // If there are no buyer wallets, add the tip instruction to the developer transaction
            // by updating the last transaction in the bundle
            if (bundleTxns.length > 0) {
                console.log("Adding tip instruction to the last transaction");

                const tipAmount = parseFloat(pool_data.bundleTip) * LAMPORTS_PER_SOL;

                // Get a random block engine tip address
                const tipAddressStr = getRandomTipAddress();
                const tipAddress = new PublicKey(tipAddressStr);

                // Get the last transaction
                const lastTxIndex = bundleTxns.length - 1;
                const originalTx = bundleTxns[lastTxIndex];

                // Decompile the message from the last transaction
                const originalMessage = TransactionMessage.decompile(originalTx.message);

                // Add the tip instruction to the transaction
                const tipIx = SystemProgram.transfer({
                    fromPubkey: devKeypair.publicKey,
                    toPubkey: tipAddress,
                    lamports: tipAmount
                });

                // Create a new transaction message with the tip included
                const newMessage = new TransactionMessage({
                    payerKey: devKeypair.publicKey,
                    recentBlockhash: originalMessage.recentBlockhash,
                    instructions: [...originalMessage.instructions, tipIx],
                }).compileToV0Message();

                // Create and sign the new transaction
                const newTx = new VersionedTransaction(newMessage);
                newTx.sign([devKeypair]);

                // Replace the last transaction
                bundleTxns[lastTxIndex] = newTx;
            } else {
                // If no transactions exist yet (unlikely), create a new one for the tip
                const { blockhash } = await connection.getLatestBlockhash();

                const tipAmount = parseFloat(pool_data.bundleTip) * LAMPORTS_PER_SOL;

                // Get a random block engine tip address
                const tipAddressStr = getRandomTipAddress();
                const tipAddress = new PublicKey(tipAddressStr);

                // Create tip instruction
                const tipIx = SystemProgram.transfer({
                    fromPubkey: devKeypair.publicKey,
                    toPubkey: tipAddress,
                    lamports: tipAmount
                });

                // Create a versioned transaction for the tip
                const tipMessage = new TransactionMessage({
                    payerKey: devKeypair.publicKey,
                    recentBlockhash: blockhash,
                    instructions: [tipIx],
                }).compileToV0Message();

                const tipTx = new VersionedTransaction(tipMessage);
                tipTx.sign([devKeypair]);

                bundleTxns.push(tipTx);
            }
        }

        // Encode transactions for sending to block engine
        const encodedBundleTxns = bundleTxns.map(tx => base58.encode(tx.serialize()));
        const encodedSniperTxns = [base58.encode(sniperTransaction.serialize())];

        const Bundledtxns = [...encodedBundleTxns, ...encodedSniperTxns];

        // Send to Puff.space bundler API
        const bundleResponse = await sendBundleToPuff(
            Bundledtxns,
            pool_data.blockEngine,
            devKeypair.publicKey.toString()
        );

        return {
            mintAddress,
            poolId,
            bundleId: bundleResponse.bundleId,
            blockEngine: pool_data.blockEngine
        };
    } catch (error) {
        console.error('Error in LaunchLabBundler:', error);
        throw error;
    }
};

// Helper function to convert legacy Transaction to VersionedTransaction
async function convertToVersionedTransaction(
    connection: Connection,
    tx: Transaction,
    primarySigner: Keypair,
    additionalSigners: Keypair[] = []
): Promise<VersionedTransaction> {
    // Get the latest blockhash if not already set
    if (!tx.recentBlockhash) {
        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
    }

    // Make sure the fee payer is set
    tx.feePayer = primarySigner.publicKey;

    // Sign the transaction with the primary signer and any additional signers
    tx.sign(primarySigner, ...additionalSigners);

    // Extract the instructions from the legacy transaction
    const instructions: TransactionInstruction[] = tx.instructions;

    // Create a versioned transaction
    const messageV0 = new TransactionMessage({
        payerKey: primarySigner.publicKey,
        recentBlockhash: tx.recentBlockhash,
        instructions,
    }).compileToV0Message();

    const versionedTx = new VersionedTransaction(messageV0);

    // Sign the versioned transaction
    versionedTx.sign([primarySigner, ...additionalSigners]);

    return versionedTx;
}

export const LaunchLabBuyer = async (
    connection: Connection,
    buyerWallet: string,
    mintAddress: string,
    buyAmount: string,
    bundleTip: string,
    blockEngine: string
) => {
    try {
        // Convert amount to lamports (SOL * 10^9)
        const amountInLamports = parseFloat(buyAmount) * 1e9;

        // Create the buyer keypair
        const buyerKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(buyerWallet)));

        // Buy the token
        const { transaction } = await LaunchLabSDK.buyToken({
            privateKey: buyerWallet,
            connection,
            mintAddress,
            buyAmount: amountInLamports.toString(),
        });

        // Convert to versioned transaction if needed
        const versionedTx = transaction instanceof VersionedTransaction
            ? transaction
            : await convertToVersionedTransaction(connection, transaction, buyerKeypair);

        // Encode the transaction
        const encodedTx = base58.encode(versionedTx.serialize());

        // Send to Puff.space bundler API
        const bundleResponse = await sendBundleToPuff(
            [encodedTx],
            blockEngine,
            buyerKeypair.publicKey.toString()
        );

        return {
            bundleId: bundleResponse.bundleId,
            blockEngine
        };
    } catch (error) {
        console.error('Error in LaunchLabBuyer:', error);
        throw error;
    }
};

export const LaunchLabSeller = async (
    connection: Connection,
    wallets: WalletEntry[],
    feeKeypair: string,
    mintAddress: string,
    sellPercentage: string,
    bundleTip: string,
    blockEngine: string
) => {
    const bundleIds: string[] = [];

    try {
        for (const wallet of wallets) {
            let publicKeyString = '';
            try {
                // Convert the wallet entry to a keypair
                const keypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(wallet.wallet)));
                publicKeyString = keypair.publicKey.toString();

                // Get token account info to determine how many tokens to sell
                const poolInfo = await LaunchLabSDK.getPoolInfo({
                    connection,
                    mintAddress,
                });

                // Get the token balance
                const tokenAccountInfo = await connection.getParsedTokenAccountsByOwner(
                    keypair.publicKey,
                    { mint: new PublicKey(mintAddress) }
                );

                if (tokenAccountInfo.value.length === 0) {
                    console.log(`No token account found for wallet ${publicKeyString}`);
                    continue;
                }

                const tokenBalance = tokenAccountInfo.value[0].account.data.parsed.info.tokenAmount.amount;
                const sellAmount = Math.floor(parseFloat(tokenBalance) * (parseFloat(sellPercentage) / 100));

                if (sellAmount <= 0) {
                    console.log(`Sell amount is 0 for wallet ${publicKeyString}`);
                    continue;
                }

                // Sell the tokens
                const { transaction } = await LaunchLabSDK.sellToken({
                    privateKey: wallet.wallet,
                    connection,
                    mintAddress,
                    sellAmount: sellAmount.toString(),
                });

                // Convert to versioned transaction if needed
                const versionedTx = transaction instanceof VersionedTransaction
                    ? transaction
                    : await convertToVersionedTransaction(connection, transaction, keypair);

                // Encode the transaction
                const encodedTx = base58.encode(versionedTx.serialize());

                // Send to Puff.space bundler API
                const bundleResponse = await sendBundleToPuff(
                    [encodedTx],
                    blockEngine,
                    keypair.publicKey.toString()
                );

                bundleIds.push(bundleResponse.bundleId);
            } catch (error) {
                console.error(`Error processing wallet ${publicKeyString}:`, error);
            }
        }

        return bundleIds;
    } catch (error) {
        console.error('Error in LaunchLabSeller:', error);
        throw error;
    }
};

// Helper function to get a random tip address
function getRandomTipAddress(): string {
    // Use the getRandomElement function with tipAccounts array for consistency with PumpBundler
    return getRandomElement(tipAccounts);
}

