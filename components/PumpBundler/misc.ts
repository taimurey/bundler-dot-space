
import base58 from "bs58"
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, AddressLookupTableAccount, AccountInfo } from "@solana/web3.js";
import { IrysOptions, irysStorage, keypairIdentity, Metaplex } from "@metaplex-foundation/js";
import { bundleWalletEntry } from "./types";
import fs from "fs";
import chalk from "chalk"
import { AccountLayout, } from "@solana/spl-token";
import BN from "bn.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token-2";
export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function validateSolAddress(address: string) {
    try {
        const pubkey = new PublicKey(address)
        const isOnCurveKey = PublicKey.isOnCurve(pubkey.toBuffer())
        return isOnCurveKey
    } catch (error) {
        return false
    }
}

export function convertIPFSURL(originalURL: string): string {
    const ipfsIdentifier = originalURL.split('/ipfs/')[1];
    if (ipfsIdentifier) {
        return `https://pump.mypinata.cloud/ipfs/${ipfsIdentifier}`;
    } else {
        // If the URL format is not correct, return the original URL
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
        return null
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



export function getMetaplexInstance(
    connection: Connection,
    signerKeypair: Keypair,
) {
    const Meta = new Metaplex(connection);
    Meta.use(keypairIdentity(signerKeypair));
    Meta.use(irysStorage({
        timeout: 30 * 1000,
        identity: signerKeypair,
        providerUrl: connection.rpcEndpoint,
    } as IrysOptions));

    return Meta;
}




export async function getAluCreationCosts(
    walletCount: number,
    connection: Connection,
) {
    const totalBytes = 56 + ((walletCount - 1) * 32);
    const rentCost = await connection.getMinimumBalanceForRentExemption(totalBytes).catch(e => { console.log(e); return 0 });
    return rentCost / LAMPORTS_PER_SOL;
}

export function isWalletsUnique(entries: string[]): boolean {
    const seen = new Set<string>();
    for (const entry of entries) {
        if (seen.has(entry)) {
            return false; // Duplicate found
        }
        seen.add(entry);
    }
    return true; // All entries are unique
}


export function extractAddressFromUrl(url: string): string | null {
    try {
        // Trim leading/trailing spaces and slashes
        url = url.trim().replace(/^\/+|\/+$/g, "");

        // Handle URLs with or without "www" and "https"
        const regex = /^(https:\/\/)?(www\.)?pump\.fun\/([\w-]+)$/;
        const match = regex.exec(url);

        if (match) {
            // Return the matched group (3rd capturing group)
            return match[3];
        } else {
            return url;
        }

    } catch (e) {
        console.log("Error extracting address from URL:", e);
        return url;
    }
}

export async function checkkBalanceValidity(totalSol: number, wallets: bundleWalletEntry[], ghostBundlerBalance: number, devBalance: number) {
    //first check for balances
    if (((totalSol - wallets[0].sol) >= (ghostBundlerBalance / LAMPORTS_PER_SOL))) {
        console.log(chalk.red.bold('Not enough sol in buyer wallet.'));
        await sleep(3000);
        process.exit(1);
    }
    if (wallets[0].sol >= devBalance) {
        console.log(chalk.red.bold('Not enough sol in dev wallet'));
        await sleep(3000);
        process.exit(1);
    }
}

export async function loadSessionLookupTable(connection: Connection,) {
    let sessionLookupTableAccount: AddressLookupTableAccount | null = null;
    while (!sessionLookupTableAccount) {
        sessionLookupTableAccount = ((await connection.getAddressLookupTable(new PublicKey(JSON.parse(fs.readFileSync('alu.dont-delete.temp.json', 'utf8')).address))).value);
        if (!sessionLookupTableAccount) {
            console.log(chalk.red('Failed to load session Address Look up table.'));
            console.log(chalk.red('Retrying..'))
        }
    }
    return sessionLookupTableAccount;
}



export function generateWallets(signerKeypair: Keypair, defaultSolAmount: number, numberWalletAmount: number) {
    const emptyWalletsObject: { wallets: bundleWalletEntry[] } = {
        wallets: [{
            privateKey: base58.encode(signerKeypair.secretKey),
            sol: defaultSolAmount
        }]
    };
    for (let i = 0; i < numberWalletAmount - 1; i++) {
        const newKeypair = Keypair.generate();
        const amount = defaultSolAmount;
        emptyWalletsObject.wallets.push({
            privateKey: base58.encode(newKeypair.secretKey),
            sol: amount,
        });
    }
    fs.writeFileSync('bundle-wallets.json', JSON.stringify(emptyWalletsObject, null, 4));
}

export async function validateAluFileExists() {
    //first check if file exists
    if (!fs.existsSync('alu.dont-delete.temp.json')) {
        console.log(chalk.red('Could not find a valid `alu.dont-delete.temp.json` file '));
        await sleep(3000);
        process.exit(1);
    }
}






export async function getDecodedAtaEntries(wallets: bundleWalletEntry[], connection: Connection, inputtedMint: string, signers: Keypair[]) {
    const atas = wallets.map((e, idx) => getAssociatedTokenAddressSync(new PublicKey(inputtedMint), signers[idx].publicKey,));

    let ataAccountsInfo: (AccountInfo<Buffer> | null)[] | null = null;
    while (!ataAccountsInfo) {
        ataAccountsInfo = await connection.getMultipleAccountsInfo(atas).catch(e => { console.log(e); return null });
    }

    const decodedAtaAccountsEntries = ataAccountsInfo.map((e, idx) => {
        if (e != null) {
            return {
                validSigner: signers[idx],
                ata: atas[idx],
                accountData: AccountLayout.decode(e.data),
            }
        } else {
            return null
        }
    }).filter(e => e != null);

    return decodedAtaAccountsEntries;
}



const calculateFee = (amount: BN, feeBasisPoints: BN): BN => {
    return amount.mul(feeBasisPoints).div(new BN(10000));
};

// export function calculateBuyTokens(
//     solAmount: BN,
//     bondingCurve: any,
// ): BN {
//     if (solAmount.eq(new BN(0)) || !bondingCurve) {
//         return new BN(0);
//     }
//     //let quote: BN;
//     let tokenAmount: BN;

//     const product = bondingCurve.virtualSolReserves.mul(bondingCurve.virtualTokenReserves);
//     const newSolReserves = bondingCurve.virtualSolReserves.add(solAmount);
//     const newTokenAmount = product.div(newSolReserves).add(new BN(1));
//     tokenAmount = bondingCurve.virtualTokenReserves.sub(newTokenAmount);
//     tokenAmount = BN.min(tokenAmount, bondingCurve.realTokenReserves);
//     return tokenAmount;
// }

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


export function prepareStdinListener() {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
}

export function resetStdinListener() {
    process.stdin.setRawMode(false);
    process.stdin.pause();
}

//export function getSimulatedHolderDistributions(global:any, wallets:bundleWalletEntry[]) {
//
//    const totalTokenSupply = global.tokenTotalSupply as BN;
//
//    const walletTokenBuys = wallets.map(e=>{
//        return new BN(e.sol * LAMPORTS_PER_SOL);
//    });
//
//    
//    for (let)
//
//
//}