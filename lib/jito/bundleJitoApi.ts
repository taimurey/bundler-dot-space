import { Connection, Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { searcherClient } from 'jito-ts/dist/sdk/block-engine/searcher';
import { Bundle } from 'jito-ts/dist/sdk/block-engine/types';
import { isError } from 'jito-ts/dist/sdk/block-engine/utils';
import base58 from 'bs58';

// Define subscription type that could be either a function or an object with unsubscribe method
type Subscription = (() => void) | { unsubscribe: () => void };

export class BundleJitoApi {
    private blockEngineUrl: string;
    private client: any;

    constructor(blockEngineUrl: string) {
        this.blockEngineUrl = blockEngineUrl;
    }

    /**
     * Cancels a subscription safely regardless of its type
     */
    private cancelSubscription(subscription: Subscription): void {
        if (typeof subscription === 'function') {
            subscription();
        } else if (subscription && typeof subscription.unsubscribe === 'function') {
            subscription.unsubscribe();
        }
    }

    /**
     * Listens for bundle results from Jito block engine
     * @param keypair Keypair for authentication
     * @returns Subscription that can be used to stop listening
     */
    async onBundleResult(keypair: Keypair, onResult: (result: any) => void, onError: (error: any) => void): Promise<Subscription> {
        try {
            // Create searcher client for listening to results
            const client = searcherClient(this.blockEngineUrl, keypair);

            // Subscribe to bundle results
            return client.onBundleResult(
                (result: any) => {
                    console.log('Received bundle result:', result);
                    onResult(result);
                },
                (error: any) => {
                    console.error('Bundle result error:', error);
                    onError(error);
                }
            );
        } catch (error) {
            console.error('Error setting up bundle result listener:', error);
            throw error;
        }
    }

    /**
     * Sends a bundle of transactions to Jito block engine
     * @param transactions Array of base58-encoded serialized transactions
     * @param keypair Keypair for signing (can be a temporary keypair)
     * @param connection Solana connection
     * @returns Promise with bundle result and UUID
     */
    async sendBundle(
        transactions: string[],
        connection: Connection,
    ): Promise<{ bundleId: string, bundleResult?: any }> {
        try {
            console.log(`Sending Jito bundle to ${this.blockEngineUrl} with ${transactions.length} transactions`);

            // Create searcher client with the Jito SDK
            const cleanUrl = this.blockEngineUrl.replace(/^dns:/, '');
            const client = searcherClient(cleanUrl);
            this.client = client;

            // Get latest blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            console.log('Using blockhash:', blockhash);

            // Create a new bundle with no transaction limit
            const bundle = new Bundle([], 5);

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
            console.error('Full response object:', JSON.stringify(response, null, 2));
            if (!response.ok || !response.value) {
                throw new Error('Failed to send bundle: ' + JSON.stringify(response));
            }

            // Set up a listener for the bundle result
            let bundleResult = null;
            try {
                const resultPromise = new Promise((resolve, reject) => {
                    // Set a timeout in case we never get a result
                    const timeout = setTimeout(() => {
                        console.log('Bundle result timeout - continuing without result');
                        resolve(null);
                    }, 5000); // 5 second timeout

                    const subscription = client.onBundleResult(
                        (result: any) => {
                            console.log('Received bundle result for:', response.value);
                            clearTimeout(timeout);
                            this.cancelSubscription(subscription);
                            resolve(result);
                        },
                        (error: any) => {
                            console.error('Bundle result error:', error);
                            clearTimeout(timeout);
                            this.cancelSubscription(subscription);
                            // Don't reject, just resolve with the error to not block the flow
                            resolve({ error });
                        }
                    );
                });

                // Wait for the result or timeout
                bundleResult = await resultPromise;
            } catch (resultError) {
                console.warn('Error getting bundle result (continuing anyway):', resultError);
            }

            // Return the bundle UUID and result if available
            return {
                bundleId: response.value,
                bundleResult
            };
        } catch (error) {
            console.error('Error in BundleJitoApi.sendBundle:', error);

            // Better error handling with detailed information
            if (error instanceof Error) {
                console.error('Full error details:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
            }

            throw error;
        }
    }
} 