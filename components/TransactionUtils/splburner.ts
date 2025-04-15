// import { createBurnCheckedInstruction, getAssociatedTokenAddress } from '@solana/spl-token';
// import { WalletContextState } from '@solana/wallet-adapter-react';
// import { Connection, PublicKey, Transaction, } from '@solana/web3.js';
// import { toast } from "sonner";
// import { sendSignedTransaction, signTransaction } from '../../utils/transaction';


// async function BurnSplTokens(MintAddress: PublicKey, connection: Connection, wallet: WalletContextState, BURN_QUANTITY: number, MINT_DECIMALS: number) {
//     if (!wallet.publicKey) {
//         toast.error('Wallet not connected');
//         return;
//     }
//     toast.info(`Attempting to burn ${BURN_QUANTITY} [${MintAddress}] tokens from Owner Wallet: ${wallet.publicKey.toString()}`);


//     const account = await getAssociatedTokenAddress(new PublicKey(MintAddress), wallet.publicKey);

//     const burnIx = createBurnCheckedInstruction(
//         account,
//         new PublicKey(MintAddress),
//         wallet.publicKey, // Public Key of Owner's Wallet
//         BURN_QUANTITY * (10 ** MINT_DECIMALS), // Number of tokens to burn
//         MINT_DECIMALS // Number of Decimals of the Token Mint
//     );


//     // Step 4 - Assemble Transaction
//     const transaction = new Transaction().add(burnIx);

//     const signedTx = await signTransaction({
//         transaction: transaction,
//         wallet,
//         signers: [],
//         connection,
//     });

//     await sendSignedTransaction({
//         signedTransaction: signedTx,
//         connection,
//         skipPreflight: false,
//         sendingCallback: async () => {
//             toast.info(`Minting  tokens...`, { duration 2000 });
//         },
//         successCallback: async (txSig: string) => {
//             toast(() => (
//                 toast.info(`Successfully minted tokens.`),
//                 toast.success(`Transaction successful! ${txSig}`)
//             ));
//         },
//     });
// }

// export default BurnSplTokens;