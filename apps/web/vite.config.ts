import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Manually resolve the ESM version of libsodium-sumo
// require.resolve('libsodium-sumo') gives the CJS version (dist/modules-sumo/libsodium-sumo.js)
// We navigate relative to that to find the ESM version (dist/modules-sumo-esm/libsodium-sumo.mjs)
const libsodiumSumoMain = require.resolve('libsodium-sumo');
const libsodiumSumoPath = path.join(
  path.dirname(libsodiumSumoMain),
  '../modules-sumo-esm/libsodium-sumo.mjs'
);

export default defineConfig({
  plugins: [
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
      // Fix for libsodium-wrappers-sumo relative import in Bun
      './libsodium-sumo.mjs': libsodiumSumoPath,
      '@': path.resolve(__dirname, './src'),
      // Map @onera/crypto subpaths to their source locations
      '@onera/crypto/webauthn': path.resolve(__dirname, '../../packages/crypto/src/webauthn'),
      '@onera/crypto/sharding': path.resolve(__dirname, '../../packages/crypto/src/sharding'),
      '@onera/crypto/session': path.resolve(__dirname, '../../packages/crypto/src/session'),
      '@onera/crypto/password': path.resolve(__dirname, '../../packages/crypto/src/password'),
      '@onera/crypto/noise': path.resolve(__dirname, '../../packages/crypto/src/noise'),
      '@onera/crypto/attestation': path.resolve(__dirname, '../../packages/crypto/src/attestation'),
      '@onera/crypto': path.resolve(__dirname, '../../packages/crypto/src/sodium'),
      '@onera/types': path.resolve(__dirname, '../../packages/types/src'),
    },
  },
  optimizeDeps: {
    exclude: ['libsodium-wrappers-sumo', 'libsodium-sumo'],
    esbuildOptions: {
      target: 'esnext',
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
