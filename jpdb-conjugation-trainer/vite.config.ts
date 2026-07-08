import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

// Custom plugin to log service name
const serviceNamePlugin = (name: string) => ({
  name: 'service-name-plugin',
  configureServer() {
    console.log(`\n  \x1b[35m\x1b[1m${name}\x1b[0m is running\n`);
  },
});

export default defineConfig(({ mode }) => {
  // Load env file from project root
  const env = loadEnv(mode, '../', '');

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic'
      }),
      serviceNamePlugin('CONJUGATION TRAINER')
    ],
    resolve: {
      // Resolve the shared workspace package to its TS source so Vite/React
      // transpile it as part of the app, and dedupe React so hooks share one
      // instance.
      alias: {
        '@sebs/audio-unlock': fileURLToPath(new URL('../audio-unlock/src/index.ts', import.meta.url))
      },
      dedupe: ['react', 'react-dom']
    },
    server: {
      port: 5174,
      sourcemapIgnoreList: false
    },
    define: {
      'process.env.OPENROUTER_API_KEY': JSON.stringify(env.OPENROUTER_API_KEY)
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      minify: false
    },
    css: {
      devSourcemap: true
    }
  };
});
