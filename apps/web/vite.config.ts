import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { createRequire } from 'module';
import fs from 'fs';

// Plugin to resolve libsodium symlink issues in Bun's node_modules structure
function libsodiumResolver(): Plugin {
  let libsodiumSumoResolved: string | null = null;

  return {
    name: 'libsodium-resolver',
    enforce: 'pre',
    buildStart() {
      // Pre-resolve the libsodium-sumo path once at build start
      try {
        const require = createRequire(import.meta.url);
        const libsodiumSumoPath = require.resolve('libsodium-sumo');
        libsodiumSumoResolved = path.resolve(path.dirname(libsodiumSumoPath), '../modules-sumo-esm/libsodium-sumo.mjs');
        // Verify the file exists
        if (!fs.existsSync(libsodiumSumoResolved)) {
          console.warn(`libsodium-sumo ESM not found at ${libsodiumSumoResolved}, falling back`);
          libsodiumSumoResolved = null;
        }
      } catch {
        console.warn('Could not pre-resolve libsodium-sumo');
      }
    },
    resolveId(id, importer) {
      // Resolve the ./libsodium-sumo.mjs import from libsodium-wrappers-sumo
      if (id === './libsodium-sumo.mjs' && importer?.includes('libsodium-wrappers-sumo') && libsodiumSumoResolved) {
        return libsodiumSumoResolved;
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [
    libsodiumResolver(),
    react(),
    nodePolyfills({
      include: ['buffer', 'process'],
      globals: {
        Buffer: true,
        process: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@onera/crypto': path.resolve(__dirname, '../../packages/crypto/src/sodium'),
      '@onera/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  optimizeDeps: {
    include: ['libsodium-wrappers-sumo'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'esnext',
    rollupOptions: {
      // Force libsodium to be bundled as external and loaded at runtime
      external: [],
    },
    commonjsOptions: {
      include: [/node_modules/],
      // Exclude libsodium ESM modules from commonjs transformation
      exclude: [/libsodium-sumo.*\.mjs$/, /libsodium-wrappers-sumo.*\.mjs$/],
      transformMixedEsModules: true,
    },
  },
});
