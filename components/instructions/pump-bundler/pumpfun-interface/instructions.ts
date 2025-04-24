import {
    PublicKey,
    TransactionInstruction,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import BN from 'bn.js';

// Constants from the Rust code
export const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const GLOBAL_STATE = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
export const FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
export const EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');
export const MPL_TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// Instruction discriminators from the Rust code
export const INITIALIZE_IX_DISCM = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
export const SET_PARAMS_IX_DISCM = Buffer.from([27, 234, 178, 52, 147, 2, 187, 141]);
export const CREATE_IX_DISCM = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);
export const BUY_IX_DISCM = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
export const SELL_IX_DISCM = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
export const WITHDRAW_IX_DISCM = Buffer.from([183, 18, 70, 156, 148, 109, 161, 34]);

/**
 * Helper function to find BondingCurve PDA
 */
export function findBondingCurve(mint: PublicKey): PublicKey {
    const [publicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mint.toBuffer()],
        PUMPFUN_PROGRAM_ID
    );
    return publicKey;
}

/**
 * Helper function to find metadata account
 */
export function findMetadataAccount(mint: PublicKey): PublicKey {
    const [publicKey] = PublicKey.findProgramAddressSync(
        [
            Buffer.from('metadata'),
            MPL_TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            mint.toBuffer()
        ],
        MPL_TOKEN_METADATA_PROGRAM_ID
    );
    return publicKey;
}

/**
 * Interface for arguments to create instruction
 */
export interface CreateIxArgs {
    name: string;
    symbol: string;
    uri: string;
}

/**
 * Interface for arguments to buy instruction
 */
export interface BuyIxArgs {
    amount: number | BN;
    maxSolCost: number | BN;
}

/**
 * Interface for arguments to sell instruction
 */
export interface SellIxArgs {
    amount: number | BN;
    minSolOutput: number | BN;
}

/**
 * Class for building instructions for the PumpFun program
 */
export class PumpInstructions {
    /**
     * Create instruction to initialize the program
     * @param user User's public key
     * @returns Transaction instruction for initialization
     */
    static createInitializeInstruction(user: PublicKey): TransactionInstruction {
        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ];

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: INITIALIZE_IX_DISCM,
        });
    }

    /**
     * Create instruction to set parameters for the program
     * @param user User's public key
     * @param feeRecipient Fee recipient's public key
     * @param initialVirtualTokenReserves Initial virtual token reserves
     * @param initialVirtualSolReserves Initial virtual SOL reserves
     * @param initialRealTokenReserves Initial real token reserves
     * @param tokenTotalSupply Total token supply
     * @param feeBasisPoints Fee basis points
     * @returns Transaction instruction for setting parameters
     */
    static createSetParamsInstruction(
        user: PublicKey,
        feeRecipient: PublicKey,
        initialVirtualTokenReserves: number | BN,
        initialVirtualSolReserves: number | BN,
        initialRealTokenReserves: number | BN,
        tokenTotalSupply: number | BN,
        feeBasisPoints: number | BN
    ): TransactionInstruction {
        const initialVirtualTokenReservesBN = typeof initialVirtualTokenReserves === 'number'
            ? new BN(initialVirtualTokenReserves)
            : initialVirtualTokenReserves;

        const initialVirtualSolReservesBN = typeof initialVirtualSolReserves === 'number'
            ? new BN(initialVirtualSolReserves)
            : initialVirtualSolReserves;

        const initialRealTokenReservesBN = typeof initialRealTokenReserves === 'number'
            ? new BN(initialRealTokenReserves)
            : initialRealTokenReserves;

        const tokenTotalSupplyBN = typeof tokenTotalSupply === 'number'
            ? new BN(tokenTotalSupply)
            : tokenTotalSupply;

        const feeBasisPointsBN = typeof feeBasisPoints === 'number'
            ? new BN(feeBasisPoints)
            : feeBasisPoints;

        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        // Create data buffer
        // 8 bytes discriminator + 32 bytes pubkey + 8*5 bytes for u64 values
        const dataLayout = Buffer.alloc(8 + 32 + 8 * 5);

        // Write discriminator
        SET_PARAMS_IX_DISCM.copy(dataLayout, 0);

        // Write fee recipient pubkey
        dataLayout.set(feeRecipient.toBuffer(), 8);

        // Write u64 values
        dataLayout.writeBigUInt64LE(BigInt(initialVirtualTokenReservesBN.toString()), 40);
        dataLayout.writeBigUInt64LE(BigInt(initialVirtualSolReservesBN.toString()), 48);
        dataLayout.writeBigUInt64LE(BigInt(initialRealTokenReservesBN.toString()), 56);
        dataLayout.writeBigUInt64LE(BigInt(tokenTotalSupplyBN.toString()), 64);
        dataLayout.writeBigUInt64LE(BigInt(feeBasisPointsBN.toString()), 72);

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Create instruction to create a new token with bonding curve
     * @param mint Token mint public key
     * @param mintAuthority Mint authority public key
     * @param user User's public key
     * @param args Create instruction arguments
     * @returns Transaction instruction for token creation
     */
    static createCreateInstruction(
        mint: PublicKey,
        mintAuthority: PublicKey,
        user: PublicKey,
        args: CreateIxArgs
    ): TransactionInstruction {
        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = PublicKey.findProgramAddressSync(
            [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
        const metadata = findMetadataAccount(mint);

        const keys = [
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: mintAuthority, isSigner: true, isWritable: true },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: MPL_TOKEN_METADATA_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: metadata, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        // Create data buffer with instruction discriminator and arguments
        const nameBuffer = Buffer.from(args.name);
        const symbolBuffer = Buffer.from(args.symbol);
        const uriBuffer = Buffer.from(args.uri);

        // Layout: 
        // - 8 bytes discriminator
        // - 4 bytes name length + name bytes
        // - 4 bytes symbol length + symbol bytes
        // - 4 bytes uri length + uri bytes
        const dataLayout = Buffer.alloc(
            8 +
            4 + nameBuffer.length +
            4 + symbolBuffer.length +
            4 + uriBuffer.length
        );

        // Write discriminator
        CREATE_IX_DISCM.copy(dataLayout, 0);

        // Write name length and data
        dataLayout.writeUInt32LE(nameBuffer.length, 8);
        nameBuffer.copy(dataLayout, 12);

        // Write symbol length and data
        const symbolOffset = 12 + nameBuffer.length;
        dataLayout.writeUInt32LE(symbolBuffer.length, symbolOffset);
        symbolBuffer.copy(dataLayout, symbolOffset + 4);

        // Write uri length and data
        const uriOffset = symbolOffset + 4 + symbolBuffer.length;
        dataLayout.writeUInt32LE(uriBuffer.length, uriOffset);
        uriBuffer.copy(dataLayout, uriOffset + 4);

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Create instruction to buy tokens with SOL
     * @param mint Token mint public key
     * @param user User's public key
     * @param args Buy instruction arguments
     * @returns Transaction instruction for buying tokens
     */
    static createBuyInstruction(
        mint: PublicKey,
        user: PublicKey,
        args: BuyIxArgs
    ): TransactionInstruction {
        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = PublicKey.findProgramAddressSync(
            [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
        const userATA = PublicKey.findProgramAddressSync(
            [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const amountBN = typeof args.amount === 'number' ? new BN(args.amount) : args.amount;
        const maxSolCostBN = typeof args.maxSolCost === 'number' ? new BN(args.maxSolCost) : args.maxSolCost;

        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: userATA, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        // Create data buffer with instruction discriminator and arguments
        const dataLayout = Buffer.alloc(8 + 8 + 8); // 8 bytes discriminator + 8 bytes amount + 8 bytes maxSolCost

        // Write discriminator
        BUY_IX_DISCM.copy(dataLayout, 0);

        // Write amount (u64)
        dataLayout.writeBigUInt64LE(BigInt(amountBN.toString()), 8);

        // Write maxSolCost (u64)
        dataLayout.writeBigUInt64LE(BigInt(maxSolCostBN.toString()), 16);

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Create instruction to sell tokens for SOL
     * @param mint Token mint public key
     * @param user User's public key
     * @param args Sell instruction arguments
     * @returns Transaction instruction for selling tokens
     */
    static createSellInstruction(
        mint: PublicKey,
        user: PublicKey,
        args: SellIxArgs
    ): TransactionInstruction {
        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = PublicKey.findProgramAddressSync(
            [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
        const userATA = PublicKey.findProgramAddressSync(
            [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const amountBN = typeof args.amount === 'number' ? new BN(args.amount) : args.amount;
        const minSolOutputBN = typeof args.minSolOutput === 'number' ? new BN(args.minSolOutput) : args.minSolOutput;

        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: userATA, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        // Create data buffer with instruction discriminator and arguments
        const dataLayout = Buffer.alloc(8 + 8 + 8); // 8 bytes discriminator + 8 bytes amount + 8 bytes minSolOutput

        // Write discriminator
        SELL_IX_DISCM.copy(dataLayout, 0);

        // Write amount (u64)
        dataLayout.writeBigUInt64LE(BigInt(amountBN.toString()), 8);

        // Write minSolOutput (u64)
        dataLayout.writeBigUInt64LE(BigInt(minSolOutputBN.toString()), 16);

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Create instruction to withdraw tokens
     * @param mint Token mint public key
     * @param user User's public key
     * @returns Transaction instruction for withdrawing tokens
     */
    static createWithdrawInstruction(
        mint: PublicKey,
        user: PublicKey
    ): TransactionInstruction {
        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = PublicKey.findProgramAddressSync(
            [bondingCurve.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];
        const userATA = PublicKey.findProgramAddressSync(
            [user.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )[0];

        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: userATA, isSigner: false, isWritable: true },
            { pubkey: user, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: WITHDRAW_IX_DISCM,
        });
    }
} 