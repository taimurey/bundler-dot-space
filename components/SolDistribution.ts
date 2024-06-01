import { Connection, Keypair, SystemProgram, Transaction, PublicKey } from '@solana/web3.js';
import { tipAccounts } from './PumpBundler/constants';

export async function solDistribution(
    connection: Connection,
    fundingWallet: Keypair,
    wallets: Keypair[],
    randAmount: number[],
    bundleTip: number,
): Promise<Transaction[]> {
    // Divide the wallets into 21 chunks
    const walletChunks = [];
    for (let i = 0; i < wallets.length; i += 21) {
        walletChunks.push(wallets.slice(i, i + 21));
    }

    const bundleTxns = [];
    const recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

    for (let index = 0; index < walletChunks.length; index++) {
        const walletChunk = walletChunks[index];
        const currentInstructions = [];

        for (let i = 0; i < walletChunk.length; i++) {
            const wallet = walletChunk[i];
            const transferInstruction = SystemProgram.transfer({
                fromPubkey: fundingWallet.publicKey,
                toPubkey: wallet.publicKey,
                lamports: randAmount[index],
            });

            currentInstructions.push(transferInstruction);

            if (index === walletChunks.length - 1 && i === walletChunk.length - 1) {
                console.log("Adding tip to last transaction");
                const tip = SystemProgram.transfer({
                    fromPubkey: fundingWallet.publicKey,
                    toPubkey: new PublicKey(tipAccounts[0]),
                    lamports: bundleTip,
                });
                currentInstructions.push(tip);
            }
        }

        const transaction = new Transaction({ recentBlockhash });
        transaction.add(...currentInstructions);
        transaction.sign(fundingWallet);

        bundleTxns.push(transaction);
    }

    let sum = 0;
    const txnSize = bundleTxns.map(txn => {
        const serializedTxn = txn.serialize();
        sum += serializedTxn.length;
        return serializedTxn.length;
    });

    console.log('Transaction sizes:', txnSize);
    console.log('Total size:', sum);

    // Send transactions
    return bundleTxns;
}