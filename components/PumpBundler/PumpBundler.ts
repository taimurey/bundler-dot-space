import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { generateBuyIx, generateCreatePumpTokenIx } from "./instructions";
import pumpIdl from "./pump-idl.json";
import { AnchorProvider, Program, Idl } from "@coral-xyz/anchor";
import { calculateBuyTokensAndNewReserves, getKeypairFromBs58, getRandomElement } from "./misc";
import { GLOBAL_STATE, PUMP_PROGRAM_ID, tipAccounts } from './constants';
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token-2";
import { PublicKey } from "@metaplex-foundation/js";
import base58 from "bs58";
import { TAX_WALLET } from "../market/marketInstruction";
import { uploadMetaData } from "../TransactionUtils/token";
import { BN } from "bn.js";

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

    const globalStateData = await pumpProgram.account.global.fetch(GLOBAL_STATE);
    const createIx = await generateCreatePumpTokenIx(TokenKeypair, devkeypair, pool_data.coinname, pool_data.symbol, uri, pumpProgram);
    const tempBondingCurveData = {
        virtualTokenReserves: globalStateData.initialVirtualTokenReserves,
        virtualSolReserves: globalStateData.initialVirtualSolReserves,
        realTokenReserves: globalStateData.initialRealTokenReserves,
    }

    const associatedToken = getAssociatedTokenAddressSync(TokenKeypair.publicKey, devkeypair.publicKey);

    const devBuyAmount = Number(pool_data.DevtokenbuyAmount) * LAMPORTS_PER_SOL;

    //calculate the amount of tokens for tghe dev to buy depending on the configured sol amount
    const devBuyQuote1 = calculateBuyTokensAndNewReserves(new BN(devBuyAmount), tempBondingCurveData);
    const devMaxSol = new BN(devBuyAmount).muln(101).divn(100);
    const devBuyIx = await generateBuyIx(TokenKeypair.publicKey, devBuyQuote1.tokenAmount, devMaxSol, devkeypair, pumpProgram);


    const ataIx = (createAssociatedTokenAccountIdempotentInstruction(
        devkeypair.publicKey,
        associatedToken,
        devkeypair.publicKey,
        TokenKeypair.publicKey,
    ))

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
    console.log(buyerwallets.length);
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
            balance = (await connection.getBalance(buyerWallet.publicKey) - (0.003 * LAMPORTS_PER_SOL));
        }

        if (balance == 0) {
            continue;
        }

        const ata = getAssociatedTokenAddressSync(TokenKeypair.publicKey, buyerWallet.publicKey);

        const ataIx = createAssociatedTokenAccountIdempotentInstruction(
            buyerWallet.publicKey,
            ata,
            buyerWallet.publicKey,
            TokenKeypair.publicKey,
        )


        //90% of the balance + 15% of the balance
        // const devBuyQuote = new BN(balance).muln(90).divn(100).add(new BN(balance).muln(15).divn(100));

        const { tokenAmount, newReserves } = calculateBuyTokensAndNewReserves((new BN(balance).muln(98).divn(100)), currentReserves);
        currentReserves = newReserves;
        // const devMaxSol = Number(balance);
        const buyerBuyIx = await generateBuyIx(TokenKeypair.publicKey, tokenAmount, balance, buyerWallet, pumpProgram);

        const buyerIxs = [ataIx, buyerBuyIx];
        const signers = [buyerWallet];

        if (i === lastNonZeroBalanceIndex) {
            const tipAmount = Number(pool_data.BundleTip) * (LAMPORTS_PER_SOL);

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
            }).compileToV0Message());

        buyerTx.sign(signers);
        bundleTxn.push(buyerTx);
    }
    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));

    console.log(EncodedbundledTxns);

    //send to local server port 2891'
    //send to local server port 2891'
    const response = await fetch('https://mevarik-deployer.xyz:8080/send-bundle', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${pool_data.BlockEngineSelection}`, txns: EncodedbundledTxns })
    });

    if (!response.ok) {
        const message = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
    }

    const result = await response.json();

    return result;
}
