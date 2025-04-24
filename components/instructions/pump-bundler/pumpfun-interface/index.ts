import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    sendAndConfirmTransaction,
    ComputeBudgetProgram,
} from '@solana/web3.js';
import {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import BN from 'bn.js';
import { GlobalAccount, BondingCurveAccount, BondingCurveCalculator } from './accounts';
import {
    PumpInstructions,
    CreateIxArgs,
    BuyIxArgs,
    SellIxArgs,
    findBondingCurve
} from './instructions';

/**
 * PumpFun SDK for interacting with the PumpFun bonding curve program
 */
export class PumpFunSDK {
    private connection: Connection;
    private payer: Keypair;

    constructor(connection: Connection, payer: Keypair) {
        this.connection = connection;
        this.payer = payer;
    }

    /**
     * Get the Global account state
     * @returns The Global account state
     */
    async getGlobalAccount() {
        return GlobalAccount.fetch(this.connection);
    }

    /**
     * Get the BondingCurve account state for a specific token
     * @param mint The mint public key of the token
     * @returns The BondingCurve account state
     */
    async getBondingCurveAccount(mint: PublicKey) {
        return BondingCurveAccount.fetch(this.connection, mint);
    }

    /**
     * Initialize the PumpFun program
     * This can only be called once to set up the program
     * @returns The transaction signature
     */
    async initialize(): Promise<string> {
        const instruction = PumpInstructions.createInitializeInstruction(
            this.payer.publicKey
        );

        const transaction = new Transaction().add(instruction);

        return sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.payer],
            { commitment: 'confirmed' }
        );
    }

    /**
     * Set parameters for the PumpFun program
     * This should be called after initialization
     * @param feeRecipient The fee recipient public key
     * @param initialVirtualTokenReserves Initial virtual token reserves
     * @param initialVirtualSolReserves Initial virtual SOL reserves
     * @param initialRealTokenReserves Initial real token reserves
     * @param tokenTotalSupply Total token supply
     * @param feeBasisPoints Fee basis points
     * @returns The transaction signature
     */
    async setParams(
        feeRecipient: PublicKey,
        initialVirtualTokenReserves: number | BN,
        initialVirtualSolReserves: number | BN,
        initialRealTokenReserves: number | BN,
        tokenTotalSupply: number | BN,
        feeBasisPoints: number | BN
    ): Promise<string> {
        const instruction = PumpInstructions.createSetParamsInstruction(
            this.payer.publicKey,
            feeRecipient,
            initialVirtualTokenReserves,
            initialVirtualSolReserves,
            initialRealTokenReserves,
            tokenTotalSupply,
            feeBasisPoints
        );

        const transaction = new Transaction().add(instruction);

        return sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.payer],
            { commitment: 'confirmed' }
        );
    }

    /**
     * Create a new token with bonding curve
     * @param mint The mint keypair for the new token
     * @param mintAuthority The mint authority keypair (usually the same as payer)
     * @param name The name of the token
     * @param symbol The symbol of the token
     * @param uri The URI for the token metadata
     * @returns The transaction signature
     */
    async create(
        mint: Keypair,
        mintAuthority: Keypair,
        name: string,
        symbol: string,
        uri: string
    ): Promise<string> {
        const createArgs: CreateIxArgs = {
            name,
            symbol,
            uri
        };

        const createIx = PumpInstructions.createCreateInstruction(
            mint.publicKey,
            mintAuthority.publicKey,
            this.payer.publicKey,
            createArgs
        );

        const transaction = new Transaction().add(createIx);
        const signers = [this.payer, mint];

        // Add mintAuthority to signers if it's different from payer
        if (mintAuthority.publicKey.toString() !== this.payer.publicKey.toString()) {
            signers.push(mintAuthority);
        }

        return sendAndConfirmTransaction(
            this.connection,
            transaction,
            signers,
            { commitment: 'confirmed' }
        );
    }

    /**
     * Buy tokens with SOL
     * @param mint The mint public key of the token to buy
     * @param amount The amount of tokens to buy
     * @param maxSolCost The maximum SOL cost willing to pay
     * @param priorityFee Optional priority fee in microlamports
     * @returns The transaction signature
     */
    async buy(
        mint: PublicKey,
        amount: number | BN,
        maxSolCost: number | BN,
        priorityFee?: number
    ): Promise<string> {
        const transaction = new Transaction();

        // Add priority fee instruction if specified
        if (priorityFee) {
            transaction.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: priorityFee
                })
            );
        }

        // Add compute unit limit instruction for complex transactions
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({
                units: 80000
            })
        );

        const buyArgs: BuyIxArgs = {
            amount,
            maxSolCost
        };

        // Create user's associated token account if it doesn't exist
        const userATA = await getAssociatedTokenAddress(
            mint,
            this.payer.publicKey
        );

        try {
            await this.connection.getAccountInfo(userATA);
        } catch (e) {
            // If account doesn't exist, create it
            transaction.add(
                createAssociatedTokenAccountInstruction(
                    this.payer.publicKey,
                    userATA,
                    this.payer.publicKey,
                    mint
                )
            );
        }

        // Add buy instruction
        transaction.add(
            PumpInstructions.createBuyInstruction(
                mint,
                this.payer.publicKey,
                buyArgs
            )
        );

        return sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.payer],
            { commitment: 'confirmed' }
        );
    }

    /**
     * Sell tokens for SOL
     * @param mint The mint public key of the token to sell
     * @param amount The amount of tokens to sell (use BN.MAX_UINT64 for all tokens)
     * @param minSolOutput The minimum SOL output willing to accept
     * @param priorityFee Optional priority fee in microlamports
     * @returns The transaction signature
     */
    async sell(
        mint: PublicKey,
        amount: number | BN,
        minSolOutput: number | BN,
        priorityFee?: number
    ): Promise<string> {
        const transaction = new Transaction();

        // Add priority fee instruction if specified
        if (priorityFee) {
            transaction.add(
                ComputeBudgetProgram.setComputeUnitPrice({
                    microLamports: priorityFee
                })
            );
        }

        // Add compute unit limit instruction for complex transactions
        transaction.add(
            ComputeBudgetProgram.setComputeUnitLimit({
                units: 80000
            })
        );

        const sellArgs: SellIxArgs = {
            amount,
            minSolOutput
        };

        // Add sell instruction
        transaction.add(
            PumpInstructions.createSellInstruction(
                mint,
                this.payer.publicKey,
                sellArgs
            )
        );

        return sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.payer],
            { commitment: 'confirmed' }
        );
    }

    /**
     * Convenience method to sell all tokens
     * @param mint The mint public key of the token to sell
     * @param minSolOutput The minimum SOL output willing to accept
     * @param priorityFee Optional priority fee in microlamports
     * @returns The transaction signature
     */
    async sellAll(
        mint: PublicKey,
        minSolOutput: number | BN,
        priorityFee?: number
    ): Promise<string> {
        // Use MAX_UINT64 to sell all tokens
        const MAX_UINT64 = new BN('18446744073709551615');
        return this.sell(mint, MAX_UINT64, minSolOutput, priorityFee);
    }

    /**
     * Withdraw tokens from bonding curve (only works if bonding curve is complete)
     * @param mint The mint public key of the token
     * @returns The transaction signature
     */
    async withdraw(mint: PublicKey): Promise<string> {
        const instruction = PumpInstructions.createWithdrawInstruction(
            mint,
            this.payer.publicKey
        );

        const transaction = new Transaction().add(instruction);

        return sendAndConfirmTransaction(
            this.connection,
            transaction,
            [this.payer],
            { commitment: 'confirmed' }
        );
    }

    /**
     * Calculate the price for buying tokens with SOL
     * @param solAmount Amount of SOL to use for buying tokens
     * @param mint Token mint address
     * @returns Token amount to receive and price impact
     */
    async calculateBuyPrice(
        solAmount: number | BN,
        mint: PublicKey
    ): Promise<{ tokenAmount: BN; priceImpact: number }> {
        const bondingCurve = await this.getBondingCurveAccount(mint);
        if (!bondingCurve) {
            throw new Error('Bonding curve not found for the specified mint');
        }

        const result = BondingCurveCalculator.calculateBuyPrice(solAmount, bondingCurve);

        // Calculate price impact as a percentage
        const initialPrice = bondingCurve.virtualSolReserves.toNumber() / bondingCurve.virtualTokenReserves.toNumber();
        const finalPrice = result.newBondingCurve.virtualSolReserves.toNumber() /
            result.newBondingCurve.virtualTokenReserves.toNumber();
        const priceImpact = ((finalPrice - initialPrice) / initialPrice) * 100;

        return {
            tokenAmount: result.tokenAmount,
            priceImpact: priceImpact
        };
    }

    /**
     * Calculate the price for selling tokens for SOL
     * @param tokenAmount Amount of tokens to sell
     * @param mint Token mint address
     * @returns SOL amount to receive and price impact
     */
    async calculateSellPrice(
        tokenAmount: number | BN,
        mint: PublicKey
    ): Promise<{ solAmount: BN; priceImpact: number }> {
        const bondingCurve = await this.getBondingCurveAccount(mint);
        if (!bondingCurve) {
            throw new Error('Bonding curve not found for the specified mint');
        }

        const result = BondingCurveCalculator.calculateSellPrice(tokenAmount, bondingCurve);

        // Calculate price impact as a percentage
        const initialPrice = bondingCurve.virtualSolReserves.toNumber() / bondingCurve.virtualTokenReserves.toNumber();
        const finalPrice = result.newBondingCurve.virtualSolReserves.toNumber() /
            result.newBondingCurve.virtualTokenReserves.toNumber();
        const priceImpact = ((finalPrice - initialPrice) / initialPrice) * 100;

        return {
            solAmount: result.solAmount,
            priceImpact: priceImpact
        };
    }
}

// Export needed items from accounts and instructions explicitly instead of using wildcards
export {
    GlobalAccount,
    BondingCurveAccount,
    BondingCurveCalculator
} from './accounts';

export {
    PumpInstructions,
    findBondingCurve
} from './instructions';

export type {
    CreateIxArgs,
    BuyIxArgs,
    SellIxArgs
} from './instructions';

// Export the main SDK class as default
export default PumpFunSDK; 