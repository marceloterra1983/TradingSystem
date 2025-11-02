import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { preloadHints } from './vite-plugin-preload-hints';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../');

type ProxyInfo = {
  target: string;
  basePath: string;
};

const normalizeTarget = (value: string): string => value.replace(/\/+$/, '');

const normalizePath = (value?: string): string => {
  if (!value || value === '/') {
    return '';
  }
  return value.replace(/\/+$/, '');
};

const resolveProxy = (
  rawValue: string | undefined,
  fallbackTarget: string,
  fallbackPath = '',
): ProxyInfo => {
  const fallback = {
    target: normalizeTarget(fallbackTarget),
    basePath: normalizePath(fallbackPath),
  };

  if (!rawValue) {
    return fallback;
  }

  try {
    const parsed = new URL(rawValue, `${fallback.target}/`);
    const target = normalizeTarget(
      `${parsed.protocol}//${parsed.hostname}${parsed.port ? `:${parsed.port}` : ''}`,
    );
    return {
      target,
      basePath: normalizePath(parsed.pathname),
    };
  } catch {
    return fallback;
  }
};

const createRewrite = (pattern: RegExp, basePath: string) => {
  const normalizedBase = normalizePath(basePath);
  return (incomingPath: string) => {
    const stripped = incomingPath.replace(pattern, '');
    const ensured = stripped.startsWith('/') ? stripped : `/${stripped}`;
    const remainder = ensured === '' ? '/' : ensured;

    if (!normalizedBase) {
      return remainder;
    }

    const basePrefix = normalizedBase.startsWith('/') ? normalizedBase : `/${normalizedBase}`;
    if (remainder === '/' || remainder === '') {
      return basePrefix || '/';
    }

    const composed = `${basePrefix}${remainder}`;
    const sanitized = composed.replace(/\/{2,}/g, '/');
    return sanitized.length > 1 ? sanitized.replace(/\/+$/, '') : sanitized;
  };
};

export default defineConfig(({ mode }) => {
  const rootEnv = loadEnv(mode, repoRoot, '');
  const appEnv = loadEnv(mode, __dirname, '');
  const processEnv = Object.entries(process.env).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (typeof value === 'string' && value.length > 0) {
        acc[key] = value;
      }
      return acc;
    },
    {},
  );
  const env = { ...rootEnv, ...appEnv, ...processEnv };
  if (mode === 'development') {
    console.log('[vite] TELEGRAM_GATEWAY_API_URL=', env.VITE_TELEGRAM_GATEWAY_API_URL);
    console.log('[vite] TELEGRAM_GATEWAY_API_TOKEN=', env.VITE_TELEGRAM_GATEWAY_API_TOKEN);
    console.log('[vite] API_SECRET_TOKEN=', env.API_SECRET_TOKEN);
  }
  const isProd = mode === 'production';
  const dashboardPort = Number(env.VITE_DASHBOARD_PORT) || 3103;

  const libraryProxy = resolveProxy(
    env.VITE_WORKSPACE_PROXY_TARGET || env.VITE_WORKSPACE_API_URL,
    'http://localhost:3200',
    '/api',
  );
  const tpCapitalProxy = resolveProxy(
    env.VITE_TP_CAPITAL_PROXY_TARGET || env.VITE_TP_CAPITAL_API_URL,
    'http://localhost:4005',
  );
  // Docs API (FlexSearch + CRUD) runs on 3401; 3400 is static docs (NGINX)
  const docsApiProxy = resolveProxy(
    env.VITE_DOCS_API_PROXY_TARGET || env.VITE_DOCS_API_URL,
    'http://localhost:3401',
  );
  // RAG Collections Service (Directories API) runs on 3403
  const ragCollectionsProxy = resolveProxy(
    env.VITE_RAG_COLLECTIONS_PROXY_TARGET || env.VITE_RAG_COLLECTIONS_API_URL,
    'http://localhost:3403',
  );
  const serviceLauncherProxy = resolveProxy(
    env.VITE_SERVICE_LAUNCHER_PROXY_TARGET || env.VITE_SERVICE_LAUNCHER_API_URL,
    'http://localhost:3500',
  );
  const docsProxy = resolveProxy(
    env.VITE_DOCUSAURUS_PROXY_TARGET || env.VITE_DOCUSAURUS_URL,
    'http://localhost:3400',
  );
  const firecrawlProxy = resolveProxy(
    env.VITE_FIRECRAWL_PROXY_TARGET || env.VITE_FIRECRAWL_PROXY_URL,
    'http://localhost:3600',
  );
  const telegramGatewayProxy = resolveProxy(
    env.VITE_TELEGRAM_GATEWAY_PROXY_TARGET || env.VITE_TELEGRAM_GATEWAY_API_URL,
    'http://localhost:4010',
  );
  const mcpProxy = resolveProxy(env.VITE_MCP_PROXY_TARGET, 'http://localhost:3847');

  const docsProxyConfig = {
    target: docsProxy.target,
    changeOrigin: true,
    // Always strip the "/docs" prefix and apply optional basePath
    rewrite: createRewrite(/^\/docs/, docsProxy.basePath),
  };

  return {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    plugins: [
      react(),
      visualizer({
        filename: './dist/stats.html',
        open: false,
        gzipSize: true,
        brotliSize: true,
        template: 'treemap', // or 'sunburst', 'network'
      }),
      // Preload critical chunks for faster initial load
      preloadHints({
        chunks: ['react-vendor', 'ui-radix', 'icons-vendor', 'utils-vendor'],
        modulepreload: true,
      }),
      // Gzip compression
      viteCompression({
        verbose: true,
        disable: !isProd,
        threshold: 10240, // Only compress files > 10KB
        algorithm: 'gzip',
        ext: '.gz',
      }),
      // Brotli compression (better than gzip, ~15-20% smaller)
      viteCompression({
        verbose: true,
        disable: !isProd,
        threshold: 10240,
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
    ],
    server: {
      port: dashboardPort,
      strictPort: true,
      open: false,
      host: '0.0.0.0',
      fs: {
        allow: [repoRoot],
      },
      proxy: {
        // Docusaurus asset bundles (CSS/JS/Images/Fonts)
        '^/assets/css/.*': {
          target: docsProxy.target,
          changeOrigin: true,
        },
        '^/assets/js/.*': {
          target: docsProxy.target,
          changeOrigin: true,
        },
        '^/assets/images/.*': {
          target: docsProxy.target,
          changeOrigin: true,
        },
        '^/assets/fonts/.*': {
          target: docsProxy.target,
          changeOrigin: true,
        },
        '^/img/.*': {
          target: docsProxy.target,
          changeOrigin: true,
        },
        '/mcp': {
          target: mcpProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/mcp/, mcpProxy.basePath),
        },
        '/api/library': {
          target: libraryProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/library/, libraryProxy.basePath),
        },
        '/api/workspace': {
          target: libraryProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/workspace/, libraryProxy.basePath),
        },
        '/api/tp-capital': {
          target: tpCapitalProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/tp-capital/, tpCapitalProxy.basePath),
        },
        '/api/docs': {
          target: docsApiProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/docs/, docsApiProxy.basePath),
        },
        '/api/launcher': {
          target: serviceLauncherProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/launcher/, serviceLauncherProxy.basePath),
        },
        // RAG Collections Service (port 3403) - Main collections API
        '/api/v1/rag/collections': {
          target: ragCollectionsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/v1\/rag\/collections/, ragCollectionsProxy.basePath ? `${ragCollectionsProxy.basePath}/api/v1/rag/collections` : '/api/v1/rag/collections'),
        },
        '/api/v1/rag/directories': {
          target: ragCollectionsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/v1\/rag\/directories/, ragCollectionsProxy.basePath ? `${ragCollectionsProxy.basePath}/api/v1/rag/directories` : '/api/v1/rag/directories'),
        },
        '/api/v1/rag/models': {
          target: ragCollectionsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/v1\/rag\/models/, ragCollectionsProxy.basePath ? `${ragCollectionsProxy.basePath}/api/v1/rag/models` : '/api/v1/rag/models'),
        },
        '/api/v1/rag/ingestion': {
          target: ragCollectionsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/v1\/rag\/ingestion/, ragCollectionsProxy.basePath ? `${ragCollectionsProxy.basePath}/api/v1/rag/ingestion` : '/api/v1/rag/ingestion'),
        },
        // RAG Collections Service (port 3403) - fallback for other /api/v1/rag routes
        '/api/v1/rag': {
          target: ragCollectionsProxy.target,
          changeOrigin: true,
          rewrite: (incomingPath) => {
            const stripped = incomingPath.replace(/^\/api\/v1\/rag/, '');
            const remainder = stripped.startsWith('/') ? stripped : `/${stripped}`;
            if (!ragCollectionsProxy.basePath) {
              return `/api/v1/rag${remainder}`.replace(/\/+/g, '/') || '/api/v1/rag';
            }
            const base = ragCollectionsProxy.basePath.startsWith('/')
              ? ragCollectionsProxy.basePath
              : `/${ragCollectionsProxy.basePath}`;
            return `${base}/api/v1/rag${remainder}`.replace(/\/+/g, '/') || `${base}/api/v1/rag`;
          },
        },
        '/api/firecrawl': {
          target: firecrawlProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/firecrawl/, firecrawlProxy.basePath),
        },
        '/api/telegram-gateway': {
          target: telegramGatewayProxy.target,
          changeOrigin: true,
        },
        '/api/messages': {
          target: telegramGatewayProxy.target,
          changeOrigin: true,
        },
        '/api/channels': {
          target: telegramGatewayProxy.target,
          changeOrigin: true,
        },
        '/api/telegram-photo': {
          target: 'http://localhost:4006',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/telegram-photo/, '/photo'),
        },
        '/docs': docsProxyConfig,
        '^/next/.*': docsProxyConfig,
        // Note: /specs/ files are served directly from public/specs/ by Vite
        // No proxy needed - files are static assets served from same origin
        // This avoids CORS issues in API viewers (redoc, swagger, rapidoc)
      },
    },
    define: {
      'import.meta.env.VITE_TELEGRAM_GATEWAY_API_TOKEN': JSON.stringify(
        env.VITE_TELEGRAM_GATEWAY_API_TOKEN || env.API_SECRET_TOKEN || '',
      ),
      'import.meta.env.VITE_TELEGRAM_GATEWAY_API_URL': JSON.stringify(
        env.VITE_TELEGRAM_GATEWAY_API_URL || env.VITE_API_BASE_URL || '',
      ),
      'import.meta.env.VITE_API_SECRET_TOKEN': JSON.stringify(
        env.VITE_API_SECRET_TOKEN || env.API_SECRET_TOKEN || '',
      ),
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
            // Vendor chunks - Core React (most stable)
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/') ||
                id.includes('node_modules/react/jsx-runtime')) {
              return 'react-vendor';
            }
            
            // State management (Zustand + React Query)
            if (id.includes('node_modules/zustand') || 
                id.includes('node_modules/@tanstack/react-query')) {
              return 'state-vendor';
            }
            
            // Radix UI components (large, stable)
            if (id.includes('node_modules/@radix-ui/')) {
              return 'ui-radix';
            }
            
            // Drag and Drop (DnD Kit)
            if (id.includes('node_modules/@dnd-kit/')) {
              return 'dnd-vendor';
            }
            
            // Markdown (only loaded when needed - lazy loaded)
            if (id.includes('node_modules/react-markdown') || 
                id.includes('node_modules/remark-') || 
                id.includes('node_modules/rehype-')) {
              return 'markdown-vendor';
            }
            
            // Lucide icons (large icon library)
            if (id.includes('node_modules/lucide-react')) {
              return 'icons-vendor';
            }
            
            // Utilities (Axios, Clsx, etc)
            if (id.includes('node_modules/axios') ||
                id.includes('node_modules/clsx') ||
                id.includes('node_modules/tailwind-merge')) {
              return 'utils-vendor';
            }

            // Chart libraries (Recharts ~100KB)
            if (id.includes('node_modules/recharts') ||
                id.includes('node_modules/chart.js')) {
              return 'charts-vendor';
            }

            // Animation library (Framer Motion ~80KB)
            if (id.includes('node_modules/framer-motion')) {
              return 'animation-vendor';
            }

            // Other node_modules
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
