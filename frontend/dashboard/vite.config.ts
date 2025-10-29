import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
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
  // DocsAPI (dynamic) runs on 3401 by default; 3400 is static docs (NGINX)
  const documentationProxy = resolveProxy(
    env.VITE_DOCUMENTATION_PROXY_TARGET || env.VITE_DOCUMENTATION_API_URL,
    'http://localhost:3401',
  );
  const serviceLauncherProxy = resolveProxy(
    env.VITE_SERVICE_LAUNCHER_PROXY_TARGET || env.VITE_SERVICE_LAUNCHER_API_URL,
    'http://localhost:3500',
  );
  const docsProxy = resolveProxy(
    env.VITE_DOCUSAURUS_PROXY_TARGET || env.VITE_DOCUSAURUS_URL,
    'http://localhost:3205',
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
    plugins: [react()],
    server: {
      port: dashboardPort,
      strictPort: true,
      open: false,
      host: '0.0.0.0',
      fs: {
        allow: [repoRoot],
      },
      proxy: {
        // Docusaurus assets proxy (specific paths only - avoid dashboard assets)
        '^/assets/images/.*': {
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
        '/api/tp-capital': {
          target: tpCapitalProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/tp-capital/, tpCapitalProxy.basePath),
        },
        '/api/docs': {
          target: documentationProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/docs/, documentationProxy.basePath),
        },
        '/api/launcher': {
          target: serviceLauncherProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/launcher/, serviceLauncherProxy.basePath),
        },
        '/api/v1/rag': {
          target: documentationProxy.target,
          changeOrigin: true,
          rewrite: (incomingPath) => {
            const stripped = incomingPath.replace(/^\/api\/v1\/rag/, '');
            const remainder = stripped.startsWith('/') ? stripped : `/${stripped}`;
            if (!documentationProxy.basePath) {
              return `/api/v1/rag${remainder}`.replace(/\/+/g, '/') || '/api/v1/rag';
            }
            const base = documentationProxy.basePath.startsWith('/')
              ? documentationProxy.basePath
              : `/${documentationProxy.basePath}`;
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
        // Proxy OpenAPI specs to Docs server to avoid CORS in viewers
        '^/specs/.*': {
          target: docsProxy.target,
          changeOrigin: true,
        },
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
          manualChunks: {
            'react-vendor': ['react', 'react-dom', 'react/jsx-runtime'],
            'state-vendor': ['zustand', '@tanstack/react-query'],
            'ui-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-collapsible',
              '@radix-ui/react-scroll-area',
            ],
            'dnd-vendor': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
            'markdown-vendor': ['react-markdown', 'remark-gfm', 'rehype-raw'],
            'utils-vendor': ['axios', 'clsx', 'tailwind-merge'],
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
