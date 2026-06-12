import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { inspectAttr } from 'plugin-inspect-react-code';

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 5174,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // UI 组件库（shadcn/ui + radix）单独分包
          'ui-vendor': [
            'react',
            'react-dom',
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-slot',
          ],
          // 图标库单独分包
          icons: ['lucide-react'],
          // 路由相关
          router: ['react-router-dom'],
        },
      },
    },
    // chunk 大小警告阈值 (KB)
    chunkSizeWarningLimit: 500,
    // 启用 CSS code splitting
    cssCodeSplit: true,
  },
});
