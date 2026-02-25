/**
 * Libsodium Initialization Module
 * Ensures libsodium is ready before any crypto operations
 *
 * Note: libsodium-wrappers-sumo@0.7.16 has a broken ESM entry point
 * (imports a sibling .mjs file not included in the published package).
 * On Node.js we use createRequire to force CJS resolution which works.
 * In browsers/bun the dynamic import() resolves correctly.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _sodium: any = null;
let sodiumReady = false;
let initPromise: Promise<typeof _sodium> | null = null;

/**
 * Load the libsodium module, using CJS require on Node.js to avoid
 * the broken ESM entry point.
 */
async function loadSodiumModule() {
	// Node.js: use createRequire for CJS resolution
	if (typeof globalThis.process !== 'undefined' && globalThis.process.versions?.node) {
		const { createRequire } = await import('module');
		const require = createRequire(import.meta.url);
		return require('libsodium-wrappers-sumo');
	}
	// Browser / Bun: dynamic import works fine
	const mod = await import('libsodium-wrappers-sumo');
	return mod.default || mod;
}

/**
 * Initialize libsodium and return the ready instance
 */
export async function initializeSodium(): Promise<typeof _sodium> {
	if (sodiumReady && _sodium) {
		return _sodium;
	}

	if (!initPromise) {
		initPromise = (async () => {
			_sodium = await loadSodiumModule();
			await _sodium.ready;
			sodiumReady = true;
			console.log('Libsodium (sumo) initialized');
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
