import { Connection, LAMPORTS_PER_SOL, PublicKey, Signer, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { distributeRandomly } from "../randomgen";
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync, getMint, } from "@solana/spl-token";
import base58 from "bs58";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { tipAccounts } from "../pump-bundler/constants";
import { getKeypairFromBs58 } from "../pump-bundler/misc";

interface TokenMultisenderFormData {
    tokenMintAddress: string;
    feePayerWallet: string;
    SendingWallet: string;
    RecievingWallets: string[];
    BundleTip: string;
    TransactionTip: string;
    BlockEngineSelection: string;
}

export async function distributetokens(
    connection: Connection,
    FormData: TokenMultisenderFormData,
) {
    const feePayer = getKeypairFromBs58(FormData.feePayerWallet)!;
    const sendTokenWallet = getKeypairFromBs58(FormData.SendingWallet)!;

    // Fetch token account and balance
    const tokenAccount = await connection.getTokenAccountsByOwner(
        sendTokenWallet.publicKey,
        { mint: new PublicKey(FormData.tokenMintAddress) }
    );
    const tokenBalance = await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey);

    // Fetch token metadata to get decimals
    const mintInfo = await getMint(connection, new PublicKey(FormData.tokenMintAddress));
    const decimals = mintInfo.decimals;

    // Distribute tokens randomly
    const randomamount = distributeRandomly(
        Number(tokenBalance.value.amount),
        FormData.RecievingWallets.length,
        (0.0001 * LAMPORTS_PER_SOL),
        (1000000000 * LAMPORTS_PER_SOL)
    );

    console.log("Total tokens to distribute:", randomamount.reduce((a, b) => a + b, 0));
    console.log("Token distribution amounts:", randomamount);

    // Prepare transfer instructions
    const transferInstructions: TransactionInstruction[] = [];

    for (let i = 0; i < FormData.RecievingWallets.length; i++) {
        const recipient = new PublicKey(FormData.RecievingWallets[i]);
        const amount = randomamount[i];

        // Create ATA if it doesn't exist
        const ata = await createAssociatedTokenAccountIdempotentInxs(
            feePayer,
            new PublicKey(FormData.tokenMintAddress),
            recipient
        );

        // Create transfer instruction using createTransferCheckedInstruction
        const transferInstruction = createTransferCheckedInstruction(
            tokenAccount.value[0].pubkey,
            new PublicKey(FormData.tokenMintAddress),
            ata.associatedToken,
            sendTokenWallet.publicKey,
            amount,
            decimals
        );

        transferInstructions.push(ata.inx, transferInstruction);
    }

    // Bundle transactions
    const BundleTxns: VersionedTransaction[] = [];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    // Process instructions in chunks of 5 transfers (10 instructions: 5 ATA + 5 transfers)
    for (let i = 0; i < transferInstructions.length; i += 10) {
        const chunk = transferInstructions.slice(i, i + 10);

        // Add tip instruction to the last chunk
        if (i + 10 >= transferInstructions.length) {
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
        versionedTxn.sign([feePayer, sendTokenWallet]);
        BundleTxns.push(versionedTxn);
    }

    // Encode transactions
    const encodedTxns = BundleTxns.map(txn => base58.encode(txn.serialize()));

    // Send transactions in batches of 5
    for (let i = 0; i < encodedTxns.length; i += 5) {
        const batch = encodedTxns.slice(i, i + 5);

        const response = await fetch('https://mevarik-deployer.xyz:2791/send-bundle', {
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