import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig, type Plugin } from 'vite';
import path from 'path';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

// Plugin to fix libsodium-sumo ESM import issue
function libsodiumSumoFix(): Plugin {
	return {
		name: 'libsodium-sumo-fix',
		resolveId(source, importer) {
			if (source === './libsodium-sumo.mjs' && importer?.includes('libsodium-wrappers-sumo')) {
				return path.resolve(
					process.cwd(),
					'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs'
				);
			}
			return null;
		}
	};
}

export default defineConfig({
	plugins: [
		nodePolyfills({
			include: ['buffer'],
			globals: {
				Buffer: true
			}
		}),
		libsodiumSumoFix(),
		sveltekit()
	],
	define: {
		APP_VERSION: JSON.stringify(process.env.npm_package_version || '0.1.0'),
		APP_BUILD_HASH: JSON.stringify(process.env.APP_BUILD_HASH || 'dev-build')
	},
	build: {
		sourcemap: true
	},
	optimizeDeps: {
		exclude: ['libsodium-wrappers-sumo'],
		esbuildOptions: {
			target: 'esnext'
		}
	}
});
