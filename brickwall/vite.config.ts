import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Custom plugin to log service name
const serviceNamePlugin = (name: string) => ({
  name: 'service-name-plugin',
  configureServer(server: any) {
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
