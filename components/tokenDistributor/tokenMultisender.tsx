import { Connection, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getKeypairFromBs58 } from "../PumpBundler/misc";
import { Metaplex, PublicKey, Signer } from "@metaplex-foundation/js";
import { distributeRandomly } from "../randomgen";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, } from "@solana/spl-token-2";
import base58 from "bs58";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { tipAccounts } from "../PumpBundler/constants";

interface TokenMultisenderFormData {
    tokenMintAddress: string;
    feePayerWallet: string;
    SendingWallet: string;
    RecievingWallets: string[];
    BundleTip: string;
    TransactionTip: string;
    BlockEngineSelection: string;
}

export async function tokenMultisender(
    connection: Connection,
    FormData: TokenMultisenderFormData,
) {
    const feePayer = getKeypairFromBs58(FormData.feePayerWallet)!;

    const sendTokenWallet = getKeypairFromBs58(FormData.SendingWallet)!;



    const tokenAccount = await connection.getTokenAccountsByOwner(
        sendTokenWallet.publicKey,
        { mint: new PublicKey(FormData.tokenMintAddress) }
    );
    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey);

    const MintMetadata = await new Metaplex(connection).nfts().findByMint({ mintAddress: new PublicKey(FormData.tokenMintAddress) });

    const decimals = MintMetadata.mint.decimals;



    const randomamount = distributeRandomly(Number(tokenBalance.value.amount), FormData.RecievingWallets.length, (0.0001 * LAMPORTS_PER_SOL), (100 * LAMPORTS_PER_SOL));

    //sum of all amounts
    console.log(randomamount.reduce((a, b) => a + b, 0));

    console.log(randomamount);

    // Prepare and send transactions
    const transferInstructions: TransactionInstruction[] = [];

    for (let i = 0; i < FormData.RecievingWallets.length; i++) {
        const recipient = new PublicKey(FormData.RecievingWallets[i]);
        const amount = randomamount[i];

        const ata = await createAssociatedTokenAccountIdempotentInxs(
            feePayer,
            new PublicKey(FormData.tokenMintAddress),
            recipient
        );

        const transferInstruction = createTransferCheckedInstruction(
            tokenAccount.value[0].pubkey,
            new PublicKey(FormData.tokenMintAddress),
            ata.associatedToken,
            sendTokenWallet.publicKey,
            amount,
            decimals,
        );

        transferInstructions.push(ata.inx, transferInstruction);

        // Add tip after the last transaction
        if (i === FormData.RecievingWallets.length - 1) {
            const tipInstruction = SystemProgram.transfer({
                fromPubkey: feePayer.publicKey,
                toPubkey: new PublicKey(tipAccounts[0]),
                lamports: Number(FormData.BundleTip) * LAMPORTS_PER_SOL,
            });
            transferInstructions.push(tipInstruction);
        }
    }

    // // Chunk transactions into smaller groups
    // const chunkedInstructions = chunkArray(transferInstructions, 12);

    // // Assuming the surrounding context is an async function
    // for (const chunk of chunkedInstructions) {
    //     // Fetch the latest blockhash once outside the loop to avoid redundant calls
    //     const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    //     // Create a transaction for each chunk of instructions
    //     const message = new TransactionMessage({
    //         payerKey: feePayer.publicKey,
    //         recentBlockhash: recentBlockhash, // Use the fetched blockhash
    //         instructions: chunk, // Use the entire chunk as the instructions for this transaction
    //     }).compileToV0Message();

    //     const versionedTxn = new VersionedTransaction(message);

    //     // Sign the transaction
    //     versionedTxn.sign([feePayer]);

    //     // Encode the transaction to base58
    //     const encodedTxn = base58.encode(versionedTxn.serialize());

    // }
    //     // Send the transaction to the deployment endpoint
    //     const response = await fetch('https://mevarik-deployer.xyz:8080/bundlesend', {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/json',
    //         },
    //         body: JSON.stringify({ blockengine: `https://${FormData.BlockEngineSelection}`, txns: [encodedTxn] }) // Note: Encapsulate encodedTxn in an array if the endpoint expects an array
    //     });

    //     if (!response.ok) {
    //         throw new Error(`Failed to send transactions: ${await response.text()}`);
    //     }

    //     console.log(await response.text());
    // }

    const BundleTxns: VersionedTransaction[] = [];
    //use 12 instructions per transaction
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    for (let i = 0; i < transferInstructions.length; i += 13) {
        // Fetch the latest blockhash once outside the loop to avoid redundant calls

        // Create a transaction for each chunk of instructions
        const txn = new TransactionMessage({
            payerKey: feePayer.publicKey,
            recentBlockhash: recentBlockhash, // Use the fetched blockhash
            instructions: transferInstructions.slice(i, i + 13), // Use the entire chunk as the instructions for this transaction
        }).compileToV0Message();

        const versionedTxn = new VersionedTransaction(txn);

        // Sign the transaction
        versionedTxn.sign([feePayer]);
        versionedTxn.sign([sendTokenWallet]);
        BundleTxns.push(versionedTxn);
    }

    // Fixing the issue by serializing and encoding each transaction individually
    const encodedTxns = BundleTxns.map(txn => base58.encode(txn.serialize()));

    console.log(encodedTxns.map(txn => txn.length));


    // Send the transaction to the deployment endpoint
    const response = await fetch('https://mevarik-deployer.xyz:8080/bundlesend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${FormData.BlockEngineSelection}`, txns: encodedTxns }) // Note: Encapsulate encodedTxn in an array if the endpoint expects an array
    });

    if (!response.ok) {
        throw new Error(`Failed to send transactions: ${await response.text()}`);
    }

    console.log(await response.text());

    return response;
}


export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}


export async function createAssociatedTokenAccountIdempotentInxs(
    payer: Signer,
    mint: PublicKey,
    owner: PublicKey,
    programId = TOKEN_PROGRAM_ID,
    associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<{ inx: TransactionInstruction, associatedToken: PublicKey }> {
    const associatedToken = getAssociatedTokenAddressSync(mint, owner, false, programId, associatedTokenProgramId);

    const inx =
        createAssociatedTokenAccountIdempotentInstruction(
            payer.publicKey,
            associatedToken,
            owner,
            mint,
            programId,
            associatedTokenProgramId
        );

    return { inx, associatedToken };
}