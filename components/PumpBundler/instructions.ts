import { AccountMeta, AddressLookupTableProgram, Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY, TransactionInstruction } from "@solana/web3.js";
import { bundleWalletEntry } from "./types";
import { Program } from "@coral-xyz/anchor";
import { getBondingCurve, getMetadataPda } from "./pdas";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";

import {
    GLOBAL_STATE,
    FEE_RECEPIENT,
    EVENT_AUTH,
    MINT_AUTH,
    metaplexMetadata,
    tipAccounts,
} from "./constants";
import BN from "bn.js";
import { getKeypairFromBs58, getRandomElement } from "./misc";
import { getAssociatedTokenAddressSync } from "@solana/spl-token-2";


export async function generateCreatePumpTokenIx(
    token: Keypair,
    mainSigner: Keypair,
    coinname: string,
    symbol: string,
    metadataURI: string,
    pumpProgram: Program,
): Promise<TransactionInstruction> {
    const bondingCurvePda = getBondingCurve(token.publicKey, pumpProgram.programId);
    const bondingCurveAta = getAssociatedTokenAddressSync(token.publicKey, bondingCurvePda, true);
    const metadataPda = getMetadataPda(token.publicKey);

    const createIx = await pumpProgram.methods.create(
        coinname,
        symbol,
        metadataURI,
    ).accounts({
        mint: token.publicKey,
        mintAuthority: MINT_AUTH,
        bondingCurve: bondingCurvePda,
        associatedBondingCurve: bondingCurveAta,
        global: GLOBAL_STATE,
        mplTokenMetadata: metaplexMetadata,
        metadata: metadataPda,
        user: mainSigner.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        eventAuthority: EVENT_AUTH,
        program: pumpProgram.programId,
    }).instruction();
    return createIx;
}


export async function generateBuyIx(
    token: PublicKey,
    amount: any,
    maxSolAmount: any,
    mainSigner: Keypair,
    pumpProgram: Program,
) {
    const bondingCurvePda = getBondingCurve(token, pumpProgram.programId);
    const bondingCurveAta = getAssociatedTokenAddressSync(token, bondingCurvePda, true);
    const signerAta = getAssociatedTokenAddressSync(token, mainSigner.publicKey, true);

    const buyIx = await pumpProgram.methods.buy(
        new BN(amount),
        new BN(maxSolAmount),
    ).accounts({
        global: GLOBAL_STATE,
        feeRecipient: FEE_RECEPIENT,
        mint: token,
        bondingCurve: bondingCurvePda,
        associatedBondingCurve: bondingCurveAta,
        associatedUser: signerAta,
        user: mainSigner.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        eventAuthority: EVENT_AUTH,
        program: pumpProgram.programId,
    }).instruction();

    return buyIx;
}

export async function generatedSellIx(
    token: PublicKey,
    mainSigner: Keypair,
    amount: BN,
    minSolAmount: BN,
    pumpProgram: Program
) {

    const bondingCurvePda = getBondingCurve(token, pumpProgram.programId);
    const bondingCurveAta = getAssociatedTokenAddressSync(token, bondingCurvePda, true);
    const signerAta = getAssociatedTokenAddressSync(token, mainSigner.publicKey, true);

    const SellIx = await pumpProgram.methods.sell(
        amount,
        minSolAmount,
    ).accounts({
        global: GLOBAL_STATE,
        feeRecipient: FEE_RECEPIENT,
        mint: token,
        bondingCurve: bondingCurvePda,
        associatedBondingCurve: bondingCurveAta,
        associatedUser: signerAta,
        user: mainSigner.publicKey,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTH,
        program: pumpProgram.programId,
    }).instruction();

    return SellIx;
}

export async function generatedBuyMultipleIx(
    mainSigner: Keypair,
    buyers: bundleWalletEntry[],
    token: PublicKey,
    bundleProgram: Program,
    pumpProgram: Program,
    jito_tip: number,
    isFinalTx: boolean,
) {
    //const tempToken = new PublicKey('66qnRy4gXkYD1uuDMLcxQ7orKhasoz7dszMHM3RUMty9');
    const bondingCurvePda = getBondingCurve(token, pumpProgram.programId);
    const bondingCurveAta = getAssociatedTokenAddressSync(token, bondingCurvePda, true);
    const adjustedAmounts = buyers.map(e => {
        const adjustedAmount = new BN(e.sol * LAMPORTS_PER_SOL);
        return adjustedAmount
    });

    const remainingAccounts: AccountMeta[] = []
    for (const e of buyers) {
        const buyerKeypair = getKeypairFromBs58(e.privateKey)!;
        const userAta = getAssociatedTokenAddressSync(token, buyerKeypair.publicKey, true);

        remainingAccounts.push({
            pubkey: buyerKeypair.publicKey,
            isSigner: true,
            isWritable: true,
        })

        remainingAccounts.push({
            pubkey: userAta,
            isSigner: false,
            isWritable: true,
        })
    }

    const buyMutlipleIx = await bundleProgram.methods.buyMultiple({
        amounts: adjustedAmounts,
        isFinalTx: isFinalTx,
        tip: isFinalTx ? new BN(jito_tip * LAMPORTS_PER_SOL) : null,
    }).accounts({
        globalStateAccount: GLOBAL_STATE,
        feeRecipient: FEE_RECEPIENT,
        mint: token,
        bondingCurve: bondingCurvePda,
        bondingCurveAta: bondingCurveAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
        ataProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        eventAuthority: EVENT_AUTH,
        pumpProgram: pumpProgram.programId,
        mainSigner: mainSigner.publicKey,
        jitoTipAccount: getRandomElement(tipAccounts)
    }).remainingAccounts(remainingAccounts).instruction();

    return buyMutlipleIx;
}

export async function generateCreateAluIx(
    connection: Connection,
    signer: Keypair
): Promise<{
    ix: TransactionInstruction,
    address: PublicKey,
}> {
    const slot = await connection.getSlot('finalized');
    //we create an address look up table
    const [lookupTableInst, lookupTableAddress] =
        AddressLookupTableProgram.createLookupTable({
            authority: signer.publicKey,
            payer: signer.publicKey,
            recentSlot: slot,
        });

    return {
        ix: lookupTableInst,
        address: lookupTableAddress,
    }
}


export function generateExtendAluIx(
    signer: Keypair,
    wallets: bundleWalletEntry[],
    mint: PublicKey,
    lookupTableAddress: PublicKey,

): TransactionInstruction {

    const addresses = wallets.slice(1).map(e => getAssociatedTokenAddressSync(mint, getKeypairFromBs58(e.privateKey)!.publicKey, true));

    const extendInstruction = AddressLookupTableProgram.extendLookupTable({
        payer: signer.publicKey,
        authority: signer.publicKey,
        lookupTable: lookupTableAddress,
        addresses: addresses,
    });

    return extendInstruction
}

export function generateDeactivateAluIx(
    lookupTableJson: any,
    ghostBundlerKeypair: Keypair,
) {
    const deactiveIx = AddressLookupTableProgram.deactivateLookupTable({
        lookupTable: new PublicKey(lookupTableJson.address),
        authority: ghostBundlerKeypair.publicKey,
    });
    return deactiveIx;
}



export function generateCloseAluIx(
    lookupTableJson: any,
    ghostBundlerKeypair: Keypair,
) {
    const closeIx = AddressLookupTableProgram.closeLookupTable({
        lookupTable: new PublicKey(lookupTableJson.address),
        authority: ghostBundlerKeypair.publicKey,
        recipient: ghostBundlerKeypair.publicKey,
    })
    return closeIx;
}