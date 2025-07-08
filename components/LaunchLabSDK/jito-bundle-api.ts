import axios from 'axios';
import { BlockEngineLocation } from '../ui/jito-bundle-selection';

// Interface for Jito bundle options
export interface JitoBundleOptions {
    maxSimulationSlippage?: number;
    skipPreflight?: boolean;
}

// Interface for Jito bundle parameters
export interface JitoBundleParams {
    transactions: string[];
    options?: JitoBundleOptions;
    tip?: number;
}

// Interface for Jito bundle request
export interface JitoBundleRequest {
    jsonrpc: string;
    id: string;
    method: string;
    params: JitoBundleParams;
}

// Helper function to get Jito block engine URL
export function getJitoBlockEngineUrl(blockEngine: string): string {
    switch (blockEngine) {
        case BlockEngineLocation[0]:
            return 'https://bundler-jito-testnet.space/';
        case BlockEngineLocation[1]:
            return 'https://bundler-jito-mainnet.space/';
        case BlockEngineLocation[2]:
            return 'https://bundler.space/api/bundler';
        default:
            return 'https://bundler.space/api/bundler';
    }
}

// Main function to send bundle to Jito block engine
export async function sendToJitoBlockEngine(
    serializedTxs: string[],
    rpcUrl: string,
    bundleTip: string,
    blockEngine: string
): Promise<{ bundleId: string }> {
    try {
        const apiUrl = getJitoBlockEngineUrl(blockEngine);
        const tipLamports = parseFloat(bundleTip) * 1e9;

        const bundleRequest: JitoBundleRequest = {
            jsonrpc: '2.0',
            id: 'bundler-space',
            method: 'sendBundle',
            params: {
                transactions: serializedTxs,
                options: {
                    maxSimulationSlippage: 0.01,
                    skipPreflight: true,
                },
                tip: Math.floor(tipLamports),
            },
        };

        const response = await axios.post(apiUrl, bundleRequest, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        return { bundleId: response.data.result };
    } catch (error) {
        console.error('Error sending to Jito block engine:', error);
        throw error;
    }
} 