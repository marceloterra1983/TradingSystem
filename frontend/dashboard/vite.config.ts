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
  const env = loadEnv(mode, repoRoot, '');
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
  const b3Proxy = resolveProxy(
    env.VITE_B3_PROXY_TARGET || env.VITE_B3_API_URL,
    'http://localhost:3302',
  );
  const documentationProxy = resolveProxy(
    env.VITE_DOCUMENTATION_PROXY_TARGET || env.VITE_DOCUMENTATION_API_URL,
    'http://localhost:3400',
  );
  const serviceLauncherProxy = resolveProxy(
    env.VITE_SERVICE_LAUNCHER_PROXY_TARGET || env.VITE_SERVICE_LAUNCHER_API_URL,
    'http://localhost:3500',
  );
  const docsProxy = resolveProxy(
    env.VITE_DOCUSAURUS_PROXY_TARGET || env.VITE_DOCUSAURUS_URL,
    'http://localhost:3004',
  );
  const firecrawlProxy = resolveProxy(
    env.VITE_FIRECRAWL_PROXY_TARGET || env.VITE_FIRECRAWL_PROXY_URL,
    'http://localhost:3600',
  );
  const mcpProxy = resolveProxy(env.VITE_MCP_PROXY_TARGET, 'http://localhost:3847');

  const docsProxyConfig =
    docsProxy.basePath !== ''
      ? {
          target: docsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/docs/, docsProxy.basePath),
        }
      : {
          target: docsProxy.target,
          changeOrigin: true,
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
        '/api/b3': {
          target: b3Proxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/b3/, b3Proxy.basePath),
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
        '/api/firecrawl': {
          target: firecrawlProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/firecrawl/, firecrawlProxy.basePath),
        },
        '/docs': docsProxyConfig,
      },
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
