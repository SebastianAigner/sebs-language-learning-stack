import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'automatic'
    })
  ],
  server: {
    port: 5174,
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
