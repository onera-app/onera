import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';

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
      '@cortex/crypto': path.resolve(__dirname, '../../packages/crypto/src/sodium'),
      '@cortex/types': path.resolve(__dirname, '../../packages/types/src'),
      'convex/_generated': path.resolve(__dirname, '../../convex/_generated'),
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
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    commonjsOptions: {
      include: [/libsodium/, /node_modules/],
    },
  },
});
