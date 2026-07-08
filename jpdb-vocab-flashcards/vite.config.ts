import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const serviceNamePlugin = (name: string) => ({
  name: 'service-name-plugin',
  configureServer() {
    console.log(`\n  \x1b[35m\x1b[1m${name}\x1b[0m is running\n`);
  },
});

export default defineConfig({
  plugins: [
    react({ jsxRuntime: 'automatic' }),
    serviceNamePlugin('VOCAB FLASHCARDS')
  ],
  resolve: {
    // Resolve the shared workspace package to its TS source so Vite/React
    // transpile it as part of the app (rather than pre-bundling from
    // node_modules), and dedupe React so hooks share one instance.
    alias: {
      '@sebs/audio-unlock': fileURLToPath(new URL('../audio-unlock/src/index.ts', import.meta.url))
    },
    dedupe: ['react', 'react-dom']
  },
  server: {
    host: '0.0.0.0',
    port: 5175,
    sourcemapIgnoreList: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    minify: false
  },
  css: {
    devSourcemap: true
  }
});
