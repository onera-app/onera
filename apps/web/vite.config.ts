import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

// Find the actual path to libsodium-sumo ESM module for the alias
let libsodiumSumoPath: string;
try {
  // require.resolve returns the 'main' file, we need to go up to package root
  const libsodiumSumoMain = require.resolve('libsodium-sumo');
  // Main is at dist/modules-sumo/libsodium-sumo.js, go up 2 levels to package root
  const packageRoot = path.resolve(path.dirname(libsodiumSumoMain), '../..');
  libsodiumSumoPath = path.resolve(packageRoot, 'dist/modules-sumo-esm/libsodium-sumo.mjs');
} catch {
  // Fallback for different node_modules structures
  libsodiumSumoPath = 'libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs';
}

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
      '@': path.resolve(__dirname, './src'),
      '@onera/crypto': path.resolve(__dirname, '../../packages/crypto/src/sodium'),
      '@onera/types': path.resolve(__dirname, '../../packages/types/src'),
      // Fix libsodium ESM import - the wrapper imports from ./libsodium-sumo.mjs
      // which needs to resolve to the actual libsodium-sumo package
      './libsodium-sumo.mjs': libsodiumSumoPath,
    },
  },
  optimizeDeps: {
    exclude: ['libsodium-wrappers-sumo'],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
  ssr: {
    noExternal: ['libsodium-wrappers-sumo'],
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
    target: 'esnext', // Support top-level await
    commonjsOptions: {
      include: [/libsodium/, /node_modules/],
    },
  },
});
