import {
    Connection,
    Keypair,
} from '@solana/web3.js';
import base58 from 'bs58';

/**
 * Client-side wrapper that calls the server API to send Jito bundles
 * @param blockEngineUrl The URL of the Jito block engine
 * @param tipKeypair The keypair used for tipping
 * @param connection The Solana connection
 * @param transactions Array of base58-encoded versioned transactions
 * @param tipAmount The amount to tip in lamports
 * @returns Bundle UUID if successful, error otherwise
 */
export async function sendJitoBundleClient(
    blockEngineUrl: string,
    tipKeypair: Keypair,
    connection: Connection,
    transactions: string[],
    tipAmount: number = 10_000_000 // Default 0.01 SOL
): Promise<string> {
    try {
        // Convert keypair to base58 for transmission
        const tipKeyPairBase58 = base58.encode(tipKeypair.secretKey);

        // Get the current window.location.origin for the absolute URL
        const origin = typeof window !== 'undefined' ? window.location.origin : '';

        // Make a request to the server-side API with absolute URL
        const response = await fetch(`${origin}/api/jito-bundle`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                blockEngineUrl,
                tipKeyPairBase58,
                rpcEndpoint: connection.rpcEndpoint,
                transactions,
                tipAmount
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to send Jito bundle');
        }

        // Return the bundle ID from the server response
        return data.bundleId;
    } catch (error) {
        console.error('Error in sendJitoBundleClient:', error);
        throw error;
    }
} 