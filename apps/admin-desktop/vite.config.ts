import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/admin/',
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://45.202.0.14',
        changeOrigin: true
      }
    }
  }
});
