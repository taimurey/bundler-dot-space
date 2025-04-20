import { Connection, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import { tipAccounts } from "./pump-bundler/constants";
import { distributeRandomly } from './randomgen';
import { getKeypairFromBs58 } from './pump-bundler/misc';

interface SOLMultisenderFormData {
    feePayerWallet: string;
    SendingWallet: string;
    RecievingWallets: string[];
    BundleTip: string;
    TransactionTip: string;
    BlockEngineSelection: string;
}

export async function distributeSOL(
    connection: Connection,
    FormData: SOLMultisenderFormData,
) {
    const feePayer = getKeypairFromBs58(FormData.feePayerWallet)!;
    const sendSOLWallet = getKeypairFromBs58(FormData.SendingWallet)!;

    // Fetch SOL balance of the sending wallet
    const solBalance = await connection.getBalance(sendSOLWallet.publicKey);

    // Distribute SOL randomly
    const randomamount = distributeRandomly(
        solBalance,
        FormData.RecievingWallets.length,
        (0.0001 * LAMPORTS_PER_SOL), // Minimum amount per recipient
        (1000000000 * LAMPORTS_PER_SOL) // Maximum amount per recipient
    );

    console.log("Total SOL to distribute:", randomamount.reduce((a, b) => a + b, 0) / LAMPORTS_PER_SOL);
    console.log("SOL distribution amounts:", randomamount.map(lamports => lamports / LAMPORTS_PER_SOL));

    // Prepare transfer instructions
    const transferInstructions: TransactionInstruction[] = [];

    for (let i = 0; i < FormData.RecievingWallets.length; i++) {
        const recipient = new PublicKey(FormData.RecievingWallets[i]);
        const amount = randomamount[i];

        // Create SOL transfer instruction
        const transferInstruction = SystemProgram.transfer({
            fromPubkey: sendSOLWallet.publicKey,
            toPubkey: recipient,
            lamports: amount,
        });

        transferInstructions.push(transferInstruction);
    }

    // Bundle transactions
    const BundleTxns: VersionedTransaction[] = [];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Process instructions in chunks of 5 transfers
    for (let i = 0; i < transferInstructions.length; i += 5) {
        const chunk = transferInstructions.slice(i, i + 5);

        // Add tip instruction to the last chunk
        if (i + 5 >= transferInstructions.length) {
            const tipInstruction = SystemProgram.transfer({
                fromPubkey: feePayer.publicKey,
                toPubkey: new PublicKey(tipAccounts[0]),
                lamports: Number(FormData.BundleTip) * LAMPORTS_PER_SOL,
            });
            chunk.push(tipInstruction);
        }

        // Create and sign the transaction
        const txn = new TransactionMessage({
            payerKey: feePayer.publicKey,
            recentBlockhash: recentBlockhash,
            instructions: chunk,
        }).compileToV0Message();

        const versionedTxn = new VersionedTransaction(txn);
        versionedTxn.sign([feePayer, sendSOLWallet]);
        BundleTxns.push(versionedTxn);
    }

    // Encode transactions
    const encodedTxns = BundleTxns.map(txn => base58.encode(txn.serialize()));

    // Send transactions in batches of 5
    for (let i = 0; i < encodedTxns.length; i += 5) {
        const batch = encodedTxns.slice(i, i + 5);

        const response = await fetch('https://api.bundler.space/send-bundle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ blockengine: `https://${FormData.BlockEngineSelection}`, txns: batch }),
        });

        if (!response.ok) {
            throw new Error(`Failed to send transactions: ${await response.text()}`);
        }

        console.log("Bundle sent successfully:", await response.text());
    }

    return "All bundles sent successfully";
}