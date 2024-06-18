
// import chalk from "chalk";
// import { loginEndpoint, PUMP_PROGRAM_ID, registerEndpoint } from "../constants";
// import {
//     convertIPFSURL, extractAddressFromUrl, getKeypairFromBs58, sleep, getCurrentDateTime
// } from '../misc';
// import { Keypair, PublicKey } from "@solana/web3.js";
// import nacl from "tweetnacl"
// import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
// import comments from "./comments.json";
// import * as pdas from "../pdas";
// import { Program } from "@coral-xyz/anchor";
// import idl from "../pump-idl.json";
// import * as anchor from "@coral-xyz/anchor"
// import { Connection } from "@solana/web3.js";
// import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
// import { Metaplex } from "@metaplex-foundation/js";
// import { repliesEndpoint } from "../constants";

// export interface GeneratedWalletEntry {
//     token: string,
//     address: PublicKey,
//     comment?: string,
// }
// //logging in to receiver authentication bearer token
// async function login(keypair: Keypair) {

//     try {
//         const time = Date.now();

//         const encoder = new TextEncoder();
//         const messageBytes = encoder.encode('Sign in to pump.fun: '.concat(time.toString()));
//         const signature = nacl.sign.detached(messageBytes, keypair.secretKey);
//         const hexString = Buffer.from(signature).toString('hex');

//         const base58Encoded = bs58.encode(Buffer.from(hexString, 'hex'));
//         //console.log(base58Encoded)
//         //console.log(b64);
//         //console.log(signature)
//         //console.log(time)
//         const loginRes = await fetch(loginEndpoint, {
//             method: 'POST',
//             mode: 'cors',
//             headers: {
//                 "Content-Type": "application/json",
//                 "Origin": "https://pump.fun",
//                 "Referer": "https://pump.fun/",
//                 "Host": "client-api-2-74b1891ee9f9.herokuapp.com",
//                 "Accept": "*/*"
//             },
//             body: JSON.stringify({
//                 address: keypair.publicKey.toBase58(),
//                 signature: base58Encoded,
//                 timestamp: time,
//             })
//         }).then(res => res.json())
//             .catch(e => console.log(e));


//         return loginRes.access_token ?? null;

//     } catch (e) {
//         return null
//     }
// }


// async function register(entry: GeneratedWalletEntry) {

//     const res = await fetch(registerEndpoint, {
//         method: 'POST',
//         mode: 'cors',
//         headers: {
//             "Content-Type": "application/json",
//             "Origin": "https://pump.fun",
//             "Referer": "https://pump.fun/",
//             "Host": "client-api-2-74b1891ee9f9.herokuapp.com",
//             "Accept": "*/*",
//             "Authorization": "Bearer ".concat(entry.token),
//         },
//         body: JSON.stringify({
//             address: entry.address,
//         })
//     }).then(res => res.json())
//         .catch(e => console.log(e));

//     return res;
// }


// async function reply(entry: GeneratedWalletEntry, mint: string) {

//     const res = await fetch(repliesEndpoint, {
//         method: 'POST',
//         mode: 'cors',
//         headers: {
//             "Content-Type": "application/json",
//             "Origin": "https://pump.fun",
//             "Referer": "https://pump.fun/",
//             "Host": "client-api-2-74b1891ee9f9.herokuapp.com",
//             "Accept": "*/*",
//             "Authorization": "Bearer ".concat(entry.token),
//         },
//         body: JSON.stringify({
//             mint: mint,
//             text: entry.comment
//         })
//     }).then(res => { })
//         .catch(e => console.log(e));

//     return res;
// }

// function getRandomAndRemove(set: Set<string>) {
//     const setArray = Array.from(set);


//     if (setArray.length === 0) {
//         throw new Error('no more comments, nothing to remove');
//     }

//     const randomIndex = Math.floor(Math.random() * setArray.length);

//     const randomValue = setArray[randomIndex];

//     set.delete(randomValue);

//     return randomValue;
// }


// function replaceToken(text: string, token: string, replacement: string): string {
//     const escapedToken = token.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
//     const regex = new RegExp(escapedToken, 'g');

//     return text.replace(regex, replacement);
// }


// async function fetch_metadata(connection: Connection, mint_address: PublicKey) {
//     try {
//         const metaplex = Metaplex.make(connection);

//         const data = await metaplex.nfts().findByMint({ mintAddress: mint_address, loadJsonMetadata: false });

//         const brokenUrl = data.uri;
//         //console.log(brokenUrl);
//         const newURL = convertIPFSURL(brokenUrl);
//         const metadataJson = await fetch(newURL).then(e => e.json());
//         return metadataJson
//     } catch (e) {
//         return {}
//     }
// }
// export async function commentBomb(
//     connection: Connection,
//     signerkeypair: string,
//     commentCount: string,
//     inputtedMint: string,
// ): Promise<string> {

//     let commentAmount: number = Number(commentCount);
//     if (!commentAmount || commentAmount < 0 || commentAmount > 200) {
//         await sleep(3000); return 'Invalid comment amount';
//     }

//     const signerKeypair = getKeypairFromBs58(signerkeypair)!;
//     //initializing program
//     const program = new Program(idl as anchor.Idl, PUMP_PROGRAM_ID, new anchor.AnchorProvider(connection, new NodeWallet(signerKeypair), anchor.AnchorProvider.defaultOptions()));

//     //getting the coin to bomb:
//     inputtedMint = extractAddressFromUrl(inputtedMint) ?? inputtedMint;

//     const bondingCurvePda = pdas.getBondingCurve(new PublicKey(inputtedMint), program.programId);
//     const bondingCurveData = await program.account.bondingCurve.fetchNullable(bondingCurvePda);
//     if (!bondingCurveData) {
//         await sleep(3000); return 'Invalid mint address';
//     }

//     const metadata = await fetch_metadata(connection, new PublicKey(inputtedMint));

//     const generatedKeypairs: Keypair[] = new Array<any>(commentAmount).fill(0).map(() => Keypair.generate());
//     const walletEntries: GeneratedWalletEntry[] = [];


//     const batchSize = 15

//     //first we authenticate and register wallets
//     for (let i = 0; i < generatedKeypairs.length; i += batchSize) {
//         const batch = generatedKeypairs.slice(i, i + batchSize);
//         const promiseArray: Promise<void>[] = [];

//         for (let key of batch) {
//             const promise = new Promise<void>(async (resolve, reject) => {
//                 try {
//                     const token = await login(key);
//                     if (token) {
//                         const entry = {
//                             address: key.publicKey,
//                             token: token
//                         }
//                         await register(entry);
//                         walletEntries.push(entry)
//                         resolve();
//                     } else {
//                         resolve();
//                     }
//                 } catch (e) {
//                     resolve();
//                 }
//             })
//             promiseArray.push(promise);
//         }

//         await Promise.all(promiseArray)
//     }



//     const commentsSet = new Set(comments as Array<string>);
//     for (let entry of walletEntries) {
//         let pickedComment = getRandomAndRemove(commentsSet);
//         if (pickedComment.includes('$TOKEN')) {
//             //@ts-ignore
//             pickedComment = replaceToken(pickedComment, '$TOKEN', '$' + (metadata?.symbol) ?? '')
//         };
//         entry.comment = pickedComment;
//     };





//     //now we bomb
//     const replyBatchSize = 8
//     for (let i = 0; i < walletEntries.length; i += replyBatchSize) {
//         const batch = walletEntries.slice(i, i + replyBatchSize);
//         const promiseArray: Promise<void>[] = [];

//         for (let entry of batch) {
//             const promise = new Promise<void>(async (resolve, reject) => {
//                 try {
//                     await reply(entry, inputtedMint);
//                     console.log(chalk.gray.bold(`${chalk.whiteBright.bold(getCurrentDateTime())} Wallet ${chalk.whiteBright.bold(entry.address.toBase58().substring(0, 8))} comment sent. ✅.`))
//                     resolve();
//                 } catch (e) {
//                     console.log(chalk.red('Error while performing operation.'))
//                     resolve();
//                 }
//             })
//             promiseArray.push(promise);
//         }

//         await Promise.all(promiseArray);
//         await sleep(500);
//     };

//     await sleep(3000);


//     return 'done';
// }


// //commentBomb();