import { PublicKey, Connection, AccountInfo } from '@solana/web3.js';
import BN from 'bn.js';

// Account discriminators from Rust code
export const GLOBAL_ACCOUNT_DISCM = Buffer.from([167, 232, 232, 177, 200, 108, 114, 127]);
export const BONDING_CURVE_ACCOUNT_DISCM = Buffer.from([23, 183, 248, 55, 96, 216, 172, 96]);

// Constants from the Rust code
export const PUMPFUN_PROGRAM_ID = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');
export const GLOBAL_STATE = new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf');

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
 * Class for managing Global account
 */
export class GlobalAccount {
    /**
     * Fetch and deserialize the Global account data
     * @param connection Solana connection
     * @returns Global account data, or null if not found
     */
    static async fetch(connection: Connection): Promise<Global | null> {
        try {
            const accountInfo = await connection.getAccountInfo(GLOBAL_STATE);
            if (!accountInfo) return null;

            return GlobalAccount.deserialize(accountInfo);
        } catch (error) {
            console.error('Error fetching Global account:', error);
            return null;
        }
    }

    /**
     * Deserialize the Global account data from AccountInfo
     * @param accountInfo Account info from the connection
     * @returns Deserialized Global account data
     */
    static deserialize(accountInfo: AccountInfo<Buffer>): Global {
        // Check for discriminator
        const data = accountInfo.data;
        const discriminator = data.slice(0, 8);
        if (!GLOBAL_ACCOUNT_DISCM.equals(discriminator)) {
            throw new Error('Invalid account discriminator for Global account');
        }

        const accountData = data.slice(8);

        // Deserialize the data (following the Rust struct layout)
        // bool initialized
        const initialized = accountData[0] !== 0;

        // Pubkey authority
        const authority = new PublicKey(accountData.slice(1, 33));

        // Pubkey feeRecipient
        const feeRecipient = new PublicKey(accountData.slice(33, 65));

        // u64 initialVirtualTokenReserves
        const initialVirtualTokenReserves = new BN(accountData.slice(65, 73), 'le');

        // u64 initialVirtualSolReserves
        const initialVirtualSolReserves = new BN(accountData.slice(73, 81), 'le');

        // u64 initialRealTokenReserves
        const initialRealTokenReserves = new BN(accountData.slice(81, 89), 'le');

        // u64 tokenTotalSupply
        const tokenTotalSupply = new BN(accountData.slice(89, 97), 'le');

        // u64 feeBasisPoints
        const feeBasisPoints = new BN(accountData.slice(97, 105), 'le');

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
    }
}

/**
 * Class for managing BondingCurve account
 */
export class BondingCurveAccount {
    /**
     * Fetch and deserialize the BondingCurve account data
     * @param connection Solana connection
     * @param mint Token mint address
     * @returns BondingCurve account data, or null if not found
     */
    static async fetch(connection: Connection, mint: PublicKey): Promise<BondingCurve | null> {
        try {
            const bondingCurveAddress = findBondingCurve(mint);
            const accountInfo = await connection.getAccountInfo(bondingCurveAddress);
            if (!accountInfo) return null;

            return BondingCurveAccount.deserialize(accountInfo);
        } catch (error) {
            console.error('Error fetching BondingCurve account:', error);
            return null;
        }
    }

    /**
     * Deserialize the BondingCurve account data from AccountInfo
     * @param accountInfo Account info from the connection
     * @returns Deserialized BondingCurve account data
     */
    static deserialize(accountInfo: AccountInfo<Buffer>): BondingCurve {
        // Check for discriminator
        const data = accountInfo.data;
        const discriminator = data.slice(0, 8);
        if (!BONDING_CURVE_ACCOUNT_DISCM.equals(discriminator)) {
            throw new Error('Invalid account discriminator for BondingCurve account');
        }

        const accountData = data.slice(8);

        // Deserialize the data (following the Rust struct layout)
        // u64 virtualTokenReserves
        const virtualTokenReserves = new BN(accountData.slice(0, 8), 'le');

        // u64 virtualSolReserves
        const virtualSolReserves = new BN(accountData.slice(8, 16), 'le');

        // u64 realTokenReserves
        const realTokenReserves = new BN(accountData.slice(16, 24), 'le');

        // u64 realSolReserves
        const realSolReserves = new BN(accountData.slice(24, 32), 'le');

        // u64 tokenTotalSupply
        const tokenTotalSupply = new BN(accountData.slice(32, 40), 'le');

        // bool complete
        const complete = accountData[40] !== 0;

        return {
            virtualTokenReserves,
            virtualSolReserves,
            realTokenReserves,
            realSolReserves,
            tokenTotalSupply,
            complete,
        };
    }

    /**
     * Create a new BondingCurveAccount instance
     * @param virtualTokenReserves Virtual token reserves amount
     * @param virtualSolReserves Virtual SOL reserves amount
     * @param realTokenReserves Real token reserves amount
     * @param realSolReserves Real SOL reserves amount
     * @param tokenTotalSupply Token total supply
     * @param complete Whether the bonding curve is complete
     * @returns A new BondingCurve instance
     */
    static new(
        virtualTokenReserves: number | BN,
        virtualSolReserves: number | BN,
        realTokenReserves: number | BN,
        realSolReserves: number | BN,
        tokenTotalSupply: number | BN,
        complete: boolean
    ): BondingCurve {
        return {
            virtualTokenReserves: typeof virtualTokenReserves === 'number'
                ? new BN(virtualTokenReserves)
                : virtualTokenReserves,
            virtualSolReserves: typeof virtualSolReserves === 'number'
                ? new BN(virtualSolReserves)
                : virtualSolReserves,
            realTokenReserves: typeof realTokenReserves === 'number'
                ? new BN(realTokenReserves)
                : realTokenReserves,
            realSolReserves: typeof realSolReserves === 'number'
                ? new BN(realSolReserves)
                : realSolReserves,
            tokenTotalSupply: typeof tokenTotalSupply === 'number'
                ? new BN(tokenTotalSupply)
                : tokenTotalSupply,
            complete,
        };
    }
}

/**
 * Utility functions for bonding curve calculations
 */
export class BondingCurveCalculator {
    /**
     * Calculate the price for buying tokens with SOL
     * This is a TypeScript implementation of the Rust calculate_buy_price function
     * @param solAmount Amount of SOL to use for buying tokens
     * @param bondingCurve Current bonding curve state
     * @returns Token amount to receive and new bonding curve state
     */
    static calculateBuyPrice(
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
     * @param tokenAmount Amount of tokens to sell
     * @param bondingCurve Current bonding curve state
     * @returns SOL amount to receive and new bonding curve state
     */
    static calculateSellPrice(
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