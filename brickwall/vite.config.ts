import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to log service name
const serviceNamePlugin = (name: string): Plugin => ({
  name: 'service-name-plugin',
  configureServer() {
    console.log(`\n  \x1b[32m\x1b[1m${name}\x1b[0m is running\n`);
  },
});

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    serviceNamePlugin('BRICKWALL')
  ],
})
