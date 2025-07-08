import axios from 'axios';

// Enum for bundler providers matching the Rust enum
export enum BundlerProvider {
    Jito = "jito",
    ZeroSlot = "0slot"
}

// Interface for the bundle data payload
export interface BundleData {
    txns: string[];
    blockengine: string;
    creator: string;
    provider: BundlerProvider;
}

// Type for bundle result
export type BundleResult = string;

// Helper function to convert block engine string to BundlerProvider
export function getBundlerProvider(blockEngine: string): BundlerProvider {
    const engine = blockEngine.toLowerCase();
    if (engine.includes('jito')) {
        return BundlerProvider.Jito;
    } else if (engine.includes('0slot') || engine.includes('zeroslot') || engine.includes('zero-slot')) {
        return BundlerProvider.ZeroSlot;
    }
    // Default to Jito if unknown
    return BundlerProvider.Jito;
}

// Main function to send bundle to Puff.space API
export async function sendBundleToPuff(
    serializedTxs: string[],
    blockEngine: string,
    creator: string,
    provider?: BundlerProvider
): Promise<{ bundleId: string }> {
    try {
        const apiUrl = 'https://api.puff.space/send-bundle';

        const bundleData: BundleData = {
            txns: serializedTxs,
            blockengine: blockEngine,
            creator: creator,
            provider: provider || getBundlerProvider(blockEngine)
        };

        const response = await axios.post(apiUrl, bundleData, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Assuming the API returns the bundle ID in the response
        return { bundleId: response.data };
    } catch (error) {
        console.error('Error sending bundle to Puff.space:', error);
        throw error;
    }
} 