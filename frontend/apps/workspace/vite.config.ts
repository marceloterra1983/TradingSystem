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
      port: 3900,
      strictPort: true,
      proxy: {
        '/api/workspace': {
          target: env.VITE_WORKSPACE_API_URL || 'http://localhost:3200',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/api\/workspace/, '/api')
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
            router: ['react-router-dom'],
            query: ['@tanstack/react-query'],
            state: ['zustand'],
            dnd: ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            ui: [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-tabs',
              '@radix-ui/react-scroll-area',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-checkbox'
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
        'react-router-dom',
        '@tanstack/react-query',
        'axios',
        'zustand',
        'lucide-react'
      ]
    }
  };
});

