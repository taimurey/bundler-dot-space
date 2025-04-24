import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory cache for bundle results
const bundleResultCache = new Map<string, any>();

// Function to store a bundle result in the cache
export function storeBundleResult(bundleId: string, result: any) {
    bundleResultCache.set(bundleId, result);

    // Set a timeout to clean up the cache after 10 minutes
    setTimeout(() => {
        bundleResultCache.delete(bundleId);
    }, 10 * 60 * 1000);
}

export async function GET(
    request: NextRequest,
    { params }: { params: { bundleId: string } }
) {
    try {
        const bundleId = params.bundleId;

        if (!bundleId) {
            return NextResponse.json(
                { error: 'Bundle ID is required' },
                { status: 400 }
            );
        }

        // Check if we have the bundle result in our cache
        const cachedResult = bundleResultCache.get(bundleId);

        if (cachedResult) {
            return NextResponse.json(cachedResult, { status: 200 });
        }

        // If no result is found, return a 404
        return NextResponse.json(
            { error: 'Bundle result not found' },
            { status: 404 }
        );
    } catch (error) {
        console.error('Error fetching bundle result:', error);

        return NextResponse.json(
            { error: 'Failed to fetch bundle result' },
            { status: 500 }
        );
    }
} 