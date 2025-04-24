import { bundleResultCache } from '@/components/utils/bundle-result';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ bundleId: string }> }
) {
    try {
        const { bundleId } = await params;

        if (!bundleId) {
            return NextResponse.json(
                { error: 'Bundle ID is required' },
                { status: 400 }
            );
        }

        const cachedResult = bundleResultCache.get(bundleId);

        if (cachedResult) {
            return NextResponse.json(cachedResult, { status: 200 });
        }

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
