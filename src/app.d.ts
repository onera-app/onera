// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user?: {
				id: string;
				email: string;
				name: string;
			};
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	// Global constants injected by Vite
	const APP_VERSION: string;
	const APP_BUILD_HASH: string;
}

export {};
