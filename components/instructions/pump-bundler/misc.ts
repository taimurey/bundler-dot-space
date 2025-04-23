import base58 from "bs58";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, AddressLookupTableAccount } from "@solana/web3.js";
import { bundleWalletEntry } from "./types";
import BN from "bn.js";

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function validateSolAddress(address: string) {
    try {
        const pubkey = new PublicKey(address);
        const isOnCurveKey = PublicKey.isOnCurve(pubkey.toBuffer());
        return isOnCurveKey;
    } catch (error) {
        return false;
    }
}

export function convertIPFSURL(originalURL: string): string {
    const ipfsIdentifier = originalURL.split('/ipfs/')[1];
    if (ipfsIdentifier) {
        return `https://pump.mypinata.cloud/ipfs/${ipfsIdentifier}`;
    } else {
        return originalURL;
    }
}

export function getCurrentDateTime(): string {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `[${date} ${hours}:${minutes}:${seconds}]`;
}

export function getKeypairFromBs58(bs58String: string): Keypair | null {
    try {
        const privateKeyObject = base58.decode(bs58String);
        const privateKey = Uint8Array.from(privateKeyObject);
        const keypair = Keypair.fromSecretKey(privateKey);
        return keypair;
    } catch (e) {
        return null;
    }
}

export function isValidURL(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

export function getRandomElement<T>(array: T[]): T {
    const randomIndex = Math.floor(Math.random() * array.length);
    return array[randomIndex];
}

export async function getAluCreationCosts(
    walletCount: number,
    connection: Connection,
) {
    const totalBytes = 56 + ((walletCount - 1) * 32);
    const rentCost = await connection.getMinimumBalanceForRentExemption(totalBytes).catch(e => { console.log(e); return 0; });
    return rentCost / LAMPORTS_PER_SOL;
}

export function isWalletsUnique(entries: string[]): boolean {
    const seen = new Set<string>();
    for (const entry of entries) {
        if (seen.has(entry)) {
            return false;
        }
        seen.add(entry);
    }
    return true;
}

export function extractAddressFromUrl(url: string): string | null {
    try {
        url = url.trim().replace(/^\/+|\/+$/g, "");
        const regex = /^(https:\/\/)?(www\.)?pump\.fun\/([\w-]+)$/;
        const match = regex.exec(url);
        return match ? match[3] : url;
    } catch (e) {
        console.log("Error extracting address from URL:", e);
        return url;
    }
}

export async function checkkBalanceValidity(totalSol: number, wallets: bundleWalletEntry[], ghostBundlerBalance: number, devBalance: number) {
    if (((totalSol - wallets[0].sol) >= (ghostBundlerBalance / LAMPORTS_PER_SOL))) {
        throw new Error('Not enough sol in buyer wallet.');
    }
    if (wallets[0].sol >= devBalance) {
        throw new Error('Not enough sol in dev wallet');
    }
}

export async function loadSessionLookupTable(connection: Connection, lookupTableAddress: string) {
    let sessionLookupTableAccount: AddressLookupTableAccount | null = null;
    while (!sessionLookupTableAccount) {
        sessionLookupTableAccount = ((await connection.getAddressLookupTable(new PublicKey(lookupTableAddress))).value);
        if (!sessionLookupTableAccount) {
            console.log('Failed to load session Address Look up table. Retrying..');
            await sleep(1000);
        }
    }
    return sessionLookupTableAccount;
}

export function generateWallets(signerKeypair: Keypair, defaultSolAmount: number, numberWalletAmount: number): { wallets: bundleWalletEntry[] } {
    const emptyWalletsObject: { wallets: bundleWalletEntry[] } = {
        wallets: [{
            privateKey: base58.encode(signerKeypair.secretKey),
            sol: defaultSolAmount
        }]
    };

    for (let i = 0; i < numberWalletAmount - 1; i++) {
        const newKeypair = Keypair.generate();
        emptyWalletsObject.wallets.push({
            privateKey: base58.encode(newKeypair.secretKey),
            sol: defaultSolAmount,
        });
    }

    return emptyWalletsObject;
}

export const TAX_WALLET = new PublicKey("3GgqBX8MyUNCqgDHp2Qdr5Sxk41cvLJPiDMiXJUUu6tb");

const calculateFee = (amount: BN, feeBasisPoints: BN): BN => {
    return amount.mul(feeBasisPoints).div(new BN(10000));
};

export function calculateBuyTokensAndNewReserves(
    solAmount: BN,
    bondingCurve: any,
): { tokenAmount: BN, newReserves: any } {
    if (solAmount.eq(new BN(0)) || !bondingCurve) {
        return { tokenAmount: new BN(0), newReserves: bondingCurve };
    }

    let tokenAmount: BN;

    const product = bondingCurve.virtualSolReserves.mul(bondingCurve.virtualTokenReserves);
    const newSolReserves = bondingCurve.virtualSolReserves.add(solAmount);
    const newTokenAmount = product.div(newSolReserves).add(new BN(1));
    tokenAmount = bondingCurve.virtualTokenReserves.sub(newTokenAmount);
    tokenAmount = BN.min(tokenAmount, bondingCurve.realTokenReserves);

    const newReserves = {
        ...bondingCurve,
        virtualSolReserves: newSolReserves,
        virtualTokenReserves: bondingCurve.virtualTokenReserves.sub(tokenAmount),
    };

    return { tokenAmount, newReserves };
}

export function getSellQuote(amount: BN, bondingCurve: any, globalState: any) {
    if (amount.eq(new BN(0)) || !bondingCurve) {
        return new BN(0);
    }
    const quote = amount.mul(bondingCurve.virtualSolReserves)
        .div(bondingCurve.virtualTokenReserves.add(amount));
    const fee = calculateFee(quote, globalState.feeBasisPoints);
    return quote.sub(fee.mul(new BN(2)));
}