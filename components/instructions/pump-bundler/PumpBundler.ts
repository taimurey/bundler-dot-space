import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getKeypairFromBs58, getRandomElement, TAX_WALLET } from "./misc";
import { GLOBAL_STATE, tipAccounts } from './constants';
import { uploadMetaData } from "@/components/TransactionUtils/token";
import base58 from "bs58";
import BN from "bn.js";
import PumpFunSDK, { PumpInstructions } from "./pumpfun-interface";

interface PumpTokenCreator {
    coinname: string;
    symbol: string;
    websiteUrl: string;
    twitterUrl: string;
    deployerPrivateKey: string;
    buyerPrivateKey: string;
    buyerextraWallets: string[];
    BuyertokenbuyAmount: string,
    DevtokenbuyAmount: string,
    telegramUrl: string;
    BundleTip: string;
    TransactionTip: string;
    BlockEngineSelection: string;
}



// Calculate buy tokens and new reserves
function calculateBuyTokensAndNewReserves(solAmount: BN, reserves: any) {
    // Make sure we're working with BN instances
    const virtualSolReserves = new BN(reserves.virtualSolReserves);
    const virtualTokenReserves = new BN(reserves.virtualTokenReserves);
    const realTokenReserves = new BN(reserves.realTokenReserves);

    // Calculate new reserves
    const product = virtualSolReserves.mul(virtualTokenReserves);
    const newSolReserves = virtualSolReserves.add(solAmount);

    // Prevent division by zero or negative values
    if (newSolReserves.lte(new BN(0))) {
        return {
            tokenAmount: new BN(0),
            newReserves: {
                virtualSolReserves,
                realTokenReserves,
                virtualTokenReserves,
            },
        };
    }

    const newTokenAmount = product.div(newSolReserves).add(new BN(1));
    let tokenAmount = virtualTokenReserves.sub(newTokenAmount);

    // Ensure token amount is not negative
    if (tokenAmount.lt(new BN(0))) {
        tokenAmount = new BN(0);
    }

    // Limit token amount by available real tokens
    const finalTokenAmount = BN.min(tokenAmount, realTokenReserves);

    // Ensure final token amount is not negative
    if (finalTokenAmount.lt(new BN(0))) {
        return {
            tokenAmount: new BN(0),
            newReserves: {
                virtualSolReserves: newSolReserves,
                realTokenReserves,
                virtualTokenReserves,
            },
        };
    }

    // Calculate new virtual token reserves
    const newVirtualTokenReserves = virtualTokenReserves.sub(finalTokenAmount);

    // Validate and ensure positive values
    return {
        tokenAmount: finalTokenAmount,
        newReserves: {
            virtualSolReserves: newSolReserves,
            realTokenReserves: realTokenReserves.sub(finalTokenAmount).lt(new BN(0)) ? new BN(0) : realTokenReserves.sub(finalTokenAmount),
            virtualTokenReserves: newVirtualTokenReserves.lt(new BN(0)) ? new BN(0) : newVirtualTokenReserves,
        },
    };
}

export async function PumpBundler(
    connection: Connection,
    pool_data: PumpTokenCreator,
    TokenKeypair: Keypair,
    metadata: any,
): Promise<{ bundleId: string; bundleResult?: any }> {
    const uri = await uploadMetaData(metadata);
    const devkeypair = getKeypairFromBs58(pool_data.deployerPrivateKey);

    if (!devkeypair) {
        throw new Error("Invalid deployer private key");
    }

    const bundleTxn = [];

    const pumpFunSDK = new PumpFunSDK(connection, devkeypair);
    // Fetch global state using borsh
    const globalStateData = await pumpFunSDK.getGlobalAccount();

    const createIx = PumpInstructions.createCreateInstruction(
        TokenKeypair.publicKey,
        devkeypair.publicKey,
        devkeypair.publicKey,
        {
            name: pool_data.coinname,
            symbol: pool_data.symbol,
            uri: uri,
        }
    );

    // Ensure all values are BN instances for correct calculation
    const tempBondingCurveData = {
        virtualTokenReserves: new BN(globalStateData?.initialVirtualTokenReserves || 0),
        virtualSolReserves: new BN(globalStateData?.initialVirtualSolReserves || 0),
        realTokenReserves: new BN(globalStateData?.initialRealTokenReserves || 0),
    };

    const associatedToken = getAssociatedTokenAddressSync(TokenKeypair.publicKey, devkeypair.publicKey);
    const devBuyAmount = new BN(Number(pool_data.DevtokenbuyAmount) * LAMPORTS_PER_SOL);

    // Calculate dev buy quote with correct BN values
    const devBuyQuote1 = calculateBuyTokensAndNewReserves(devBuyAmount, tempBondingCurveData);
    console.log("devBuyQuote1", {
        tokenAmount: devBuyQuote1.tokenAmount.toString(),
        newReserves: {
            virtualSolReserves: devBuyQuote1.newReserves.virtualSolReserves.toString(),
            realTokenReserves: devBuyQuote1.newReserves.realTokenReserves.toString(),
            virtualTokenReserves: devBuyQuote1.newReserves.virtualTokenReserves.toString(),
        }
    });

    const devMaxSol = devBuyAmount.muln(101).divn(100);
    const devBuyIx = PumpInstructions.createBuyInstruction(
        TokenKeypair.publicKey,
        devkeypair.publicKey,
        {
            amount: devBuyAmount.toNumber(),
            maxSolCost: devMaxSol
        }
    );

    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
        devkeypair.publicKey,
        associatedToken,
        devkeypair.publicKey,
        TokenKeypair.publicKey,
    );

    const taxIx = SystemProgram.transfer({
        fromPubkey: devkeypair.publicKey,
        toPubkey: TAX_WALLET,
        lamports: 0.1 * LAMPORTS_PER_SOL
    });

    const devIxs: TransactionInstruction[] = [];
    devIxs.push(createIx);
    devIxs.push(ataIx);
    devIxs.push(devBuyIx);

    // Add tax payment to the developer transaction
    devIxs.push(taxIx);

    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    console.log("devIxs", devIxs);

    try {
        console.log("devpubkey", devkeypair.publicKey.toString());
        console.log("recentBlockhash", recentBlockhash);
        console.log("devIxs", devIxs);
        const devTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: devkeypair.publicKey,
                recentBlockhash: recentBlockhash,
                instructions: devIxs,
            }).compileToV0Message()
        );

        console.log("signing devTx");

        devTx.sign([devkeypair]);
        bundleTxn.push(devTx);

    } catch (error) {
        console.error('Error signing devTx:', error);
        throw new Error(`Failed to sign devTx: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Skip buyer wallets processing if there are no buyer wallets
    const buyerwallets = [...pool_data.buyerextraWallets];
    if (buyerwallets.length > 0) {
        let lastNonZeroBalanceIndex = -1;
        if (pool_data.buyerPrivateKey) {
            buyerwallets.unshift(pool_data.buyerPrivateKey);
        }

        // Find the last non-zero balance wallet
        for (let i = 0; i < buyerwallets.length; i++) {
            const buyerWallet = getKeypairFromBs58(buyerwallets[i])!;
            let balance;
            if (buyerwallets.length === 1) {
                balance = new BN(Number(pool_data.BuyertokenbuyAmount) * LAMPORTS_PER_SOL);
            } else {
                const walletBalance = await connection.getBalance(buyerWallet.publicKey);
                // Ensure balance is at least enough for transaction fees
                if (walletBalance <= 0.003 * LAMPORTS_PER_SOL) {
                    console.log(`Skipping buyer ${i} due to insufficient balance`);
                    continue;
                }
                balance = new BN(walletBalance - (0.003 * LAMPORTS_PER_SOL));
            }

            if (balance.isZero() || balance.isNeg()) {
                console.log(`Skipping buyer ${i} due to zero or negative balance`);
                continue;
            }

            // Use toString method for BN comparison instead of != 0
            if (!balance.isZero()) {
                lastNonZeroBalanceIndex = i;
            }
        }

        // Use the updated reserves from devBuyQuote1 for subsequent calculations
        let currentReserves = {
            virtualSolReserves: devBuyQuote1.newReserves.virtualSolReserves,
            virtualTokenReserves: devBuyQuote1.newReserves.virtualTokenReserves,
            realTokenReserves: devBuyQuote1.newReserves.realTokenReserves,
        };

        // Track if any buyer transactions were actually added
        let buyerTxAdded = false;

        // Create a bundle for each buyer
        for (let i = 0; i < buyerwallets.length; i++) {
            const buyerWallet = getKeypairFromBs58(buyerwallets[i]);

            if (!buyerWallet) {
                throw new Error("Invalid buyer private key");
            }

            let balance;
            if (buyerwallets.length === 1) {
                balance = new BN(Number(pool_data.BuyertokenbuyAmount) * LAMPORTS_PER_SOL);
            } else {
                const walletBalance = await connection.getBalance(buyerWallet.publicKey);
                // Ensure balance is at least enough for transaction fees
                if (walletBalance <= 0.003 * LAMPORTS_PER_SOL) {
                    console.log(`Skipping buyer ${i} due to insufficient balance`);
                    continue;
                }
                balance = new BN(walletBalance - (0.003 * LAMPORTS_PER_SOL));
            }

            if (balance.isZero() || balance.isNeg()) {
                console.log(`Skipping buyer ${i} due to zero or negative balance`);
                continue;
            }

            const ata = getAssociatedTokenAddressSync(TokenKeypair.publicKey, buyerWallet.publicKey);
            const ataIx = createAssociatedTokenAccountIdempotentInstruction(
                buyerWallet.publicKey,
                ata,
                buyerWallet.publicKey,
                TokenKeypair.publicKey,
            );

            const buyerSolAmount = balance.muln(98).divn(100);
            const { tokenAmount, newReserves } = calculateBuyTokensAndNewReserves(
                buyerSolAmount,
                currentReserves
            );

            // Update the reserves for the next buyer
            currentReserves = newReserves;

            console.log(`Buyer ${i} quote:`, {
                tokenAmount: tokenAmount.toString(),
                solAmount: buyerSolAmount.toString(),
                newReserves: {
                    virtualSolReserves: newReserves.virtualSolReserves.toString(),
                    realTokenReserves: newReserves.realTokenReserves.toString(),
                    virtualTokenReserves: newReserves.virtualTokenReserves.toString(),
                }
            });

            // Skip this buyer if token amount is zero or negative
            if (tokenAmount.isZero()) {
                console.log(`Skipping buyer ${i} due to zero token amount`);
                continue;
            }

            const buyerBuyIx = PumpInstructions.createBuyInstruction(
                TokenKeypair.publicKey,
                buyerWallet.publicKey,
                {
                    amount: tokenAmount.toNumber(),
                    maxSolCost: buyerSolAmount
                }
            );

            const buyerIxs: TransactionInstruction[] = [];
            buyerIxs.push(ataIx);
            buyerIxs.push(buyerBuyIx);
            const signers = [buyerWallet];

            // Add tip instruction to the last non-zero balance wallet's transaction
            if (i === lastNonZeroBalanceIndex) {
                const tipAmount = Number(pool_data.BundleTip) * LAMPORTS_PER_SOL;
                const tipIx = SystemProgram.transfer({
                    fromPubkey: devkeypair.publicKey,
                    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                    lamports: tipAmount
                });

                buyerIxs.push(tipIx);
                signers.push(devkeypair);
            }

            const buyerTx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: buyerWallet.publicKey,
                    recentBlockhash: recentBlockhash,
                    instructions: buyerIxs,
                }).compileToV0Message()
            );

            buyerTx.sign(signers);
            bundleTxn.push(buyerTx);
            buyerTxAdded = true;
        }

        // If no buyer transactions were added due to all being skipped,
        // we need to ensure a tip transaction is included
        if (!buyerTxAdded) {
            console.log("All buyers were skipped. Adding a tip transaction to the bundle.");

            // Create a tip instruction using the dev keypair
            const tipAmount = Number(pool_data.BundleTip) * LAMPORTS_PER_SOL;
            const tipIx = SystemProgram.transfer({
                fromPubkey: devkeypair.publicKey,
                toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                lamports: tipAmount
            });

            // Add the tip to the developer transaction if it exists
            if (bundleTxn.length > 0) {
                // Create a new transaction with the original instructions plus the tip
                const lastTxIndex = bundleTxn.length - 1;
                const originalTx = bundleTxn[lastTxIndex];

                // Get the original transaction message
                const originalMessage = TransactionMessage.decompile(originalTx.message);

                // Create a new message with the original instructions plus the tip instruction
                const newMessage = new TransactionMessage({
                    payerKey: devkeypair.publicKey,
                    recentBlockhash: recentBlockhash,
                    instructions: [...originalMessage.instructions, tipIx],
                }).compileToV0Message();

                // Create and sign the new transaction
                const newTx = new VersionedTransaction(newMessage);
                newTx.sign([devkeypair]);

                // Replace the original transaction with the new one
                bundleTxn[lastTxIndex] = newTx;
            } else {
                // Create a standalone tip transaction if no dev transaction exists
                const tipTx = new VersionedTransaction(
                    new TransactionMessage({
                        payerKey: devkeypair.publicKey,
                        recentBlockhash: recentBlockhash,
                        instructions: [tipIx],
                    }).compileToV0Message()
                );

                tipTx.sign([devkeypair]);
                bundleTxn.push(tipTx);
            }
        }
    } else {
        console.log("No buyer wallets");

        // If there are no buyer wallets, add the tip instruction to the developer transaction
        // by updating the last transaction in the bundle
        const tipAmount = Number(pool_data.BundleTip) * LAMPORTS_PER_SOL;
        const tipIx = SystemProgram.transfer({
            fromPubkey: devkeypair.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

        // Add the tip instruction to the last transaction (which is the dev transaction)
        if (bundleTxn.length > 0) {
            console.log("Adding tip instruction to the last transaction");

            // Create a new transaction with the original instructions plus the tip
            const lastTxIndex = bundleTxn.length - 1;
            const originalTx = bundleTxn[lastTxIndex];

            // Get the original transaction message
            const originalMessage = TransactionMessage.decompile(originalTx.message);

            // Create a new message with the original instructions plus the tip instruction
            const newMessage = new TransactionMessage({
                payerKey: devkeypair.publicKey,
                recentBlockhash: recentBlockhash,
                instructions: [...originalMessage.instructions, tipIx],
            }).compileToV0Message();

            // Create and sign the new transaction
            const newTx = new VersionedTransaction(newMessage);
            newTx.sign([devkeypair]);

            // Replace the original transaction with the new one
            bundleTxn[lastTxIndex] = newTx;
        } else {
            // If no transactions exist yet (unlikely), create a new one
            const tipTx = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: devkeypair.publicKey,
                    recentBlockhash: recentBlockhash,
                    instructions: [tipIx],
                }).compileToV0Message()
            );

            tipTx.sign([devkeypair]);
            bundleTxn.push(tipTx);
        }
    }

    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));

    // Instead of using the API, use our sendJitoBundle utility
    try {
        // Use Jito block engine URL based on BlockEngineSelection
        const blockEngineUrl = pool_data.BlockEngineSelection;

        console.log("blockEngineUrl", blockEngineUrl);

        // Calculate tip amount from the pool data
        const tipAmount = Number(pool_data.BundleTip) * LAMPORTS_PER_SOL;

        console.log(`Sending bundle to Jito block engine: ${blockEngineUrl}`);
        console.log(`Tip amount: ${tipAmount} lamports`);
        console.log(`Total transactions in bundle: ${EncodedbundledTxns.length}`);

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
                tipKeyPairBase58: base58.encode(devkeypair.secretKey),
                rpcEndpoint: connection.rpcEndpoint,
                transactions: EncodedbundledTxns,
                tipAmount
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