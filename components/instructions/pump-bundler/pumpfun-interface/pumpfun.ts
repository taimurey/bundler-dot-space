import {
    Connection,
    Keypair,
    PublicKey,
    SystemProgram,
    SYSVAR_RENT_PUBKEY,
    TransactionInstruction,
    Transaction,
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import BN from 'bn.js';

// Constants from the Rust code
export const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const GLOBAL_STATE = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');
export const FEE_RECIPIENT = new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM');
export const EVENT_AUTHORITY = new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1');

// Instruction discriminators from the Rust code
export const INITIALIZE_IX_DISCM = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);
export const CREATE_IX_DISCM = Buffer.from([24, 30, 200, 40, 5, 28, 7, 119]);
export const BUY_IX_DISCM = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
export const SELL_IX_DISCM = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

// Account discriminators
export const GLOBAL_ACCOUNT_DISCM = Buffer.from([167, 232, 232, 177, 200, 108, 114, 127]);
export const BONDING_CURVE_ACCOUNT_DISCM = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);

// Helper function to find PDA
export function findBondingCurve(mint: PublicKey): PublicKey {
    const [publicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from('bonding-curve'), mint.toBuffer()],
        PUMPFUN_PROGRAM_ID
    );
    return publicKey;
}

// Helper function to find metadata account
export function findMetadataAccount(mint: PublicKey): PublicKey {
    const [publicKey] = PublicKey.findProgramAddressSync(
        [Buffer.from('metadata'), new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s').toBuffer(), mint.toBuffer()],
        new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s')
    );
    return publicKey;
}

/**
 * Interface representing the Global account structure
 */
export interface Global {
    initialized: boolean;
    authority: PublicKey;
    feeRecipient: PublicKey;
    initialVirtualTokenReserves: BN;
    initialVirtualSolReserves: BN;
    initialRealTokenReserves: BN;
    tokenTotalSupply: BN;
    feeBasisPoints: BN;
}

/**
 * Interface representing the BondingCurve account structure
 */
export interface BondingCurve {
    virtualTokenReserves: BN;
    virtualSolReserves: BN;
    realTokenReserves: BN;
    realSolReserves: BN;
    tokenTotalSupply: BN;
    complete: boolean;
}

/**
 * PumpFun SDK class for interacting with the PumpFun program
 */
export class PumpFunSDK {
    private connection: Connection;
    private payer: Keypair;

    constructor(connection: Connection, payer: Keypair) {
        this.connection = connection;
        this.payer = payer;
    }

    /**
     * Create a new token with bonding curve
     * @param mint The mint public key for the token
     * @param mintAuthority The mint authority keypair
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param uri The URI for the token metadata
     * @returns The transaction signature
     */
    async create(
        mint: PublicKey,
        mintAuthority: Keypair,
        name: string,
        symbol: string,
        uri: string
    ): Promise<string> {
        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = await getAssociatedTokenAddress(bondingCurve, mint);
        const metadata = findMetadataAccount(mint);

        const createIx = this.createInstruction(
            mint,
            mintAuthority.publicKey,
            bondingCurve,
            bondingCurveATA,
            metadata,
            name,
            symbol,
            uri
        );

        const transaction = new Transaction().add(createIx);
        const signers = [this.payer, mintAuthority];

        return await sendAndConfirmTransaction(this.connection, transaction, signers, {
            commitment: 'confirmed',
        });
    }

    /**
     * Buy tokens with SOL
     * @param mint The mint public key of the token to buy
     * @param amount The amount of tokens to buy
     * @param maxSolCost The maximum SOL cost willing to pay
     * @returns The transaction signature
     */
    async buy(
        mint: PublicKey,
        amount: number | BN,
        maxSolCost: number | BN
    ): Promise<string> {
        const amountBN = typeof amount === 'number' ? new BN(amount) : amount;
        const maxSolCostBN = typeof maxSolCost === 'number' ? new BN(maxSolCost) : maxSolCost;

        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = await getAssociatedTokenAddress(bondingCurve, mint);
        const userATA = await getAssociatedTokenAddress(this.payer.publicKey, mint);

        const buyIx = this.buyInstruction(
            mint,
            bondingCurve,
            bondingCurveATA,
            userATA,
            amountBN,
            maxSolCostBN
        );

        const transaction = new Transaction().add(buyIx);

        return await sendAndConfirmTransaction(this.connection, transaction, [this.payer], {
            commitment: 'confirmed',
        });
    }

    /**
     * Sell tokens for SOL
     * @param mint The mint public key of the token to sell
     * @param amount The amount of tokens to sell
     * @param minSolOutput The minimum SOL output willing to accept
     * @returns The transaction signature
     */
    async sell(
        mint: PublicKey,
        amount: number | BN,
        minSolOutput: number | BN
    ): Promise<string> {
        const amountBN = typeof amount === 'number' ? new BN(amount) : amount;
        const minSolOutputBN = typeof minSolOutput === 'number' ? new BN(minSolOutput) : minSolOutput;

        const bondingCurve = findBondingCurve(mint);
        const bondingCurveATA = await getAssociatedTokenAddress(bondingCurve, mint);
        const userATA = await getAssociatedTokenAddress(this.payer.publicKey, mint);

        const sellIx = this.sellInstruction(
            mint,
            bondingCurve,
            bondingCurveATA,
            userATA,
            amountBN,
            minSolOutputBN
        );

        const transaction = new Transaction().add(sellIx);

        return await sendAndConfirmTransaction(this.connection, transaction, [this.payer], {
            commitment: 'confirmed',
        });
    }

    /**
     * Create instruction to create a new token with bonding curve
     */
    private createInstruction(
        mint: PublicKey,
        mintAuthority: PublicKey,
        bondingCurve: PublicKey,
        bondingCurveATA: PublicKey,
        metadata: PublicKey,
        name: string,
        symbol: string,
        uri: string
    ): TransactionInstruction {
        // Create data buffer with instruction discriminator and arguments
        const nameBuffer = Buffer.from(name);
        const symbolBuffer = Buffer.from(symbol);
        const uriBuffer = Buffer.from(uri);

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

        // Account metas
        const keys = [
            { pubkey: mint, isSigner: false, isWritable: true },
            { pubkey: mintAuthority, isSigner: true, isWritable: true },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'), isSigner: false, isWritable: false },
            { pubkey: metadata, isSigner: false, isWritable: true },
            { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Create instruction to buy tokens with SOL
     */
    private buyInstruction(
        mint: PublicKey,
        bondingCurve: PublicKey,
        bondingCurveATA: PublicKey,
        userATA: PublicKey,
        amount: BN,
        maxSolCost: BN
    ): TransactionInstruction {
        // Create data buffer with instruction discriminator and arguments
        const dataLayout = Buffer.alloc(8 + 8 + 8); // 8 bytes discriminator + 8 bytes amount + 8 bytes maxSolCost

        // Write discriminator
        BUY_IX_DISCM.copy(dataLayout, 0);

        // Write amount (u64)
        dataLayout.writeBigUInt64LE(BigInt(amount.toString()), 8);

        // Write maxSolCost (u64)
        dataLayout.writeBigUInt64LE(BigInt(maxSolCost.toString()), 16);

        // Account metas
        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: userATA, isSigner: false, isWritable: true },
            { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Create instruction to sell tokens for SOL
     */
    private sellInstruction(
        mint: PublicKey,
        bondingCurve: PublicKey,
        bondingCurveATA: PublicKey,
        userATA: PublicKey,
        amount: BN,
        minSolOutput: BN
    ): TransactionInstruction {
        // Create data buffer with instruction discriminator and arguments
        const dataLayout = Buffer.alloc(8 + 8 + 8); // 8 bytes discriminator + 8 bytes amount + 8 bytes minSolOutput

        // Write discriminator
        SELL_IX_DISCM.copy(dataLayout, 0);

        // Write amount (u64)
        dataLayout.writeBigUInt64LE(BigInt(amount.toString()), 8);

        // Write minSolOutput (u64)
        dataLayout.writeBigUInt64LE(BigInt(minSolOutput.toString()), 16);

        // Account metas
        const keys = [
            { pubkey: GLOBAL_STATE, isSigner: false, isWritable: false },
            { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: bondingCurve, isSigner: false, isWritable: true },
            { pubkey: bondingCurveATA, isSigner: false, isWritable: true },
            { pubkey: userATA, isSigner: false, isWritable: true },
            { pubkey: this.payer.publicKey, isSigner: true, isWritable: true },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
            { pubkey: PUMPFUN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        return new TransactionInstruction({
            keys,
            programId: PUMPFUN_PROGRAM_ID,
            data: dataLayout,
        });
    }

    /**
     * Fetch and deserialize Global account data
     */
    async fetchGlobalAccount(): Promise<Global | null> {
        try {
            const accountInfo = await this.connection.getAccountInfo(GLOBAL_STATE);
            if (!accountInfo) return null;

            // Check for discriminator
            const discriminator = accountInfo.data.slice(0, 8);
            if (!GLOBAL_ACCOUNT_DISCM.equals(discriminator)) {
                throw new Error('Invalid account discriminator for Global account');
            }

            const data = accountInfo.data.slice(8);

            // Deserialize the data (following the Rust struct layout)
            // bool initialized
            const initialized = data[0] !== 0;

            // Pubkey authority
            const authority = new PublicKey(data.slice(1, 33));

            // Pubkey feeRecipient
            const feeRecipient = new PublicKey(data.slice(33, 65));

            // u64 initialVirtualTokenReserves
            const initialVirtualTokenReserves = new BN(data.slice(65, 73), 'le');

            // u64 initialVirtualSolReserves
            const initialVirtualSolReserves = new BN(data.slice(73, 81), 'le');

            // u64 initialRealTokenReserves
            const initialRealTokenReserves = new BN(data.slice(81, 89), 'le');

            // u64 tokenTotalSupply
            const tokenTotalSupply = new BN(data.slice(89, 97), 'le');

            // u64 feeBasisPoints
            const feeBasisPoints = new BN(data.slice(97, 105), 'le');

            return {
                initialized,
                authority,
                feeRecipient,
                initialVirtualTokenReserves,
                initialVirtualSolReserves,
                initialRealTokenReserves,
                tokenTotalSupply,
                feeBasisPoints,
            };
        } catch (error) {
            console.error('Error fetching Global account:', error);
            return null;
        }
    }

    /**
     * Fetch and deserialize BondingCurve account data
     */
    async fetchBondingCurveAccount(mint: PublicKey): Promise<BondingCurve | null> {
        try {
            const bondingCurveAddress = findBondingCurve(mint);
            const accountInfo = await this.connection.getAccountInfo(bondingCurveAddress);
            if (!accountInfo) return null;

            // Check for discriminator
            const discriminator = accountInfo.data.slice(0, 8);
            if (!BONDING_CURVE_ACCOUNT_DISCM.equals(discriminator)) {
                throw new Error('Invalid account discriminator for BondingCurve account');
            }

            const data = accountInfo.data.slice(8);

            // Deserialize the data (following the Rust struct layout)
            // u64 virtualTokenReserves
            const virtualTokenReserves = new BN(data.slice(0, 8), 'le');

            // u64 virtualSolReserves
            const virtualSolReserves = new BN(data.slice(8, 16), 'le');

            // u64 realTokenReserves
            const realTokenReserves = new BN(data.slice(16, 24), 'le');

            // u64 realSolReserves
            const realSolReserves = new BN(data.slice(24, 32), 'le');

            // u64 tokenTotalSupply
            const tokenTotalSupply = new BN(data.slice(32, 40), 'le');

            // bool complete
            const complete = data[40] !== 0;

            return {
                virtualTokenReserves,
                virtualSolReserves,
                realTokenReserves,
                realSolReserves,
                tokenTotalSupply,
                complete,
            };
        } catch (error) {
            console.error('Error fetching BondingCurve account:', error);
            return null;
        }
    }

    /**
     * Calculate the price for buying tokens with SOL
     * This is a TypeScript implementation of the Rust calculate_buy_price function
     */
    calculateBuyPrice(
        solAmount: number | BN,
        bondingCurve: BondingCurve
    ): { tokenAmount: BN; newBondingCurve: BondingCurve } {
        const solAmountBN = typeof solAmount === 'number' ? new BN(solAmount) : solAmount;

        if (solAmountBN.isZero()) {
            return { tokenAmount: new BN(0), newBondingCurve: { ...bondingCurve } };
        }

        // Create copies so we don't modify the original
        const virtualSolReservesBN = bondingCurve.virtualSolReserves.clone();
        const virtualTokenReservesBN = bondingCurve.virtualTokenReserves.clone();
        const realTokenReservesBN = bondingCurve.realTokenReserves.clone();

        // Calculate the product of virtual reserves
        const product = virtualSolReservesBN.mul(virtualTokenReservesBN);

        // Update the virtual SOL reserves with the new amount of SOL added
        const newSolReserves = virtualSolReservesBN.add(solAmountBN);

        // Calculate the new token amount based on the new virtual SOL reserves
        const newTokenAmount = product.div(newSolReserves).addn(1);

        // Determine the number of tokens to be given out
        const tokenAmount = virtualTokenReservesBN.sub(newTokenAmount);

        // Ensure the token amount does not exceed the real token reserves
        const finalTokenAmount = BN.min(tokenAmount, realTokenReservesBN);

        // Create the new bonding curve state
        const newBondingCurve: BondingCurve = {
            virtualTokenReserves: virtualTokenReservesBN.sub(finalTokenAmount),
            virtualSolReserves: newSolReserves,
            realTokenReserves: realTokenReservesBN.sub(finalTokenAmount),
            realSolReserves: bondingCurve.realSolReserves.add(solAmountBN),
            tokenTotalSupply: bondingCurve.tokenTotalSupply,
            complete: bondingCurve.complete,
        };

        return { tokenAmount: finalTokenAmount, newBondingCurve };
    }

    /**
     * Calculate the price for selling tokens for SOL
     * This is a TypeScript implementation of the Rust calculate_sell_price function
     */
    calculateSellPrice(
        tokenAmount: number | BN,
        bondingCurve: BondingCurve
    ): { solAmount: BN; newBondingCurve: BondingCurve } {
        const tokenAmountBN = typeof tokenAmount === 'number' ? new BN(tokenAmount) : tokenAmount;

        if (tokenAmountBN.isZero()) {
            return { solAmount: new BN(0), newBondingCurve: { ...bondingCurve } };
        }

        // Create copies so we don't modify the original
        const virtualSolReservesBN = bondingCurve.virtualSolReserves.clone();
        const virtualTokenReservesBN = bondingCurve.virtualTokenReserves.clone();
        const realTokenReservesBN = bondingCurve.realTokenReserves.clone();
        const realSolReservesBN = bondingCurve.realSolReserves.clone();

        // Calculate the product of virtual reserves
        const product = virtualSolReservesBN.mul(virtualTokenReservesBN);

        // Update the virtual token reserves with the new amount of tokens added
        const newTokenReserves = virtualTokenReservesBN.add(tokenAmountBN);

        // Calculate the new SOL amount based on the new virtual token reserves
        const newSolAmount = product.div(newTokenReserves);

        // Determine the amount of SOL to be given out
        const solAmount = virtualSolReservesBN.sub(newSolAmount);

        // Ensure the SOL amount does not exceed the real SOL reserves
        const finalSolAmount = BN.min(solAmount, realSolReservesBN);

        // Create the new bonding curve state
        const newBondingCurve: BondingCurve = {
            virtualTokenReserves: newTokenReserves,
            virtualSolReserves: virtualSolReservesBN.sub(finalSolAmount),
            realTokenReserves: realTokenReservesBN.add(tokenAmountBN),
            realSolReserves: realSolReservesBN.sub(finalSolAmount),
            tokenTotalSupply: bondingCurve.tokenTotalSupply,
            complete: bondingCurve.complete,
        };

        return { solAmount: finalSolAmount, newBondingCurve };
    }
} 