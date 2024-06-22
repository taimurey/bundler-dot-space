import { Connection, LAMPORTS_PER_SOL, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getKeypairFromBs58 } from "../PumpBundler/misc";
import { PublicKey, Signer } from "@metaplex-foundation/js";
import { distributeRandomly } from "../randomgen";
import { createAssociatedTokenAccountIdempotentInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token-2";
import base58 from "bs58";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

interface TokenMultisenderFormData {
    tokenMintAddress: string;
    feePayerWallet: string;
    SendingWallets: string[];
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


    const tokenAccounts = [];
    const signerTokenWallets = [];

    const tokenBalance = [];
    for (let i = 0; i < FormData.SendingWallets.length; i++) {
        const sendingWallet = getKeypairFromBs58(FormData.SendingWallets[i])!;
        signerTokenWallets.push(sendingWallet);
        // const recievingWallet = getKeypairFromBs58(FormData.RecievingWallets[i])!;
        let tokenAccount;
        try {
            tokenAccount = await connection.getTokenAccountsByOwner(sendingWallet.publicKey, { mint: new PublicKey(FormData.tokenMintAddress) });

            tokenAccounts.push(tokenAccount.value[0].pubkey);
        } catch (error) {
            throw new Error("Error in getting token account");
        }

        try {
            const balance = await connection.getTokenAccountBalance(tokenAccount.value[0].pubkey);

            tokenBalance.push(balance.value.amount);
        } catch (error) {
            throw new Error("Error in getting token balance");
        }
    }

    const RecievingPubkeys = [];
    for (let i = 0; i < FormData.RecievingWallets.length; i++) {
        const recievingWallet = new PublicKey(FormData.RecievingWallets[i]);
        RecievingPubkeys.push(recievingWallet);
    }

    const transferInxs: TransactionInstruction[] = [];
    const ata = await createAssociatedTokenAccountIdempotentInxs(
        feePayer,
        new PublicKey(FormData.tokenMintAddress),
        feePayer.publicKey,
    );
    transferInxs.push(ata.inx);
    for (let i = 0; i < tokenAccounts.length; i++) {
        const transferinx = SystemProgram.transfer({
            fromPubkey: signerTokenWallets[i].publicKey,
            toPubkey: ata.associatedToken,
            lamports: Number(tokenBalance[i]),
        })

        transferInxs.push(transferinx);
    }

    const versionedTxn: VersionedTransaction[] = [];
    // Assuming transferInx is an array of TransactionInstructions
    for (let i = 0; i < transferInxs.length; i += 5) {
        const chunk = transferInxs.slice(i, i + 5); // Get 5 instructions at a time
        const versionedtxn = new VersionedTransaction(
            new TransactionMessage({
                payerKey: feePayer.publicKey,
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                instructions: chunk, // Use the chunk of 5 instructions
            }).compileToV0Message()
        );

        versionedTxn.push(versionedtxn);
    }

    const EncodedbundledTxns = versionedTxn.map(txn => base58.encode(txn.serialize()));

    const response = await fetch('https://mevarik-deployer.xyz:8080/bundlesend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${FormData.BlockEngineSelection}`, txns: EncodedbundledTxns })
    });

    // if (!response.ok) {
    //     const message = await response.text();
    //     // throw new Error(`status: ${response.status}, message: ${message}`);
    // }

    console.log(response);

    // Assuming tokenBalance is an array of numbers or strings that represent numbers
    const totalTokens = tokenBalance.reduce((acc, current) => acc + Number(current), 0);

    const randomAmount = distributeRandomly(Number(totalTokens), FormData.RecievingWallets.length, 0.001 * LAMPORTS_PER_SOL, 100 * LAMPORTS_PER_SOL);

    const transferInxs2: TransactionInstruction[] = [];

    for (let i = 0; i < FormData.RecievingWallets.length; i++) {
        const ata = await createAssociatedTokenAccountIdempotentInxs(
            feePayer,
            new PublicKey(FormData.tokenMintAddress),
            new PublicKey(FormData.RecievingWallets[i]),
        );
        const transferInx = SystemProgram.transfer({
            fromPubkey: feePayer.publicKey,
            toPubkey: ata.associatedToken,
            lamports: randomAmount[i],
        });

        transferInxs2.push(ata.inx);
        transferInxs2.push(transferInx);
    }

    const versionedTxns: VersionedTransaction[] = [];

    for (let i = 0; i < transferInxs2.length; i += 5) {
        const chunk = transferInxs2.slice(i, i + 8);
        const versionedTxn = new VersionedTransaction(
            new TransactionMessage({
                payerKey: feePayer.publicKey,
                recentBlockhash: (await connection.getLatestBlockhash()).blockhash,
                instructions: chunk,
            }).compileToV0Message()
        );

        versionedTxns.push(versionedTxn);
    }

    const EncodedbundledTxns2 = versionedTxns.map(txn => base58.encode(txn.serialize()));

    const response2 = await fetch('https://mevarik-deployer.xyz:8080/bundlesend', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ blockengine: `https://${FormData.BlockEngineSelection}`, txns: EncodedbundledTxns2 })
    });

    if (!response2.ok) {
        const message = await response2.text();
        throw new Error(`status: ${response2.status}, message: ${message}`);
    }

    return response2;
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