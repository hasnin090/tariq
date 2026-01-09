import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.cjs'
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // مكتبات React الأساسية
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
            return 'vendor-react';
          }
          // مكتبات Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          // مكتبات الرسوم البيانية
          if (id.includes('node_modules/recharts/') || id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          // مكتبات PDF
          if (id.includes('node_modules/jspdf/')) {
            return 'vendor-pdf';
          }
          // مكتبات الأيقونات
          if (id.includes('node_modules/lucide-react/')) {
            return 'vendor-icons';
          }
          // مكتبات الرسوم المتحركة
          if (id.includes('node_modules/framer-motion/') || id.includes('node_modules/gsap/')) {
            return 'vendor-animations';
          }
          // صفحات المبيعات
          if (id.includes('/components/pages/sales/')) {
            return 'pages-sales';
          }
          // صفحات المحاسبة
          if (id.includes('/components/pages/accounting/')) {
            return 'pages-accounting';
          }
          // الخدمات
          if (id.includes('/src/services/') || id.includes('/utils/')) {
            return 'services';
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
