import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { generateBuyIx, generateCreatePumpTokenIx } from "./instructions";
import pumpIdl from "./pump-idl.json";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { getKeypairFromBs58, getRandomElement } from "./misc";
import { PUMP_PROGRAM_ID, tipAccounts } from './constants';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BN } from "bn.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddress, } from "@solana/spl-token-2";
import { PublicKey } from "@metaplex-foundation/js";
import base58 from "bs58";
import { TAX_WALLET } from "../market/marketInstruction";
import { uploadMetaData } from "../TransactionUtils/token";

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

export async function PumpBundler(
    connection: Connection,
    pool_data: PumpTokenCreator,
    TokenKeypair: Keypair,
    metadata: any,
): Promise<string> {
    console.log(metadata)
    const uri = await uploadMetaData(metadata);
    const devkeypair = getKeypairFromBs58(pool_data.deployerPrivateKey);

    if (!devkeypair) {
        throw new Error("Invalid deployer private key");
    }

    const bundleTxn = [];
    // Assuming pumpIdl is defined somewhere above and it includes the 'address' property
    // Also assuming PUMP_PROGRAM_ID is an instance of Provider
    const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(devkeypair), AnchorProvider.defaultOptions()));


    const createIx = await generateCreatePumpTokenIx(TokenKeypair, devkeypair, pool_data.coinname, pool_data.symbol, uri, pumpProgram);


    const devBuyIx = await generateBuyIx(TokenKeypair.publicKey, Number(pool_data.DevtokenbuyAmount) * (LAMPORTS_PER_SOL), 0, devkeypair, pumpProgram);

    const associatedToken = await getAssociatedTokenAddress(TokenKeypair.publicKey, devkeypair.publicKey);
    const ataIx = createAssociatedTokenAccountIdempotentInstruction(
        devkeypair.publicKey,
        associatedToken,
        devkeypair.publicKey,
        TokenKeypair.publicKey,
    )

    const taxIx = SystemProgram.transfer({
        fromPubkey: devkeypair.publicKey,
        toPubkey: TAX_WALLET,
        lamports: 0.25 * LAMPORTS_PER_SOL
    });

    const devIxs = [createIx, ataIx, devBuyIx, taxIx];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    const devTx = new VersionedTransaction(
        new TransactionMessage({
            payerKey: devkeypair.publicKey,
            recentBlockhash: recentBlockhash,
            instructions: devIxs,
        }).compileToV0Message());
    devTx.sign([devkeypair, TokenKeypair]);
    bundleTxn.push(devTx);

    const buyerwallets = [...pool_data.buyerextraWallets];
    if (pool_data.buyerPrivateKey) {
        buyerwallets.unshift(pool_data.buyerPrivateKey);
    }

    // Create a bundle for each buyer
    for (let i = 0; i < buyerwallets.length; i++) {
        const buyerWallet = getKeypairFromBs58(buyerwallets[i]);

        if (!buyerWallet) {
            throw new Error("Invalid buyer private key");
        }

        let balance;
        if (buyerwallets.length === 1) {
            balance = Number(pool_data.BuyertokenbuyAmount) * LAMPORTS_PER_SOL;
        } else {
            balance = await connection.getBalance(buyerWallet.publicKey);
        }

        const ata = await getAssociatedTokenAddress(TokenKeypair.publicKey, buyerWallet.publicKey);

        const ataIx = createAssociatedTokenAccountIdempotentInstruction(
            buyerWallet.publicKey,
            ata,
            buyerWallet.publicKey,
            TokenKeypair.publicKey,
        )


        const buyerBuyIx = await generateBuyIx(TokenKeypair.publicKey, balance, 0, buyerWallet, pumpProgram);

        const buyerIxs = [ataIx, buyerBuyIx];

        if (i === buyerwallets.length - 1 && i === buyerwallets.length - 1) {
            const tipAmount = Number(pool_data.BundleTip) * (LAMPORTS_PER_SOL);

            // Convert BN to bigint
            const tipAmountBigInt = BigInt(tipAmount.toString());

            const tipIx = SystemProgram.transfer({
                fromPubkey: devkeypair.publicKey,
                toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                lamports: tipAmountBigInt
            });

            buyerIxs.push(tipIx);
        }

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

    //send to local server port 2891'
    const response = await fetch('https://mevarik-deployer.xyz:2891/bundlesend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: pool_data.BlockEngineSelection, txns: EncodedbundledTxns })
    });

    if (!response.ok) {
        throw new Error("Failed to send bundle");
    }

    const result = await response.json();

    return result;
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