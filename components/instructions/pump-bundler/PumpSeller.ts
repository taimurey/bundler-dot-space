import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { tipAccounts } from "./constants";
import { getKeypairFromBs58, getRandomElement } from "./misc";
import base58 from "bs58";
import BN from "bn.js";
import { sendJitoBundleClient } from "../jito-bundler/sendJitoBundleClient";

interface WalletEntry {
    wallet: string;
}

// Helper function to generate sell instruction from API
async function generateSellInstruction(
    tokenMint: PublicKey,
    sellerWallet: Keypair,
    amount: BN
): Promise<TransactionInstruction> {
    try {
        const response = await fetch('https://api.bundler.space/api/sell-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet: sellerWallet.publicKey.toString(),
                mint: tokenMint.toString(),
                amount: amount.toString(),
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
        throw error;
    }
}

export async function PumpSeller(
    connection: Connection,
    wallets: WalletEntry[],
    feepayer: string,
    tokenAddress: string,
    SellPercentage: string,
    BundleTip: string,
    BlockEngineSelection: string,
): Promise<string[]> {
    const initKeypair = getKeypairFromBs58(feepayer)!;
    if (!initKeypair) {
        throw new Error("Invalid fee payer private key");
    }

    const tokenMint = new PublicKey(tokenAddress);
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const bundleResults: string[] = [];
    const bundleTxn: VersionedTransaction[] = [];

    // Keep track of valid wallets for processing
    const validWallets: { keypair: Keypair, balance: string }[] = [];

    // First, validate all wallets and check their token balances
    console.log(`Checking balances for ${wallets.length} wallets...`);
    for (const walletEntry of wallets) {
        try {
            const wallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(walletEntry.wallet)));
            const tokenAccount = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);

            try {
                const tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
                const balance = tokenBalance.value.amount;

                if (Number(balance) > 0) {
                    validWallets.push({ keypair: wallet, balance });
                    console.log(`Wallet ${wallet.publicKey.toString()} has ${balance} tokens`);
                } else {
                    console.log(`Skipping wallet ${wallet.publicKey.toString()} with zero balance`);
                }
            } catch (e) {
                console.log(`Wallet ${wallet.publicKey.toString()} has no token account or other error: ${e}`);
            }
        } catch (e) {
            console.error(`Invalid wallet key provided:`, e);
        }
    }

    console.log(`Found ${validWallets.length} wallets with tokens to sell`);

    // If no valid wallets, ensure we still send a tip transaction
    if (validWallets.length === 0) {
        console.log("No wallets with tokens to sell. Creating a tip-only transaction.");
        const tipAmount = Number(BundleTip) * LAMPORTS_PER_SOL;
        const tipIx = SystemProgram.transfer({
            fromPubkey: initKeypair.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

        const tipTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: initKeypair.publicKey,
                recentBlockhash: recentBlockhash,
                instructions: [tipIx],
            }).compileToV0Message()
        );

        tipTx.sign([initKeypair]);
        bundleTxn.push(tipTx);

        // Send the tip-only bundle
        const bundleId = await sendBundle(bundleTxn, BlockEngineSelection, bundleResults, initKeypair, connection, BundleTip);
        return [bundleId];
    }

    // Process wallets in batches
    const maxTxPerBundle = 5; // Maximum transactions per bundle
    let tipAdded = false;

    // Process each valid wallet
    for (let i = 0; i < validWallets.length; i++) {
        const { keypair: wallet, balance } = validWallets[i];
        const isLastWallet = i === validWallets.length - 1;

        // Calculate sell amount
        const totalAmount = new BN(
            Math.floor(Number(balance) * (Number(SellPercentage) / 100))
        );

        if (totalAmount.isZero() || totalAmount.isNeg()) {
            console.log(`Skipping wallet ${wallet.publicKey.toString()} due to zero sell amount`);
            continue;
        }

        try {
            console.log(`Selling ${totalAmount.toString()} tokens from wallet ${wallet.publicKey.toString()}`);
            const sellIx = await generateSellInstruction(tokenMint, wallet, totalAmount);
            const txInstructions = [sellIx];
            const signers = [wallet];

            // Add tip to the last wallet in a batch or the very last wallet
            const addTipToThisWallet = isLastWallet ||
                (bundleTxn.length === maxTxPerBundle - 1);

            if (addTipToThisWallet && !tipAdded) {
                console.log(`Adding tip to transaction from wallet ${wallet.publicKey.toString()}`);
                const tipAmount = Number(BundleTip) * LAMPORTS_PER_SOL;
                const tipIx = SystemProgram.transfer({
                    fromPubkey: initKeypair.publicKey,
                    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                    lamports: tipAmount,
                });

                txInstructions.push(tipIx);
                signers.push(initKeypair);
                tipAdded = true;
            }

            // Create and sign the transaction
            const versionedTxn = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: wallet.publicKey,
                    recentBlockhash: recentBlockhash,
                    instructions: txInstructions,
                }).compileToV0Message()
            );

            versionedTxn.sign(signers);
            bundleTxn.push(versionedTxn);

            // Send the bundle when max transactions are ready or we've reached the last wallet
            if (bundleTxn.length === maxTxPerBundle || isLastWallet) {
                // If we've reached the end and haven't added a tip yet, add it now
                if (isLastWallet && !tipAdded && bundleTxn.length > 0) {
                    console.log("Adding tip instruction to the last transaction in the bundle");

                    // Add tip to the last transaction
                    const lastTxIndex = bundleTxn.length - 1;
                    const originalTx = bundleTxn[lastTxIndex];

                    // Get the original transaction message
                    const originalMessage = TransactionMessage.decompile(originalTx.message);

                    // Create a new message with the original instructions plus the tip instruction
                    const tipAmount = Number(BundleTip) * LAMPORTS_PER_SOL;
                    const tipIx = SystemProgram.transfer({
                        fromPubkey: initKeypair.publicKey,
                        toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                        lamports: tipAmount,
                    });

                    const newMessage = new TransactionMessage({
                        payerKey: originalMessage.payerKey,
                        recentBlockhash: recentBlockhash,
                        instructions: [...originalMessage.instructions, tipIx],
                    }).compileToV0Message();

                    // Create and sign the new transaction
                    const newTx = new VersionedTransaction(newMessage);
                    // We need to sign with both the original signer and the fee payer
                    const originalWalletKey = originalMessage.payerKey.toString();
                    const originalWallet = validWallets.find(w =>
                        w.keypair.publicKey.toString() === originalWalletKey
                    )?.keypair;

                    if (originalWallet) {
                        newTx.sign([originalWallet, initKeypair]);
                        // Replace the original transaction
                        bundleTxn[lastTxIndex] = newTx;
                    } else {
                        console.error("Could not find original wallet for signing");
                    }
                }

                // Send this batch
                await sendBundle(bundleTxn, BlockEngineSelection, bundleResults, initKeypair, connection, BundleTip);

                // Reset for next batch
                bundleTxn.length = 0;
                tipAdded = false;
            }
        } catch (error) {
            console.error(`Error processing wallet ${wallet.publicKey.toString()}:`, error);
            continue;
        }
    }

    // Send any remaining transactions in the last bundle
    if (bundleTxn.length > 0) {
        // Ensure the last bundle has a tip
        if (!tipAdded && bundleTxn.length > 0) {
            console.log("Adding tip to the last bundle");
            const lastTxIndex = bundleTxn.length - 1;
            const originalTx = bundleTxn[lastTxIndex];

            // Get the original transaction message
            const originalMessage = TransactionMessage.decompile(originalTx.message);

            // Create a new message with the original instructions plus the tip instruction
            const tipAmount = Number(BundleTip) * LAMPORTS_PER_SOL;
            const tipIx = SystemProgram.transfer({
                fromPubkey: initKeypair.publicKey,
                toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                lamports: tipAmount,
            });

            const newMessage = new TransactionMessage({
                payerKey: originalMessage.payerKey,
                recentBlockhash: recentBlockhash,
                instructions: [...originalMessage.instructions, tipIx],
            }).compileToV0Message();

            // Create and sign the new transaction
            const newTx = new VersionedTransaction(newMessage);
            // We need to sign with both the original signer and the fee payer
            const originalWalletKey = originalMessage.payerKey.toString();
            const originalWallet = validWallets.find(w =>
                w.keypair.publicKey.toString() === originalWalletKey
            )?.keypair;

            if (originalWallet) {
                newTx.sign([originalWallet, initKeypair]);
                // Replace the original transaction
                bundleTxn[lastTxIndex] = newTx;
            } else {
                console.error("Could not find original wallet for signing");
            }
        }

        await sendBundle(bundleTxn, BlockEngineSelection, bundleResults, initKeypair, connection, BundleTip);
    }

    return bundleResults;
}

async function sendBundle(
    bundleTxn: VersionedTransaction[],
    BlockEngineSelection: string,
    bundleResults: string[],
    tipKeypair: Keypair,
    connection: Connection,
    BundleTip: string
): Promise<string> {
    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));

    try {
        // Use our direct Jito SDK integration
        const tipAmount = Number(BundleTip) * LAMPORTS_PER_SOL;

        console.log(`Sending bundle with ${bundleTxn.length} transactions to ${BlockEngineSelection}`);
        console.log(`Tip amount: ${tipAmount} lamports`);

        const bundleUuid = await sendJitoBundleClient(
            `https://${BlockEngineSelection}`,
            tipKeypair,
            connection,
            EncodedbundledTxns,
            tipAmount
        );

        console.log(`Successfully sent selling bundle with ID: ${bundleUuid}`);
        bundleResults.push(bundleUuid);
        return bundleUuid;
    } catch (error) {
        console.error('Error sending bundle via Jito:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to send selling bundle: ${errorMessage}`);
    }
}