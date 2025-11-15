import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const port = Number(env.VITE_COURSE_CRAWLER_PORT) || 4201;
  const buildFlavor =
    mode === 'gateway'
      ? 'gateway'
      : mode === 'standalone'
        ? 'standalone'
        : mode === 'development'
          ? 'development'
          : env.VITE_BUILD_FLAVOR || 'gateway';
  const isDevServer = mode === 'development';
  const enableCompression = buildFlavor !== 'development';
  const normalizeBasePath = (value?: string) => {
    if (!value || value.trim() === '/' || value.trim() === '') {
      return '/';
    }
    const trimmed = value.trim().replace(/\/+$/, '');
    const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return `${withLeading}/`;
  };
  const normalizedBase = normalizeBasePath(
    env.VITE_COURSE_CRAWLER_BASE_PATH || env.VITE_COURSE_CRAWLER_GATEWAY_PATH
  );
  const baseForBuild = buildFlavor === 'gateway' ? normalizedBase : '/';
  const outDir = buildFlavor === 'standalone' ? 'dist-standalone' : 'dist';

  return {
    base: isDevServer ? '/' : baseForBuild,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      // Bundle analyzer
      visualizer({
        filename: path.join(`./${outDir}`, 'stats.html'),
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap',
      }),
      // Gzip compression
      viteCompression({
        verbose: true,
        disable: !enableCompression,
        threshold: 10240, // Only compress files > 10KB
        algorithm: 'gzip',
        ext: '.gz',
      }),
      // Brotli compression (better than gzip)
      viteCompression({
        verbose: true,
        disable: !enableCompression,
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
        // Course Crawler API proxy - Forward all /courses, /runs, /health to backend
        '/courses': {
          target: env.COURSE_CRAWLER_API_URL || 'http://localhost:3601',
          changeOrigin: true,
        },
        '/runs': {
          target: env.COURSE_CRAWLER_API_URL || 'http://localhost:3601',
          changeOrigin: true,
        },
        '/health': {
          target: env.COURSE_CRAWLER_API_URL || 'http://localhost:3601',
          changeOrigin: true,
        },
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
    },
    build: {
      outDir,
      sourcemap: isDevServer,
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: enableCompression,
          drop_debugger: true,
          pure_funcs: enableCompression ? ['console.log', 'console.info', 'console.debug'] : [],
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
