import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { isError } from 'jito-ts/dist/sdk/block-engine/utils';
import base58 from 'bs58';

export class BundleJitoApi {
    private blockEngineUrl: string;

    constructor(blockEngineUrl: string) {
        this.blockEngineUrl = blockEngineUrl;
    }

    /**
     * Sends a bundle of transactions to Jito block engine
     * @param transactions Array of base58-encoded serialized transactions
     * @param keypair Keypair for signing (can be a temporary keypair)
     * @param connection Solana connection
     * @returns Bundle UUID
     */
    async sendBundle(
        transactions: string[],
        keypair: Keypair,
        connection: Connection,
    ): Promise<string> {
        try {
            console.log(`Sending Jito bundle to ${this.blockEngineUrl} with ${transactions.length} transactions`);

            // Create searcher client with the Jito SDK
            const client = searcherClient(this.blockEngineUrl);

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            console.log('Using blockhash:', blockhash);

            // Create a new bundle with no transaction limit
            const bundle = new Bundle([], 0);

            // Convert base58 encoded transactions to VersionedTransaction objects
            const decodedTransactions = transactions.map(txBase58 => {
                const txBytes = base58.decode(txBase58);
                return VersionedTransaction.deserialize(txBytes);
            });

            // Add all transactions to the bundle
            let bundleWithTxs = bundle;
            for (const tx of decodedTransactions) {
                const result = bundleWithTxs.addTransactions(tx);
                if (isError(result)) {
                    throw new Error(`Failed to add transaction to bundle: ${result.message}`);
                }
                bundleWithTxs = result;
            }

            // Send the bundle
            const response = await client.sendBundle(bundleWithTxs);
            if (!response.ok || !response.value) {
                throw new Error('Failed to send bundle: ' + (response || 'Unknown error'));
            }

            // Return the bundle UUID
            return response.value;
        } catch (error) {
            console.error('Error in BundleJitoApi.sendBundle:', error);
            throw error;
        }
    }
} 