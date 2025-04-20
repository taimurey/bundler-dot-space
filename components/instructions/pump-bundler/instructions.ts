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
import { getAssociatedTokenAddressSync } from "@solana/spl-token";


export async function generateCreatePumpTokenIx(
    token: Keypair,
    mainSigner: Keypair,
    coinname: string,
    symbol: string,
    metadataURI: string,
): Promise<TransactionInstruction> {
    try {
        const response = await fetch(`${API_BASE_URL}/create-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet: mainSigner.publicKey.toString(),
                mint: token.publicKey.toString(),
                metadata: {
                    name: coinname,
                    symbol: symbol,
                    uri: metadataURI,
                }
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result: CreateApiresponse = await response.json();

        if (!result.success || !result.data?.instructions || result.data.instructions.length === 0) {
            throw new Error(result.message || 'Failed to generate create token instruction');
        }

        // Convert the instruction string back to a TransactionInstruction
        const instruction = parseInstructionFromString(result.data.instructions[0]);

        return instruction;
    } catch (error) {
        console.error('Error generating create token instruction:', error);
        throw error;
    }
}

interface CreateApiresponse {
    success: boolean;
    message: string;
    data?: {
        instructions: string[];
    };
}



const API_BASE_URL = 'https://api.bundler.space/api';

interface ApiResponse {
    success: boolean;
    message: string;
    instructions?: string[];
}

export async function generateBuyIx(
    token: PublicKey,
    amount: BN,
    maxSolAmount: BN,
    mainSigner: Keypair,
): Promise<TransactionInstruction> {
    try {
        const response = await fetch(`${API_BASE_URL}/buy-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet: mainSigner.publicKey.toString(),
                mint: token.toString(),
                amount: maxSolAmount.toNumber() / 1e9, // Convert lamports to SOL
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();

        if (!data.success || !data.instructions || data.instructions.length === 0) {
            throw new Error(data.message || 'Failed to generate buy instruction');
        }

        // Convert the instruction string back to a TransactionInstruction
        // You'll need to implement this conversion based on your instruction format
        const instruction = parseInstructionFromString(data.instructions[0]);

        return instruction;
    } catch (error) {
        console.error('Error generating buy instruction:', error);
        throw error;
    }
}

export async function generateSellIx(
    token: PublicKey,
    mainSigner: Keypair,
    amount: BN,
    minSolAmount: BN,
): Promise<TransactionInstruction> {
    try {
        const response = await fetch(`${API_BASE_URL}/sell-token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet: mainSigner.publicKey.toString(),
                mint: token.toString(),
                amount: amount.toNumber(),  // Token amount for sell
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: ApiResponse = await response.json();

        if (!data.success || !data.instructions || data.instructions.length === 0) {
            throw new Error(data.message || 'Failed to generate sell instruction');
        }

        // Convert the instruction string back to a TransactionInstruction
        const instruction = parseInstructionFromString(data.instructions[0]);

        return instruction;
    } catch (error) {
        console.error('Error generating sell instruction:', error);
        throw error;
    }
}

// Helper function to parse instruction string back to TransactionInstruction
function parseInstructionFromString(instructionStr: string): TransactionInstruction {
    // You'll need to implement this based on how your backend serializes instructions
    // This is a placeholder implementation
    try {
        const instructionData = JSON.parse(instructionStr);
        return new TransactionInstruction({
            programId: new PublicKey(instructionData.programId),
            keys: instructionData.keys.map((key: any) => ({
                pubkey: new PublicKey(key.pubkey),
                isSigner: key.isSigner,
                isWritable: key.isWritable,
            })),
            data: Buffer.from(instructionData.data, 'base64'),
        });
    } catch (error) {
        console.error('Error parsing instruction:', error);
        throw new Error('Failed to parse instruction from server response');
    }
}

// Helper function to format large numbers for API requests
function formatAmount(amount: BN): number {
    return amount.toNumber() / 1e9; // Adjust decimal places based on your token's decimals
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