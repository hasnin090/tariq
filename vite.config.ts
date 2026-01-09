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
    sourcemap: false, // ✅ تعطيل sourcemaps لتقليل الحجم في Production
    cssCodeSplit: true,
    minify: 'terser', // ✅ استخدام terser لضغط أفضل
    terserOptions: {
      compress: {
        drop_console: true, // ✅ حذف console.log في Production
        drop_debugger: true
      }
    },
    // ✅ إزالة code splitting تمامًا لتجنب مشاكل الترتيب
    rollupOptions: {
      output: {
        manualChunks: undefined, // ✅ كل شيء في ملف واحد
        inlineDynamicImports: false,
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`
      }
    },
    chunkSizeWarningLimit: 3000 // ✅ رفع الحد لتجنب التحذيرات
  },
  server: {
    port: 3000,
    host: true
  }
});
