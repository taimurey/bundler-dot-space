import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { tipAccounts } from "./constants";
import { getKeypairFromBs58, getRandomElement } from "./misc";
import base58 from "bs58";
import BN from "bn.js";

interface WalletEntry {
    wallet: string;
}

// Helper function to generate sell instruction from API
async function generateSellInstruction(
    tokenMint: PublicKey,
    sellerWallet: Keypair,
    amount: BN
): Promise<TransactionInstruction> {
    try {
        const response = await fetch('https://mevarik-deployer.xyz:8080/api/sell-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                wallet: sellerWallet.publicKey.toString(),
                mint: tokenMint.toString(),
                amount: amount.toString(),
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.data?.instructions?.[0]) {
            throw new Error(data.message || 'Failed to generate sell instruction');
        }

        // Parse the instruction from the response
        const instructionData = JSON.parse(data.data.instructions[0]);
        return new TransactionInstruction({
            programId: new PublicKey(instructionData.programId),
            keys: instructionData.keys.map((key: any) => ({
                pubkey: new PublicKey(key.pubkey),
                isSigner: key.isSigner,
                isWritable: key.isWritable,
            })),
            data: Buffer.from(instructionData.data, 'base64'),
        });
    } catch (error) {
        console.error('Error generating sell instruction:', error);
        throw error;
    }
}

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
    const tokenMint = new PublicKey(tokenAddress);
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const bundleResults: string[] = [];
    const bundleTxn: VersionedTransaction[] = [];

    // Process wallets in batches of 2 wallets per transaction
    for (let i = 0; i < wallets.length; i += 2) {
        const currentWallets = wallets.slice(i, i + 2);

        for (const walletEntry of currentWallets) {
            const wallet = Keypair.fromSecretKey(new Uint8Array(base58.decode(walletEntry.wallet)));
            let tokenBalance;

            try {
                const tokenAccount = getAssociatedTokenAddressSync(tokenMint, wallet.publicKey);
                tokenBalance = await connection.getTokenAccountBalance(tokenAccount);
            } catch (e) {
                console.error(`Error fetching balance for wallet ${wallet.publicKey}:`, e);
                continue;
            }

            if (Number(tokenBalance!.value.amount) === 0) {
                continue;
            }

            console.log(`Selling ${tokenBalance!.value.amount} tokens from wallet ${wallet.publicKey}`);

            const totalAmount = new BN(
                Math.floor(Number(tokenBalance!.value.amount) * (Number(SellPercentage) / 100))
            );

            try {
                const sellIx = await generateSellInstruction(tokenMint, wallet, totalAmount);
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
                        payerKey: wallet.publicKey,
                        recentBlockhash: recentBlockhash,
                        instructions: buyerIxs,
                    }).compileToV0Message()
                );

                versionedTxn.sign(signers);
                bundleTxn.push(versionedTxn);

                // Send the bundle when 5 transactions are ready
                if (bundleTxn.length === 5) {
                    await sendBundle(bundleTxn, BlockEngineSelection, bundleResults);
                    bundleTxn.length = 0;
                }
            } catch (error) {
                console.error(`Error processing wallet ${wallet.publicKey}:`, error);
                continue;
            }
        }
    }

    // Send any remaining transactions in the last bundle
    if (bundleTxn.length > 0) {
        await sendBundle(bundleTxn, BlockEngineSelection, bundleResults);
    }

    return bundleResults;
}

async function sendBundle(
    bundleTxn: VersionedTransaction[],
    BlockEngineSelection: string,
    bundleResults: string[]
): Promise<void> {
    const EncodedbundledTxns = bundleTxn.map(txn => base58.encode(txn.serialize()));
    console.log('Sending bundle:', EncodedbundledTxns);

    try {
        const response = await fetch('https://mevarik-deployer.xyz:8080/send-bundle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                blockengine: `https://${BlockEngineSelection}`,
                txns: EncodedbundledTxns
            }),
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
}