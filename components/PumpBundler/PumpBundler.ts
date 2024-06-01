import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { generateBuyIx, generateCreatePumpTokenIx } from "./instructions";
import pumpIdl from "./pump-idl.json";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { getKeypairFromBs58, getRandomElement } from "./misc";
import { PUMP_PROGRAM_ID, tipAccounts } from './constants';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token-2";
import { PublicKey } from "@metaplex-foundation/js";
import base58 from "bs58";
import { ApibundleSend } from "../DistributeTokens/bundler";

interface PumpTokenCreator {
    coinname: string;
    symbol: string;
    uri: string;
    websiteUrl: string;
    twitterUrl: string;
    deployerPrivateKey: string;
    buyerPrivateKey: string;
    buyerextraWallets: string[];
    tokenbuyAmount: string;
    telegramUrl: string;
    BundleTip: string;
    TransactionTip: string;
    BlockEngineSelection: string;
}

export async function PumpBundler(
    connection: Connection,
    pool_data: PumpTokenCreator,
    TokenKeypair: Keypair,
): Promise<string> {

    const devkeypair = getKeypairFromBs58(pool_data.deployerPrivateKey);

    if (!devkeypair) {
        throw new Error("Invalid deployer private key");
    }

    const bundleTxn = [];
    // Assuming pumpIdl is defined somewhere above and it includes the 'address' property
    // Also assuming PUMP_PROGRAM_ID is an instance of Provider
    const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(devkeypair), AnchorProvider.defaultOptions()));


    const createIx = await generateCreatePumpTokenIx(TokenKeypair, devkeypair, pool_data.coinname, pool_data.symbol, pool_data.uri, pumpProgram);


    const devBuyIx = await generateBuyIx(TokenKeypair, new BN(pool_data.tokenbuyAmount), new BN(0), devkeypair, pumpProgram);

    const ataIx = (createAssociatedTokenAccountIdempotentInstruction(
        devkeypair.publicKey,
        getAssociatedTokenAddressSync(TokenKeypair.publicKey, devkeypair.publicKey),
        devkeypair.publicKey,
        new PublicKey(TokenKeypair.publicKey),
    ))

    const tipAmount = new BN(pool_data.BundleTip).mul(new BN(LAMPORTS_PER_SOL));

    // Convert BN to bigint
    const tipAmountBigInt = BigInt(tipAmount.toString());

    const tipIx = SystemProgram.transfer({
        fromPubkey: devkeypair.publicKey,
        toPubkey: new PublicKey(getRandomElement(tipAccounts)),
        lamports: tipAmountBigInt
    });

    const devIxs = [createIx, ataIx, devBuyIx, tipIx];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const devTx = new VersionedTransaction(
        new TransactionMessage({
            payerKey: devkeypair.publicKey,
            recentBlockhash: recentBlockhash,
            instructions: devIxs,
        }).compileToV0Message());
    devTx.sign([devkeypair, TokenKeypair]);
    bundleTxn.push(devTx);

    const buyerwallets = [pool_data.buyerPrivateKey, ...pool_data.buyerextraWallets];

    // Create a bundle for each buyer
    for (let i = 0; i < buyerwallets.length; i++) {
        const buyerWallet = getKeypairFromBs58(buyerwallets[i]);

        if (!buyerWallet) {
            throw new Error("Invalid buyer private key");
        }

        const buyerBuyIx = await generateBuyIx(TokenKeypair, new BN(pool_data.tokenbuyAmount), new BN(0), buyerWallet, pumpProgram);


        const buyerIxs = [buyerBuyIx];
        const buyerTx = new VersionedTransaction(
            new TransactionMessage({
                payerKey: buyerWallet.publicKey,
                recentBlockhash: recentBlockhash,
                instructions: buyerIxs,
            }).compileToV0Message());

        buyerTx.sign([buyerWallet]);
        bundleTxn.push(buyerTx);
    }

    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));
    const bundledata = {
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [EncodedbundledTxns]
    };

    const response = await ApibundleSend(bundledata, pool_data.BlockEngineSelection);

    return response;
}

export async function getBundleStatuses(bundleId: string, pool_data: PumpTokenCreator) {
    const url = `https://${pool_data.BlockEngineSelection}/api/v1/bundles`;
    const data = {
        jsonrpc: "2.0",
        id: 1,
        method: "getBundleStatuses",
        params: [[bundleId]]
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });

    if (!response.ok) {
        throw new Error("Failed to get bundle statuses");
    }

    const result = await response.json();
    return result;
}