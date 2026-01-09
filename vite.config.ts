import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.cjs'
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react', 'recharts'],
    force: false
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // كل مكتبات node_modules تُجمع معًا لضمان الترتيب الصحيح
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
          // صفحات المبيعات
          if (id.includes('/components/pages/sales/')) {
            return 'pages-sales';
          }
          // صفحات المحاسبة
          if (id.includes('/components/pages/accounting/')) {
            return 'pages-accounting';
          }
        },
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    }
  },
  server: {
    port: 3000,
    host: true
  }
});
