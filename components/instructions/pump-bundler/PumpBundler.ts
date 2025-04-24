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
    const virtualSolReserves = new BN(reserves.virtualSolReserves);
    const virtualTokenReserves = new BN(reserves.virtualTokenReserves);
    const realTokenReserves = new BN(reserves.realTokenReserves);

    const product = virtualSolReserves.mul(virtualTokenReserves);
    const newSolReserves = virtualSolReserves.add(solAmount);
    const newTokenAmount = product.div(newSolReserves).add(new BN(1));
    const tokenAmount = virtualTokenReserves.sub(newTokenAmount);

    const finalTokenAmount = BN.min(tokenAmount, realTokenReserves);
    const newVirtualTokenReserves = virtualTokenReserves.sub(finalTokenAmount);

    return {
        tokenAmount: finalTokenAmount,
        newReserves: {
            virtualSolReserves: newSolReserves,
            realTokenReserves,
            virtualTokenReserves: newVirtualTokenReserves,
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

    const tempBondingCurveData = {
        virtualTokenReserves: globalStateData?.initialVirtualTokenReserves,
        virtualSolReserves: globalStateData?.initialVirtualSolReserves,
        realTokenReserves: globalStateData?.initialRealTokenReserves,
    };


    const associatedToken = getAssociatedTokenAddressSync(TokenKeypair.publicKey, devkeypair.publicKey);
    const devBuyAmount = Number(pool_data.DevtokenbuyAmount) * LAMPORTS_PER_SOL;

    const devBuyQuote1 = calculateBuyTokensAndNewReserves(new BN(devBuyAmount), tempBondingCurveData);
    const devMaxSol = new BN(devBuyAmount).muln(101).divn(100);
    const devBuyIx = PumpInstructions.createBuyInstruction(
        TokenKeypair.publicKey,
        devkeypair.publicKey,
        {
            amount: devBuyAmount,
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
        console.log("buyerwallets", buyerwallets);
        // Find the last non-zero balance wallet
        for (let i = 0; i < buyerwallets.length; i++) {
            const buyerWallet = getKeypairFromBs58(buyerwallets[i])!;
            let balance;
            if (buyerwallets.length === 1) {
                balance = new BN(Number(pool_data.BuyertokenbuyAmount) * LAMPORTS_PER_SOL);
            } else {
                balance = await connection.getBalance(buyerWallet.publicKey);
            }
            if (balance != 0) {
                lastNonZeroBalanceIndex = i;
            }
        }

        let currentReserves = devBuyQuote1.newReserves;

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
                balance = new BN(await connection.getBalance(buyerWallet.publicKey) - (0.003 * LAMPORTS_PER_SOL));
            }

            if (balance.isZero()) {
                continue;
            }

            const ata = getAssociatedTokenAddressSync(TokenKeypair.publicKey, buyerWallet.publicKey);
            const ataIx = createAssociatedTokenAccountIdempotentInstruction(
                buyerWallet.publicKey,
                ata,
                buyerWallet.publicKey,
                TokenKeypair.publicKey,
            );

            const { tokenAmount, newReserves } = calculateBuyTokensAndNewReserves(
                balance.muln(98).divn(100),
                currentReserves
            );
            currentReserves = newReserves;



            const buyerBuyIx = PumpInstructions.createBuyInstruction(
                TokenKeypair.publicKey,
                buyerWallet.publicKey,
                {
                    amount: tokenAmount,
                    maxSolCost: balance.muln(98).divn(100)
                }
            );

            const buyerIxs: TransactionInstruction[] = [];
            buyerIxs.push(ataIx);
            buyerIxs.push(buyerBuyIx);
            const signers = [buyerWallet];

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
        }
    } else {

        console.log("No buyer wallets");
        // If there are no buyer wallets, add the tip transaction to the bundle
        const tipAmount = Number(pool_data.BundleTip) * LAMPORTS_PER_SOL;
        const tipIx = SystemProgram.transfer({
            fromPubkey: devkeypair.publicKey,
            toPubkey: new PublicKey(getRandomElement(tipAccounts)),
            lamports: tipAmount
        });

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