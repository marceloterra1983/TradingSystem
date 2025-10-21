import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isDev = mode === 'development';

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 3800,
      strictPort: true,
      proxy: {
        '/api/webscraper': {
          target: env.VITE_WEBSCRAPER_API_URL || 'http://localhost:3700',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/webscraper/, '/api/v1')
        },
        '/api/firecrawl': {
          target: env.VITE_WEBSCRAPER_FIRECRAWL_URL || 'http://localhost:3600',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/firecrawl/, '/api/v1')
        }
      }
    },
    build: {
      sourcemap: isDev,
      chunkSizeWarningLimit: 500,
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom'],
            query: ['@tanstack/react-query'],
            state: ['zustand'],
            ui: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-tabs',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-collapsible'
            ],
            utils: ['axios', 'clsx', 'tailwind-merge', 'framer-motion']
          }
        }
      }
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@tanstack/react-query',
        'axios',
        'zustand',
        'lucide-react',
        'react-router-dom'
      ]
    }
  };
});
