import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

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
  server: {
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
