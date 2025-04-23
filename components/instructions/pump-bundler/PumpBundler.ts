import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getKeypairFromBs58, getRandomElement, TAX_WALLET } from "./misc";
import { GLOBAL_STATE, PUMP_PROGRAM_ID, tipAccounts } from './constants';
import { uploadMetaData } from "@/components/TransactionUtils/token";
import base58 from "bs58";
import BN from "bn.js";
import { deserialize, Schema } from 'borsh';
import { generateBuyIx, generateCreatePumpTokenIx } from "./instructions";
import { getGlobalStateData } from "./global-state";
import { Program } from "@coral-xyz/anchor";
import { Idl } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import pumpIdl from "@/components/instructions/pump-bundler/pump-idl.json";
import { sendJitoBundleClient } from "../jito-bundler/sendJitoBundleClient";

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
): Promise<string> {
    const uri = await uploadMetaData(metadata);
    const devkeypair = getKeypairFromBs58(pool_data.deployerPrivateKey);

    const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(devkeypair!), AnchorProvider.defaultOptions()));


    if (!devkeypair) {
        throw new Error("Invalid deployer private key");
    }

    const bundleTxn = [];

    // Fetch global state using borsh
    const globalStateData = await getGlobalStateData(connection, new PublicKey(GLOBAL_STATE));

    const createIx = await generateCreatePumpTokenIx(
        TokenKeypair,
        devkeypair,
        pool_data.coinname,
        pool_data.symbol,
        uri,
        pumpProgram
    );

    const tempBondingCurveData = {
        virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
        virtualSolReserves: globalStateData.initialVirtualSolReserves,
        realTokenReserves: globalStateData.initialRealTokenReserves,
    };

    const associatedToken = getAssociatedTokenAddressSync(TokenKeypair.publicKey, devkeypair.publicKey);
    const devBuyAmount = Number(pool_data.DevtokenbuyAmount) * LAMPORTS_PER_SOL;

    const devBuyQuote1 = calculateBuyTokensAndNewReserves(new BN(devBuyAmount), tempBondingCurveData);
    const devMaxSol = new BN(devBuyAmount).muln(101).divn(100);
    const devBuyIx = await generateBuyIx(
        TokenKeypair.publicKey,
        devBuyQuote1.tokenAmount,
        devMaxSol,
        devkeypair,
        pumpProgram
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

    const devIxs = [createIx, ataIx, devBuyIx];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const devTx = new VersionedTransaction(
        new TransactionMessage({
            payerKey: devkeypair.publicKey,
            recentBlockhash: recentBlockhash,
            instructions: devIxs,
        }).compileToV0Message()
    );

    devTx.sign([devkeypair, TokenKeypair]);
    bundleTxn.push(devTx);

    const buyerwallets = [...pool_data.buyerextraWallets];
    if (pool_data.buyerPrivateKey) {
        buyerwallets.unshift(pool_data.buyerPrivateKey);
    }

    let lastNonZeroBalanceIndex = -1;

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



        const buyerBuyIx = await generateBuyIx(
            TokenKeypair.publicKey,
            tokenAmount,
            balance,
            buyerWallet,
            pumpProgram
        );

        const buyerIxs = [ataIx, buyerBuyIx];
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

    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));

    // Instead of using the API, use our sendJitoBundle utility
    try {
        // Use Jito block engine URL based on BlockEngineSelection
        const blockEngineUrl = `https://${pool_data.BlockEngineSelection}`;

        // Calculate tip amount from the pool data
        const tipAmount = Number(pool_data.BundleTip) * LAMPORTS_PER_SOL;

        console.log(`Sending bundle to Jito block engine: ${blockEngineUrl}`);
        console.log(`Tip amount: ${tipAmount} lamports`);
        console.log(`Total transactions in bundle: ${EncodedbundledTxns.length}`);

        // Send the bundle via Jito SDK
        const bundleUuid = await sendJitoBundleClient(
            blockEngineUrl,
            devkeypair,
            connection,
            EncodedbundledTxns,
            tipAmount
        );

        console.log(`Successfully sent bundle with UUID: ${bundleUuid}`);
        return bundleUuid;
    } catch (error) {
        console.error('Error sending bundle via Jito:', error);
        throw new Error(`Failed to send bundle via Jito: ${error instanceof Error ? error.message : String(error)}`);
    }
}