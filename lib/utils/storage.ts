/**
 * Set a value in local storage
 */
export async function setStorageValue(key: string, value: any): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error('Error setting local storage value:', error);
    }
}

/**
 * Get a value from local storage
 */
export async function getStorageValue<T>(key: string): Promise<T | null> {
    if (typeof window === 'undefined') return null;

    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) as T : null;
    } catch (error) {
        console.error('Error getting local storage value:', error);
        return null;
    }
}

/**
 * Remove a value from local storage
 */
export async function removeStorageValue(key: string): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Error removing local storage value:', error);
    }
} 