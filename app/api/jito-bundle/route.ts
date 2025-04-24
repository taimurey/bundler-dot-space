import { NextRequest, NextResponse } from 'next/server';
import { Keypair, Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { BundleJitoApi } from '../../../lib/jito/bundleJitoApi';
import { storeBundleResult } from '../bundle-result/[bundleId]/route';

export async function POST(request: NextRequest) {
    try {
        // Extract data from request
        const data = await request.json();
        const { blockEngineUrl, tipKeyPairBase58, rpcEndpoint, transactions, tipAmount } = data;

        if (!blockEngineUrl || !rpcEndpoint || !transactions || !Array.isArray(transactions)) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Create connection
        const connection = new Connection(rpcEndpoint);

        // Initialize the Jito API client
        // Make sure URL is in the right format - remove https:// prefix if present and remove any trailing hash
        let cleanUrl = blockEngineUrl;

        // Remove https:// prefix if present
        if (cleanUrl.startsWith('https://')) {
            cleanUrl = cleanUrl.substring(8);
        }

        // Remove any trailing slash characters
        cleanUrl = cleanUrl.split('/')[0];

        console.log('Using block engine URL:', cleanUrl);
        const jitoApi = new BundleJitoApi(cleanUrl);

        // Submit the bundle and wait for result
        const bundleResponse = await jitoApi.sendBundle(
            transactions,
            connection
        );

        // Store the bundle result in the cache if available
        if (bundleResponse.bundleResult) {
            storeBundleResult(bundleResponse.bundleId, bundleResponse.bundleResult);
        }

        // Return successful response with both bundle ID and result
        return NextResponse.json({
            success: true,
            bundleId: bundleResponse.bundleId,
            bundleResult: bundleResponse.bundleResult,
            timestamp: new Date().toISOString()
        }, { status: 200 });
    } catch (error) {
        console.error('Error in Jito bundle API:', error);

        // Return error response
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            },
            { status: 500 }
        );
    }
} 