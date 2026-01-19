import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import fs from 'fs';

// Plugin to resolve libsodium symlink issues in Bun's node_modules structure
function libsodiumResolver(): Plugin {
  return {
    name: 'libsodium-resolver',
    enforce: 'pre',
    resolveId(id, importer) {
      // Resolve the ./libsodium-sumo.mjs import from libsodium-wrappers-sumo
      if (id === './libsodium-sumo.mjs' && importer?.includes('libsodium-wrappers-sumo')) {
        // Handle Bun's .bun node_modules structure
        // Importer: .../node_modules/.bun/libsodium-wrappers-sumo@X.X.X/node_modules/libsodium-wrappers-sumo/dist/modules-sumo-esm/libsodium-wrappers.mjs
        // Target:   .../node_modules/.bun/libsodium-sumo@X.X.X/node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs
        const bunMatch = importer.match(/(.*)\/node_modules\/\.bun\/libsodium-wrappers-sumo@[\d.]+\//);
        if (bunMatch) {
          const nodeModulesBase = bunMatch[1];
          // Find libsodium-sumo in the .bun directory
          const bunDir = path.join(nodeModulesBase, 'node_modules', '.bun');
          try {
            const entries = fs.readdirSync(bunDir);
            const libsodiumSumoDir = entries.find((e) => e.startsWith('libsodium-sumo@'));
            if (libsodiumSumoDir) {
              const resolved = path.join(
                bunDir,
                libsodiumSumoDir,
                'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs'
              );
              if (fs.existsSync(resolved)) {
                return resolved;
              }
            }
          } catch {
            // Fall through to default resolution
          }
        }

        // Handle standard node_modules structure (non-Bun)
        const standardMatch = importer.match(/(.*)\/node_modules\/libsodium-wrappers-sumo\//);
        if (standardMatch) {
          const resolved = path.join(
            standardMatch[1],
            'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs'
          );
          if (fs.existsSync(resolved)) {
            return resolved;
          }
        }
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
      // Map @onera/crypto subpaths to their source locations
      '@onera/crypto/webauthn': path.resolve(__dirname, '../../packages/crypto/src/webauthn'),
      '@onera/crypto/sharding': path.resolve(__dirname, '../../packages/crypto/src/sharding'),
      '@onera/crypto/session': path.resolve(__dirname, '../../packages/crypto/src/session'),
      '@onera/crypto/password': path.resolve(__dirname, '../../packages/crypto/src/password'),
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
