import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  },
  define: {
    // Polyfill global for amazon-cognito-identity-js in browser
    global: 'window',
  }
});
