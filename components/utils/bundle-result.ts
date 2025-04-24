
export const bundleResultCache = new Map<string, any>();
export function storeBundleResult(bundleId: string, result: any) {
    bundleResultCache.set(bundleId, result);

    // Set a timeout to clean up the cache after 10 minutes
    setTimeout(() => {
        bundleResultCache.delete(bundleId);
    }, 10 * 60 * 1000);
}