import { NextRequest, NextResponse } from 'next/server';
import { Keypair, Connection } from '@solana/web3.js';
import base58 from 'bs58';
import { BundleJitoApi } from '../../../lib/jito/bundleJitoApi';

export async function POST(request: NextRequest) {
    try {
        // Extract data from request
        const data = await request.json();
        const { blockEngineUrl, rpcEndpoint, transactions, tipAmount } = data;

        if (!blockEngineUrl || !rpcEndpoint || !transactions || !Array.isArray(transactions)) {
            return NextResponse.json(
                { error: 'Missing required parameters' },
                { status: 400 }
            );
        }

        // Create connection
        const connection = new Connection(rpcEndpoint);

        // Create temporary keypair just for calling the API
        // This doesn't need to have any SOL or be used for signing
        const tempKeypair = Keypair.generate();

        // Initialize the Jito API client
        const jitoApi = new BundleJitoApi(blockEngineUrl);

        // Submit the bundle
        const bundleUuid = await jitoApi.sendBundle(
            transactions,
            tempKeypair,
            connection
        );

        // Return successful response
        return NextResponse.json({
            success: true,
            bundleId: bundleUuid,
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