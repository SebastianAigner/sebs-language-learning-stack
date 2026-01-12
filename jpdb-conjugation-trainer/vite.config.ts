import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file from project root
  const env = loadEnv(mode, '../', '');

  return {
    plugins: [
      react({
        jsxRuntime: 'automatic'
      })
    ],
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
