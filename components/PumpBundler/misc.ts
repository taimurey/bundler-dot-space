
import base58 from "bs58"
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, AddressLookupTableAccount, sendAndConfirmRawTransaction, Transaction, AccountInfo } from "@solana/web3.js";
import { IrysOptions, irysStorage, keypairIdentity, Metaplex, toMetaplexFile } from "@metaplex-foundation/js";
import { bundleWalletEntry, Metadata } from "./types";
import path from "path"
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
        let pubkey = new PublicKey(address)
        let isOnCurveKey = PublicKey.isOnCurve(pubkey.toBuffer())
        return isOnCurveKey
    } catch (error) {
        return false
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



export async function getImageAndMetadataUploadPrice(
    meta: Metaplex,
    connection: Connection,
    imageFilePath: string,
    metadata: Metadata,
): Promise<{
    imagePrice: number,
    metadataPrice: number
}> {
    const imageData = fs.readFileSync(path.resolve(`assets/${imageFilePath}`));
    const imagePrice = await meta.storage().getUploadPriceForFile(toMetaplexFile(imageData, `$${metadata.symbol.toUpperCase}`)).catch(e => null);
    const adjustedImagePrice = Number(imagePrice ? imagePrice.basisPoints : 0) / LAMPORTS_PER_SOL;

    const tempMetadata = {
        ...metadata,
        image: 'A'.repeat(55),
    };
    const metadataBuffer = Buffer.from(JSON.stringify(tempMetadata));
    const metadataPrice = await meta.storage().getUploadPriceForFile(
        toMetaplexFile(metadataBuffer, `$${metadata.symbol.toUpperCase()}`)).catch(e => null);

    const adjustedmetadataPrice = Number(metadataPrice ? metadataPrice.basisPoints : 0) / LAMPORTS_PER_SOL;

    return {
        imagePrice: adjustedImagePrice,
        metadataPrice: adjustedmetadataPrice,
    }
}

export async function uploadMetadata(
    meta: Metaplex,
    imageFilePath: string,
    metadata: Metadata,
): Promise<{
    imageUri: string,
    metadataUri: string,
    result: boolean
}> {
    const imageData = fs.readFileSync(path.resolve(`assets/${imageFilePath}`));

    const image_uri = await meta.storage().upload(toMetaplexFile(imageData, `$${metadata.symbol.toUpperCase()}`)).catch(e => '');
    if (!image_uri) {
        return { imageUri: '', metadataUri: '', result: false };
    }

    const metadataCopy: Metadata = Object.keys(metadata).reduce((acc, key) => {
        if (metadata[key as keyof Metadata] !== undefined && metadata[key as keyof Metadata] !== null && metadata[key as keyof Metadata] !== '') {
            acc[key as keyof Metadata] = metadata[key as keyof Metadata] as string;
        }
        return acc;
    }, {} as Metadata);

    //@ts-ignore
    metadataCopy.image = image_uri;
    const metadata_uri = await meta.storage().upload(toMetaplexFile(Buffer.from(JSON.stringify(metadataCopy)), `$${metadata.symbol.toUpperCase()}`)).catch(e => '');
    if (!image_uri) {
        return { imageUri: '', metadataUri: '', result: false };
    }


    return { imageUri: image_uri, metadataUri: metadata_uri, result: true };
}

export async function getAluCreationCosts(
    walletCount: number,
    connection: Connection,
) {
    const totalBytes = 56 + ((walletCount - 1) * 32);
    const rentCost = await connection.getMinimumBalanceForRentExemption(totalBytes).catch(e => 0);
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



export async function send_transactions(
    Transactions: Transaction[],
    connection: Connection,
    logOutputs: boolean,
) {
    try {
        var staggeredTransactions: Promise<string>[] = []
        var i = 1
        Transactions.forEach((tx, idx) => {
            const prms = new Promise<string>((resolve) => {
                setTimeout(() => {
                    sendAndConfirmRawTransaction(connection, tx.serialize(), { skipPreflight: true, commitment: 'confirmed', maxRetries: 0 })
                        .then(async (sig) => {
                            if (logOutputs) {
                                console.log('\n');
                                console.log(chalk.gray(`Transaction ${idx + 1} successful with sig: ${chalk.whiteBright(sig)}`))
                            }
                            resolve(sig);
                        })
                        .catch(error => {
                            //console.log('Transaction failed :c')
                            resolve('failed');
                        })
                }, 100 * i)
            })
            staggeredTransactions.push(prms);
            i += 1
        })
        const result = await Promise.allSettled(staggeredTransactions)
        const values = []
        for (var entry of result) {
            //@ts-ignore      
            values.push(entry.value)
        }
        return values

    } catch (e) {
        return ['failed'];
    }
};

export async function checkkBalanceValidity(totalSol: number, wallets: bundleWalletEntry[], ghostBundlerBalance: number, devBalance: number) {
    //first check for balances
    if (((totalSol - wallets[0].sol) >= (ghostBundlerBalance / LAMPORTS_PER_SOL))) {
        console.log(chalk.red.bold('Not enough sol in ghost bundler wallet.'));
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
    };
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



export async function getWalletCleanUpReceiver(
    option: '1' | '2' | '3',
    ghostBundlerKeypair: Keypair,
    signerKeypair: Keypair,
) {

    let receiver: PublicKey = new PublicKey(ghostBundlerKeypair.publicKey);

    if (option == '1') { receiver = ghostBundlerKeypair.publicKey; }
    if (option == '2') { receiver = signerKeypair.publicKey; }
    if (option == '3') {
        const inputtedWallet = (await getUserInput(chalk.white('Receiver pubkey: ')));
        if (!validateSolAddress(inputtedWallet)) {
            console.log(chalk.red.bold('Invalid pubkey'));
            await sleep(3000);
            process.exit(1);
        } else {
            receiver = new PublicKey(inputtedWallet);
        }
    };
    return receiver;

}


export async function getDecodedAtaEntries(wallets: bundleWalletEntry[], connection: Connection, inputtedMint: string, signers: Keypair[]) {
    const atas = wallets.map((e, idx) => getAssociatedTokenAddressSync(new PublicKey(inputtedMint), signers[idx].publicKey,));

    let ataAccountsInfo: (AccountInfo<Buffer> | null)[] | null = null;
    while (!ataAccountsInfo) {
        ataAccountsInfo = await connection.getMultipleAccountsInfo(atas).catch(e => { console.log(e); return null });
    }

    let decodedAtaAccountsEntries = ataAccountsInfo.map((e, idx) => {
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

export function calculateBuyTokens(
    solAmount: BN,
    bondingCurve: any,
): BN {
    if (solAmount.eq(new BN(0)) || !bondingCurve) {
        return new BN(0);
    }
    //let quote: BN;
    let tokenAmount: BN;

    const product = bondingCurve.virtualSolReserves.mul(bondingCurve.virtualTokenReserves);
    const newSolReserves = bondingCurve.virtualSolReserves.add(solAmount);
    const newTokenAmount = product.div(newSolReserves).add(new BN(1));
    tokenAmount = bondingCurve.virtualTokenReserves.sub(newTokenAmount);
    tokenAmount = BN.min(tokenAmount, bondingCurve.realTokenReserves);
    return tokenAmount;
};


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