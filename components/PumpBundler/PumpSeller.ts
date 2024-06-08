import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { PUMP_PROGRAM_ID, tipAccounts } from "./constants";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import pumpIdl from "./pump-idl.json";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAssociatedTokenAddressSync } from "@solana/spl-token-2";
import { generatedSellIx } from "./instructions";
import { PublicKey } from "@metaplex-foundation/js";
import { BN } from "bn.js";
import { getRandomElement } from "./misc";
import base58 from "bs58";

export async function PumpSeller(
    connection: Connection,
    wallets: string[],
    feepayer: string,
    tokenAddress: string,
    SellPercentage: string,
    BundleTip: string,
    BlockEngineSelection: string,
): Promise<string> {

    const initKeypair = Keypair.fromSecretKey(new Uint8Array(bs58.decode(feepayer)));
    const pumpProgram = new Program(pumpIdl as Idl, PUMP_PROGRAM_ID, new AnchorProvider(connection, new NodeWallet(initKeypair), AnchorProvider.defaultOptions()));


    const tokenMint = new PublicKey(tokenAddress);

    const bundleTxn = [];

    let lastNonZeroBalanceIndex = -1;

    // Find the last non-zero balance wallet
    for (let i = 0; i < wallets.length; i++) {
        const wallet = Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallets[i])));
        let tokenBalance;
        try {
            tokenBalance = await connection.getTokenAccountBalance(getAssociatedTokenAddressSync(tokenMint, wallet.publicKey));
        } catch (e) {
            console.log(e)
            continue;
        }

        if (Number(tokenBalance!.value.amount) != 0) {
            lastNonZeroBalanceIndex = i;
        }
    }

    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    // Create a bundle for each wallet
    for (let i = 1; i < wallets.length; i++) {
        const wallet = Keypair.fromSecretKey(new Uint8Array(bs58.decode(wallets[i])));
        let tokenBalance;
        try {
            tokenBalance = await connection.getTokenAccountBalance(getAssociatedTokenAddressSync(tokenMint, wallet.publicKey));
        } catch (e) {
            console.log(e)
            continue;
        }

        if (Number(tokenBalance!.value.amount) == 0) {
            continue;
        }

        console.log(`Selling ${tokenBalance!.value.amount} tokens from wallet ${wallet.publicKey}`);

        const totalAmount = Number(tokenBalance!.value.amount) * (Number(SellPercentage) / 100);

        const buyerIxs = [];
        const signers = [wallet];

        const sellIx = await generatedSellIx(tokenMint, wallet, new BN(totalAmount), new BN(1), pumpProgram);

        if (i === lastNonZeroBalanceIndex) {
            const tipAmount = Number(BundleTip) * (LAMPORTS_PER_SOL);

            const tipIx = SystemProgram.transfer({
                fromPubkey: initKeypair.publicKey,
                toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                lamports: tipAmount
            });

            buyerIxs.push(tipIx);
            signers.push(initKeypair);
        }

        buyerIxs.push(sellIx);

        //generate txn and sign
        const versionedtxn = new VersionedTransaction(
            new TransactionMessage({
                payerKey: initKeypair.publicKey,
                recentBlockhash: recentBlockhash,
                instructions: buyerIxs,
            }).compileToV0Message());

        versionedtxn.sign(signers);
        bundleTxn.push(versionedtxn);
    }
    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));

    //send to local server port 2891'
    const response = await fetch('https://mevarik-deployer.xyz:8080/bundlesend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${BlockEngineSelection}`, txns: EncodedbundledTxns })
    });

    const result = await response.json();

    return result;
}