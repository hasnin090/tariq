import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: true
  },
  css: {
    postcss: './postcss.config.cjs'
  },
  server: {
    port: 3000,
    host: true
  }
});
