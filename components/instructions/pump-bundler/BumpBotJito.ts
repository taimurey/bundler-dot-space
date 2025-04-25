import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getKeypairFromBs58, getRandomElement, TAX_WALLET } from "./misc";
import { tipAccounts } from './constants';
import base58 from "bs58";
import BN from "bn.js";
import { PumpInstructions } from "./pumpfun-interface";

export interface BumpBotParams {
    // Common parameters
    tokenAddress: string;
    BlockEngineSelection: string;
    BundleTip: string;
    TransactionTip: string;

    // Buy parameters
    buyAmount: string;

    // Sell parameters
    sellAmount: string; // Percentage to sell
}

/**
 * Creates a buy bundle for the BumpBot
 */
export async function createBumpBotBuyBundle(
    connection: Connection,
    walletKeypairs: Keypair[],
    params: BumpBotParams
): Promise<{ bundleId: string; bundleResult?: any }> {
    if (walletKeypairs.length === 0) {
        throw new Error("No valid wallets provided");
    }

    const tokenMint = new PublicKey(params.tokenAddress);
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const bundleTxn: VersionedTransaction[] = [];

    // Track if we've added a tip transaction
    let tipAdded = false;

    // Process each wallet
    for (let i = 0; i < walletKeypairs.length; i++) {
        const wallet = walletKeypairs[i];
        const isLastWallet = i === walletKeypairs.length - 1;

        try {
            // Get SOL balance
            const balance = await connection.getBalance(wallet.publicKey);

            // Skip if balance is too low
            if (balance < 0.005 * LAMPORTS_PER_SOL) {
                console.log(`Skipping wallet ${wallet.publicKey.toString()} due to low balance`);
                continue;
            }

            // Calculate buy amount in lamports
            const buyAmount = new BN(Number(params.buyAmount) * LAMPORTS_PER_SOL);

            // Create ATA if needed
            const ata = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);
            const ataIx = createAssociatedTokenAccountIdempotentInstruction(
                wallet.publicKey,
                ata,
                wallet.publicKey,
                tokenMint
            );

            // Create buy instruction
            const buyIx = PumpInstructions.createBuyInstruction(
                tokenMint,
                wallet.publicKey,
                {
                    amount: buyAmount.toNumber(),
                    maxSolCost: buyAmount.muln(101).divn(100) // Add 1% slippage
                }
            );

            // Create transaction
            const instructions: TransactionInstruction[] = [ataIx, buyIx];
            const signers = [wallet];

            // Add tip to the last wallet's transaction
            if (isLastWallet && !tipAdded) {
                const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;
                const tipKeyPair = wallet; // Use last wallet for tip

                const tipIx = SystemProgram.transfer({
                    fromPubkey: tipKeyPair.publicKey,
                    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                    lamports: tipAmount
                });

                instructions.push(tipIx);
                tipAdded = true;
            }

            // Create transaction
            const versionedTx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash,
                    instructions,
                }).compileToV0Message()
            );

            // Sign transaction
            versionedTx.sign([...signers]);
            bundleTxn.push(versionedTx);

        } catch (error) {
            console.error(`Error creating buy transaction for wallet ${wallet.publicKey.toString()}:`, error);
        }
    }

    // If no transactions were added or no tip was added, create a tip-only transaction
    if (bundleTxn.length === 0 || !tipAdded) {
        // Use the first wallet for the tip-only transaction
        const tipWallet = walletKeypairs[0];
        const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;

        const tipIx = SystemProgram.transfer({
            fromPubkey: tipWallet.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

        const tipTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: tipWallet.publicKey,
                recentBlockhash,
                instructions: [tipIx],
            }).compileToV0Message()
        );

        tipTx.sign([tipWallet]);
        bundleTxn.push(tipTx);
    }

    // Encode and send the bundle
    return await sendBundle(connection, bundleTxn, params.BlockEngineSelection, walletKeypairs[0], Number(params.BundleTip));
}

/**
 * Creates a sell bundle for the BumpBot
 */
export async function createBumpBotSellBundle(
    connection: Connection,
    walletKeypairs: Keypair[],
    params: BumpBotParams
): Promise<{ bundleId: string; bundleResult?: any }> {
    if (walletKeypairs.length === 0) {
        throw new Error("No valid wallets provided");
    }

    const tokenMint = new PublicKey(params.tokenAddress);
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const bundleTxn: VersionedTransaction[] = [];

    // Track if we've added a tip transaction
    let tipAdded = false;

    // Track valid wallets that have tokens
    const validWallets: Keypair[] = [];

    // First, check which wallets have tokens to sell
    for (const wallet of walletKeypairs) {
        try {
            const ata = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);

            try {
                const tokenAccount = await connection.getAccountInfo(ata);
                if (tokenAccount) {
                    validWallets.push(wallet);
                }
            } catch (e) {
                console.log(`No token account for wallet ${wallet.publicKey.toString()}`);
            }
        } catch (e) {
            console.error(`Error checking wallet ${wallet.publicKey.toString()}:`, e);
        }
    }

    // If no valid wallets with tokens, use first wallet for tip-only transaction
    if (validWallets.length === 0) {
        const tipWallet = walletKeypairs[0];
        const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;

        const tipIx = SystemProgram.transfer({
            fromPubkey: tipWallet.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

        const tipTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: tipWallet.publicKey,
                recentBlockhash,
                instructions: [tipIx],
            }).compileToV0Message()
        );

        tipTx.sign([tipWallet]);
        bundleTxn.push(tipTx);

        // Send the tip-only bundle
        return await sendBundle(connection, bundleTxn, params.BlockEngineSelection, tipWallet, Number(params.BundleTip));
    }

    // Helper function to generate sell instruction
    async function generateSellInstruction(
        tokenMint: PublicKey,
        sellerWallet: Keypair,
        percentage: number
    ): Promise<TransactionInstruction | null> {
        try {
            const ata = getAssociatedTokenAddressSync(tokenMint, sellerWallet.publicKey);
            const tokenAccount = await connection.getAccountInfo(ata);

            if (!tokenAccount) {
                return null;
            }

            // Get token balance
            const tokenBalance = await connection.getTokenAccountBalance(ata);
            const amount = new BN(tokenBalance.value.amount);

            // Calculate sell amount based on percentage
            const sellAmount = amount.muln(percentage).divn(100);

            if (sellAmount.isZero()) {
                return null;
            }

            // Create sell instruction via API
            const response = await fetch('https://api.bundler.space/api/sell-token', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    wallet: sellerWallet.publicKey.toString(),
                    mint: tokenMint.toString(),
                    amount: sellAmount.toString(),
                }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (!data.success || !data.data?.instructions?.[0]) {
                throw new Error(data.message || 'Failed to generate sell instruction');
            }

            // Parse the instruction from the response
            const instructionData = JSON.parse(data.data.instructions[0]);
            return new TransactionInstruction({
                programId: new PublicKey(instructionData.programId),
                keys: instructionData.keys.map((key: any) => ({
                    pubkey: new PublicKey(key.pubkey),
                    isSigner: key.isSigner,
                    isWritable: key.isWritable,
                })),
                data: Buffer.from(instructionData.data, 'base64'),
            });
        } catch (error) {
            console.error('Error generating sell instruction:', error);
            return null;
        }
    }

    // Process each valid wallet
    for (let i = 0; i < validWallets.length; i++) {
        const wallet = validWallets[i];
        const isLastWallet = i === validWallets.length - 1;

        try {
            // Generate sell instruction
            const sellIx = await generateSellInstruction(
                tokenMint,
                wallet,
                Number(params.sellAmount)
            );

            if (!sellIx) {
                console.log(`No sell instruction generated for wallet ${wallet.publicKey.toString()}`);
                continue;
            }

            // Create transaction
            const instructions: TransactionInstruction[] = [sellIx];
            const signers = [wallet];

            // Add tip to the last wallet's transaction
            if (isLastWallet && !tipAdded) {
                const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;

                const tipIx = SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                    lamports: tipAmount
                });

                instructions.push(tipIx);
                tipAdded = true;
            }

            // Create transaction
            const versionedTx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash,
                    instructions,
                }).compileToV0Message()
            );

            // Sign transaction
            versionedTx.sign([...signers]);
            bundleTxn.push(versionedTx);

        } catch (error) {
            console.error(`Error creating sell transaction for wallet ${wallet.publicKey.toString()}:`, error);
        }
    }

    // If no transactions were added or no tip was added, create a tip-only transaction
    if (bundleTxn.length === 0 || !tipAdded) {
        // Use the first wallet for the tip-only transaction
        const tipWallet = walletKeypairs[0];
        const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;

        const tipIx = SystemProgram.transfer({
            fromPubkey: tipWallet.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

        const tipTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: tipWallet.publicKey,
                recentBlockhash,
                instructions: [tipIx],
            }).compileToV0Message()
        );

        tipTx.sign([tipWallet]);

        // Only add if there are no other transactions
        if (bundleTxn.length === 0) {
            bundleTxn.push(tipTx);
        } else {
            // Otherwise, update the last transaction to include the tip
            const lastTxIndex = bundleTxn.length - 1;
            const lastTx = bundleTxn[lastTxIndex];
            const lastTxMessage = TransactionMessage.decompile(lastTx.message);

            const newMessage = new TransactionMessage({
                payerKey: lastTxMessage.payerKey,
                recentBlockhash,
                instructions: [...lastTxMessage.instructions, tipIx],
            }).compileToV0Message();

            const newTx = new VersionedTransaction(newMessage);

            // Find the wallet for the last transaction
            const lastWalletKey = lastTxMessage.payerKey.toString();
            const lastWallet = validWallets.find(w => w.publicKey.toString() === lastWalletKey);

            if (lastWallet) {
                newTx.sign([lastWallet]);
                bundleTxn[lastTxIndex] = newTx;
            }
        }
    }

    // Encode and send the bundle
    return await sendBundle(connection, bundleTxn, params.BlockEngineSelection, walletKeypairs[0], Number(params.BundleTip));
}

/**
 * Creates a buy-sell bundle for the BumpBot
 */
export async function createBumpBotBuySellBundle(
    connection: Connection,
    walletKeypairs: Keypair[],
    params: BumpBotParams
): Promise<{ bundleId: string; bundleResult?: any }> {
    if (walletKeypairs.length === 0) {
        throw new Error("No valid wallets provided");
    }

    const tokenMint = new PublicKey(params.tokenAddress);
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const bundleTxn: VersionedTransaction[] = [];

    // Track if we've added a tip transaction
    let tipAdded = false;

    // First do buy transactions
    for (let i = 0; i < walletKeypairs.length; i++) {
        const wallet = walletKeypairs[i];
        const isLastWallet = i === walletKeypairs.length - 1;

        try {
            // Get SOL balance
            const balance = await connection.getBalance(wallet.publicKey);

            // Skip if balance is too low
            if (balance < 0.005 * LAMPORTS_PER_SOL) {
                console.log(`Skipping wallet ${wallet.publicKey.toString()} due to low balance`);
                continue;
            }

            // Calculate buy amount in lamports
            const buyAmount = new BN(Number(params.buyAmount) * LAMPORTS_PER_SOL);

            // Create ATA if needed
            const ata = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);
            const ataIx = createAssociatedTokenAccountIdempotentInstruction(
                wallet.publicKey,
                ata,
                wallet.publicKey,
                tokenMint
            );

            // Create buy instruction
            const buyIx = PumpInstructions.createBuyInstruction(
                tokenMint,
                wallet.publicKey,
                {
                    amount: buyAmount.toNumber(),
                    maxSolCost: buyAmount.muln(101).divn(100) // Add 1% slippage
                }
            );

            // Create transaction
            const buyTx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash,
                    instructions: [ataIx, buyIx],
                }).compileToV0Message()
            );

            // Sign transaction
            buyTx.sign([wallet]);
            bundleTxn.push(buyTx);

        } catch (error) {
            console.error(`Error creating buy transaction for wallet ${wallet.publicKey.toString()}:`, error);
        }
    }

    // Helper function to generate sell instruction
    async function generateSellInstruction(
        tokenMint: PublicKey,
        sellerWallet: Keypair,
        percentage: number
    ): Promise<TransactionInstruction | null> {
        try {
            const ata = getAssociatedTokenAddressSync(tokenMint, sellerWallet.publicKey);

            // Try to get token account info
            try {
                const tokenAccount = await connection.getAccountInfo(ata);
                if (!tokenAccount) {
                    return null;
                }

                // Get token balance
                const tokenBalance = await connection.getTokenAccountBalance(ata);
                const amount = new BN(tokenBalance.value.amount);

                // Calculate sell amount based on percentage
                const sellAmount = amount.muln(percentage).divn(100);

                if (sellAmount.isZero()) {
                    return null;
                }

                // Create sell instruction via API
                const response = await fetch('https://api.bundler.space/api/sell-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        wallet: sellerWallet.publicKey.toString(),
                        mint: tokenMint.toString(),
                        amount: sellAmount.toString(),
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();

                if (!data.success || !data.data?.instructions?.[0]) {
                    throw new Error(data.message || 'Failed to generate sell instruction');
                }

                // Parse the instruction from the response
                const instructionData = JSON.parse(data.data.instructions[0]);
                return new TransactionInstruction({
                    programId: new PublicKey(instructionData.programId),
                    keys: instructionData.keys.map((key: any) => ({
                        pubkey: new PublicKey(key.pubkey),
                        isSigner: key.isSigner,
                        isWritable: key.isWritable,
                    })),
                    data: Buffer.from(instructionData.data, 'base64'),
                });
            } catch (e) {
                console.log(`Error getting token account for wallet ${sellerWallet.publicKey.toString()}: ${e}`);
                return null;
            }
        } catch (error) {
            console.error('Error generating sell instruction:', error);
            return null;
        }
    }

    // Then do sell transactions
    for (let i = 0; i < walletKeypairs.length; i++) {
        const wallet = walletKeypairs[i];
        const isLastWallet = i === walletKeypairs.length - 1;

        try {
            // Generate sell instruction
            const sellIx = await generateSellInstruction(
                tokenMint,
                wallet,
                Number(params.sellAmount)
            );

            if (!sellIx) {
                console.log(`No sell instruction generated for wallet ${wallet.publicKey.toString()}`);
                continue;
            }

            // Create transaction instructions and signers
            const instructions: TransactionInstruction[] = [sellIx];
            const signers = [wallet];

            // Add tip to the last wallet's transaction
            if (isLastWallet && !tipAdded) {
                const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;

                const tipIx = SystemProgram.transfer({
                    fromPubkey: wallet.publicKey,
                    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                    lamports: tipAmount
                });

                instructions.push(tipIx);
                tipAdded = true;
            }

            // Create transaction
            const sellTx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash,
                    instructions,
                }).compileToV0Message()
            );

            // Sign transaction
            sellTx.sign([...signers]);
            bundleTxn.push(sellTx);

        } catch (error) {
            console.error(`Error creating sell transaction for wallet ${wallet.publicKey.toString()}:`, error);
        }
    }

    // If no transactions were added or no tip was added, create a tip-only transaction
    if (bundleTxn.length === 0 || !tipAdded) {
        // Use the first wallet for the tip-only transaction
        const tipWallet = walletKeypairs[0];
        const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;

        const tipIx = SystemProgram.transfer({
            fromPubkey: tipWallet.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

        const tipTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: tipWallet.publicKey,
                recentBlockhash,
                instructions: [tipIx],
            }).compileToV0Message()
        );

        tipTx.sign([tipWallet]);

        // Only add if there are no other transactions
        if (bundleTxn.length === 0) {
            bundleTxn.push(tipTx);
        } else if (!tipAdded) {
            // Otherwise, update the last transaction to include the tip
            const lastTxIndex = bundleTxn.length - 1;
            const lastTx = bundleTxn[lastTxIndex];
            const lastTxMessage = TransactionMessage.decompile(lastTx.message);

            const newMessage = new TransactionMessage({
                payerKey: lastTxMessage.payerKey,
                recentBlockhash,
                instructions: [...lastTxMessage.instructions, tipIx],
            }).compileToV0Message();

            const newTx = new VersionedTransaction(newMessage);

            // Find the wallet for the last transaction
            const lastWalletKey = lastTxMessage.payerKey.toString();
            const lastWallet = walletKeypairs.find(w => w.publicKey.toString() === lastWalletKey);

            if (lastWallet) {
                newTx.sign([lastWallet]);
                bundleTxn[lastTxIndex] = newTx;
            }
        }
    }

    // Encode and send the bundle
    return await sendBundle(connection, bundleTxn, params.BlockEngineSelection, walletKeypairs[0], Number(params.BundleTip));
}

/**
 * Sends a bundle to the specified Jito block engine
 */
async function sendBundle(
    connection: Connection,
    bundleTxn: VersionedTransaction[],
    blockEngineUrl: string,
    tipKeypair: Keypair,
    tipAmount: number
): Promise<{ bundleId: string; bundleResult?: any }> {
    // Encode transactions
    const encodedBundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));

    try {
        console.log(`Sending bundle to Jito block engine: ${blockEngineUrl}`);
        console.log(`Tip amount: ${tipAmount} lamports`);
        console.log(`Total transactions in bundle: ${encodedBundledTxns.length}`);

        // Get the current window.location.origin for the absolute URL
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        // Make a direct request to the server-side API with absolute URL
        const response = await fetch(`${origin}/api/jito-bundle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                blockEngineUrl,
                tipKeyPairBase58: base58.encode(tipKeypair.secretKey),
                rpcEndpoint: connection.rpcEndpoint,
                transactions: encodedBundledTxns,
                tipAmount: tipAmount * LAMPORTS_PER_SOL
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send Jito bundle');
        }

        // Return both the bundle ID and result (if available) from the server response
        console.log(`Successfully sent bundle with UUID: ${data.bundleId}`);
        if (data.bundleResult) {
            console.log(`Bundle result received: ${JSON.stringify(data.bundleResult)}`);
        }

        return {
            bundleId: data.bundleId,
            bundleResult: data.bundleResult
        };
    } catch (error) {
        console.error('Error sending bundle via Jito:', error);
        // Properly stringify the error object for better debugging
        const errorDetails = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
        console.error('Full error details:', errorDetails);

        // Extract response details if available
        let errorMessage = error instanceof Error ? error.message : String(error);
        if (error instanceof Error && 'cause' in error) {
            errorMessage += ` - Cause: ${JSON.stringify(error.cause)}`;
        }

        throw new Error(`Failed to send bundle via Jito: ${errorMessage}`);
    }
} 