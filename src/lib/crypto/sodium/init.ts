/**
 * Libsodium Initialization Module
 * Ensures libsodium is ready before any crypto operations
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sodium: any = null;
let sodiumReady = false;
let initPromise: Promise<typeof _sodium> | null = null;

/**
 * Initialize libsodium and return the ready instance
 */
export async function initializeSodium(): Promise<typeof _sodium> {
	if (sodiumReady && _sodium) {
		return _sodium;
	}

	if (!initPromise) {
		initPromise = (async () => {
			const sodiumModule = await import('libsodium-wrappers-sumo');
			_sodium = sodiumModule.default || sodiumModule;
			await _sodium.ready;
			sodiumReady = true;
			console.log('🔐 Libsodium (sumo) initialized');
			return _sodium;
		})();
	}

	return initPromise;
}

// Alias for compatibility
export const initSodium = initializeSodium;

/**
 * Get the sodium instance (must call initSodium first)
 */
export function getSodium(): typeof _sodium {
	if (!sodiumReady) {
		throw new Error('Libsodium not initialized. Call initSodium() first.');
	}
	return _sodium;
}

/**
 * Check if libsodium is ready
 */
export function isSodiumReady(): boolean {
	return sodiumReady;
}

export type Sodium = typeof _sodium;
