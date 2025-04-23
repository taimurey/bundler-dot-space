import { NextRequest, NextResponse } from 'next/server';
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import base58 from "bs58";
import { PumpBundler } from "@/components/instructions/pump-bundler/PumpBundler";

// Define types to match the client-side
interface TokenMetadata {
    name: string;
    symbol: string;
    description: string;
    image: string;
    show_name: boolean;
    createdOn: string;
    website?: string;
    twitter?: string;
    telegram?: string;
}

export async function POST(request: NextRequest) {
    try {
        const data = await request.json();

        // Extract all required data
        const { formData, tokenKeypairSecret, tokenMetadata, rpcEndpoint } = data;

        // Log the use of direct Jito bundling
        console.log('Processing PumpBundler request with Jito SDK direct bundling');

        // Create connection using the provided endpoint
        const connection = new Connection(rpcEndpoint);

        // Convert tokenKeypair from string to Keypair
        const tokenKeypair = Keypair.fromSecretKey(new Uint8Array(base58.decode(tokenKeypairSecret)));

        // Handle LUT case 
        if (formData.Mode === 20 && formData.lutAddress) {
            // Make a copy of formData with the lutAddress field
            const formDataWithLut = {
                ...formData,
                lutAddress: formData.lutAddress
            };

            // Call the PumpBundler function with LUT
            const bundlerResult = await PumpBundler(
                connection,
                formDataWithLut,
                tokenKeypair,
                tokenMetadata
            );

            return NextResponse.json({
                bundleUuid: bundlerResult,
                usedJitoSdk: true,
                timestamp: new Date().toISOString()
            }, { status: 200 });
        } else {
            // Regular call without LUT
            const bundlerResult = await PumpBundler(
                connection,
                formData,
                tokenKeypair,
                tokenMetadata
            );

            // Return successful response with Jito SDK info
            return NextResponse.json({
                bundleUuid: bundlerResult,
                usedJitoSdk: true,
                timestamp: new Date().toISOString()
            }, { status: 200 });
        }
    } catch (error) {
        console.error('Error in pump-bundler API with Jito SDK bundling:', error);

        // Return error response
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Unknown error occurred',
                jitoDirectBundling: true
            },
            { status: 500 }
        );
    }
} 