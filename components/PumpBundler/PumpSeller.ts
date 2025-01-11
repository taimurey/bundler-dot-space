import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { PUMP_PROGRAM_ID, tipAccounts } from "./constants";
import { AnchorProvider, Idl, Program } from "@coral-xyz/anchor";
import pumpIdl from "./pump-idl.json";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { getAssociatedTokenAddressSync } from "@solana/spl-token-2";
import { generatedSellIx } from "./instructions";
import { PublicKey } from "@metaplex-foundation/js";
import { BN } from "bn.js";
import { getKeypairFromBs58, getRandomElement } from "./misc";
import base58 from "bs58";
import { WalletEntry } from "@/pages/pumpfun/create/wallet-input";


export async function PumpSeller(
    connection: Connection,
    wallets: WalletEntry[],
    feepayer: string,
    tokenAddress: string,
    SellPercentage: string,
    BundleTip: string,
    BlockEngineSelection: string,
): Promise<string[]> {
    const initKeypair = getKeypairFromBs58(feepayer)!;
    const pumpProgram = new Program(
        pumpIdl as Idl,
        PUMP_PROGRAM_ID,
        new AnchorProvider(connection, new NodeWallet(initKeypair), AnchorProvider.defaultOptions())
    );

    const tokenMint = new PublicKey(tokenAddress);
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const bundleResults: string[] = [];
    const bundleTxn: VersionedTransaction[] = [];

    // Process wallets in batches of 2 wallets per transaction
    for (let i = 0; i < wallets.length; i += 2) {
        const currentWallets = wallets.slice(i, i + 2);

        for (const walletEntry of currentWallets) {
            const wallet = Keypair.fromSecretKey(new Uint8Array(bs58.decode(walletEntry.wallet)));
            let tokenBalance;

            try {
                tokenBalance = await connection.getTokenAccountBalance(
                    getAssociatedTokenAddressSync(tokenMint, wallet.publicKey)
                );
            } catch (e) {
                console.error(`Error fetching balance for wallet ${wallet.publicKey}:`, e);
                continue;
            }

            if (Number(tokenBalance!.value.amount) === 0) {
                continue;
            }

            console.log(`Selling ${tokenBalance!.value.amount} tokens from wallet ${wallet.publicKey}`);

            const totalAmount = Number(tokenBalance!.value.amount) * (Number(SellPercentage) / 100);
            const sellIx = await generatedSellIx(tokenMint, wallet, new BN(totalAmount), new BN(1), pumpProgram);

            const buyerIxs = [sellIx];
            const signers = [wallet];

            // Add tip instruction for the last transaction in the bundle
            if (bundleTxn.length === 4 && walletEntry === currentWallets[currentWallets.length - 1]) {
                const tipAmount = Number(BundleTip) * LAMPORTS_PER_SOL;
                const tipIx = SystemProgram.transfer({
                    fromPubkey: initKeypair.publicKey,
                    toPubkey: new PublicKey(getRandomElement(tipAccounts)),
                    lamports: tipAmount,
                });

                buyerIxs.push(tipIx);
                signers.push(initKeypair);
            }

            // Create and sign the transaction
            const versionedTxn = new VersionedTransaction(
                new TransactionMessage({
                    payerKey: initKeypair.publicKey,
                    recentBlockhash: recentBlockhash,
                    instructions: buyerIxs,
                }).compileToV0Message()
            );

            versionedTxn.sign(signers);
            bundleTxn.push(versionedTxn);

            // Send the bundle when 5 transactions are ready
            if (bundleTxn.length === 5) {
                const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));
                console.log('Sending bundle:', EncodedbundledTxns);

                try {
                    const response = await fetch('https://mevarik-deployer.xyz:8080/send-bundle', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ blockengine: `https://${BlockEngineSelection}`, txns: EncodedbundledTxns }),
                    });

                    if (!response.ok) {
                        const message = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
                    }

                    const result = await response.json();
                    bundleResults.push(result);
                } catch (error) {
                    console.error('Error sending bundle:', error);
                    throw error;
                }

                // Clear the bundle for the next batch
                bundleTxn.length = 0;
            }
        }
    }

    // Send any remaining transactions in the last bundle
    if (bundleTxn.length > 0) {
        const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));
        console.log('Sending final bundle:', EncodedbundledTxns);

        try {
            const response = await fetch('https://mevarik-deployer.xyz:8080/send-bundle', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ blockengine: `https://${BlockEngineSelection}`, txns: EncodedbundledTxns }),
            });

            if (!response.ok) {
                const message = await response.text();
                throw new Error(`HTTP error! status: ${response.status}, message: ${message}`);
            }

            const result = await response.json();
            bundleResults.push(result);
        } catch (error) {
            console.error('Error sending final bundle:', error);
            throw error;
        }
    }

    return bundleResults; // Return results of all bundles sent
}