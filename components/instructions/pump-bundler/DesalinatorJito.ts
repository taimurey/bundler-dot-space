import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getRandomElement, TAX_WALLET } from "./misc";
import { tipAccounts } from './constants';
import base58 from "bs58";
import BN from "bn.js";
import { PumpInstructions } from "./pumpfun-interface";

export interface DesalinatorParams {
    // Token information
    tokenAddress: string;

    // Wallet keys
    sellerPrivateKey: string;
    buyerPrivateKey: string;

    // Transaction parameters
    tokensToSell: string; // Percentage to sell
    BlockEngineSelection: string;
    BundleTip: string;
    TransactionTip: string;
}

// Calculate buy tokens and new reserves - copied from PumpBundler.ts
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

/**
 * Creates a bundled desalination transaction with Jito
 * This bundles a seller selling tokens and a buyer buying them in one transaction
 */
export async function createDesalinatorBundle(
    connection: Connection,
    params: DesalinatorParams
): Promise<{ bundleId: string; bundleResult?: any }> {
    // Parse token address
    const tokenMint = new PublicKey(params.tokenAddress);

    // Get keypairs from private keys
    const sellerKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(params.sellerPrivateKey)));
    const buyerKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(params.buyerPrivateKey)));

    // Get recent blockhash
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Create bundle transaction array
    const bundleTxn: VersionedTransaction[] = [];

    // Create ATAs for seller and buyer
    const sellerAta = getAssociatedTokenAddressSync(tokenMint, sellerKeypair.publicKey);
    const buyerAta = getAssociatedTokenAddressSync(tokenMint, buyerKeypair.publicKey);

    // Prepare instructions for creating ATAs if needed
    const createSellerAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        sellerKeypair.publicKey,
        sellerAta,
        sellerKeypair.publicKey,
        tokenMint
    );

    const createBuyerAtaIx = createAssociatedTokenAccountIdempotentInstruction(
        buyerKeypair.publicKey,
        buyerAta,
        buyerKeypair.publicKey,
        tokenMint
    );

    // Get token balance from seller
    const sellerTokenAccount = await connection.getTokenAccountBalance(sellerAta);
    const sellerTokenBalance = new BN(sellerTokenAccount.value.amount);

    // Calculate amount to sell based on percentage
    const sellPercentage = Number(params.tokensToSell) / 100;
    const amountToSell = sellerTokenBalance.muln(sellPercentage).divn(100);

    if (amountToSell.isZero() || amountToSell.isNeg()) {
        throw new Error("No tokens to sell or invalid amount");
    }

    console.log(`Selling ${amountToSell.toString()} tokens (${params.tokensToSell}% of ${sellerTokenBalance.toString()})`);

    // Get PumpFun program data to estimate buy costs and token amounts
    // For desalinator, we need to call API for reserve data to get accurate costs
    // This is just a placeholder - you would normally fetch this from the program state
    // or from an API that knows the current reserves
    const reservesData = {
        virtualSolReserves: new BN("1000000000"), // Example values, replace with actual
        virtualTokenReserves: new BN("100000000000"),
        realTokenReserves: new BN("100000000000"),
    };

    // Calculate how much SOL is needed to buy the tokens
    // This is an approximation - you would use calculateBuyTokensAndNewReserves
    // with the actual reserves data
    const buyQuote = calculateBuyTokensAndNewReserves(
        new BN(0.01 * LAMPORTS_PER_SOL), // Example buy amount
        reservesData
    );

    console.log("Buy quote:", {
        tokenAmount: buyQuote.tokenAmount.toString(),
        newReserves: {
            virtualSolReserves: buyQuote.newReserves.virtualSolReserves.toString(),
            realTokenReserves: buyQuote.newReserves.realTokenReserves.toString(),
            virtualTokenReserves: buyQuote.newReserves.virtualTokenReserves.toString(),
        }
    });

    // Create sell instruction using PumpInstructions
    const sellIx = PumpInstructions.createSellInstruction(
        tokenMint,
        sellerKeypair.publicKey,
        {
            amount: amountToSell.toNumber(),
            minSolOutput: new BN(0) // Allow any sol output
        }
    );

    // Create buy instruction using PumpInstructions
    const buyAmount = new BN(0.01 * LAMPORTS_PER_SOL); // Example fixed buy amount
    const buyIx = PumpInstructions.createBuyInstruction(
        tokenMint,
        buyerKeypair.publicKey,
        {
            amount: buyAmount.toNumber(),
            maxSolCost: buyAmount.muln(101).divn(100) // Add 1% slippage
        }
    );

    // Create tip instruction
    const tipAmount = Number(params.BundleTip) * LAMPORTS_PER_SOL;
    const tipIx = SystemProgram.transfer({
        fromPubkey: buyerKeypair.publicKey,
        toPubkey: new PublicKey(getRandomElement(tipAccounts)),
        lamports: tipAmount
    });

    // Create transaction with all instructions
    const desalinatorTx = new VersionedTransaction(
        new TransactionMessage({
            payerKey: buyerKeypair.publicKey, // Buyer pays for transaction
            recentBlockhash,
            instructions: [
                createSellerAtaIx,
                createBuyerAtaIx,
                sellIx,
                buyIx,
                tipIx
            ],
        }).compileToV0Message()
    );

    // Sign transaction with both seller and buyer keypairs
    desalinatorTx.sign([sellerKeypair, buyerKeypair]);

    // Add to bundle
    bundleTxn.push(desalinatorTx);

    // Encode and send bundle
    return await sendBundle(connection, bundleTxn, params.BlockEngineSelection, buyerKeypair, Number(params.BundleTip));
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