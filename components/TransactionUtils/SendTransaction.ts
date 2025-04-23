import { PublicKey } from "@solana/web3.js";
import { Connection, Keypair, Transaction, TransactionSignature } from '@solana/web3.js';

export async function SendTransaction(
    transaction: Transaction,
    connection: Connection,
    sendTransaction: any,
    publicKey: PublicKey,
    signers: Keypair[]
): Promise<TransactionSignature> {


    if (!publicKey) {
        // toast.error({ type: 'error', message: `Wallet not connected!` });
        console.log('error', `Send Transaction: Wallet not connected!`);
        return '';
    }

    let signature: TransactionSignature = '';
    try {

        transaction.recentBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;

        transaction.sign(...signers);

        signature = await sendTransaction(transaction, connection, { skipPreflight: true });

        await connection.confirmTransaction(signature, 'confirmed');
        // notify({ type: 'success', message: 'Transaction successful!', txid: signature });
    } catch (error: any) {
        console.log('error', `Transaction failed! ${error?.message}`, signature);
        throw error;
    }


    return signature;
}