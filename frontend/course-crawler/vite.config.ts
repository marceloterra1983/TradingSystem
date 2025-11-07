import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const port = Number(env.VITE_COURSE_CRAWLER_PORT) || 4201;

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      // Bundle analyzer
      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      // Gzip compression
      viteCompression({
        verbose: true,
        disable: !isProd,
        threshold: 10240, // Only compress files > 10KB
        algorithm: 'gzip',
        ext: '.gz',
      }),
      // Brotli compression (better than gzip)
      viteCompression({
        verbose: true,
        disable: !isProd,
        threshold: 10240,
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
    ],
    server: {
      port,
      strictPort: true,
      open: false,
      host: '0.0.0.0',
      proxy: {
        // Course Crawler API proxy (when backend is implemented)
        '/api/course-crawler': {
          target: env.COURSE_CRAWLER_API_URL || 'http://localhost:3600',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/course-crawler/, '/api'),
        },
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
    },
    build: {
      outDir: 'dist',
      sourcemap: !isProd,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: isProd,
          drop_debugger: true,
          pure_funcs: isProd ? ['console.log', 'console.info', 'console.debug'] : [],
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            // React core (including Router, DnD Kit, Radix UI) - MUST be together
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router') ||
                id.includes('node_modules/@remix-run') ||
                id.includes('node_modules/@dnd-kit') ||
                id.includes('node_modules/@radix-ui')) {
              return 'react-vendor';
            }

            // Markdown rendering
            if (id.includes('node_modules/react-markdown') ||
                id.includes('node_modules/remark') ||
                id.includes('node_modules/rehype') ||
                id.includes('node_modules/unist') ||
                id.includes('node_modules/micromark') ||
                id.includes('node_modules/mdast')) {
              return 'markdown-vendor';
            }

            // Icons
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }

            // Utilities
            if (id.includes('node_modules/axios') ||
                id.includes('node_modules/date-fns') ||
                id.includes('node_modules/clsx') ||
                id.includes('node_modules/tailwind-merge')) {
              return 'utils-vendor';
            }

            // All other node_modules
            if (id.includes('node_modules/')) {
              return 'vendor';
            }
          },
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
        },
      },
      chunkSizeWarningLimit: 500,
      reportCompressedSize: true,
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'zustand',
        '@tanstack/react-query',
        'axios',
        'lucide-react',
      ],
    },
  };
});
