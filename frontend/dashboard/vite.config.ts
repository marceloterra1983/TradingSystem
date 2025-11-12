import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import viteCompression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
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
    console.log('[vite] VITE_GATEWAY_TOKEN=', env.VITE_GATEWAY_TOKEN);
    console.log('[vite] TELEGRAM_GATEWAY_API_URL=', env.VITE_TELEGRAM_GATEWAY_API_URL);
    console.log('[vite] TELEGRAM_GATEWAY_API_TOKEN=', env.VITE_TELEGRAM_GATEWAY_API_TOKEN);
    console.log('[vite] API_SECRET_TOKEN=', env.VITE_API_SECRET_TOKEN);
  }
  const isProd = mode === 'production';
  const dashboardPort = Number(env.VITE_DASHBOARD_PORT) || 9080;

  const gatewayProxy = resolveProxy(
    env.GATEWAY_HTTP_URL || env.VITE_GATEWAY_HTTP_URL,
    'http://localhost:9080',
  );
  const workspaceProxy = resolveProxy(
    env.WORKSPACE_PROXY_TARGET || env.VITE_WORKSPACE_PROXY_TARGET || env.VITE_WORKSPACE_API_URL,
    gatewayProxy.target || 'http://localhost:9080',
    '/api/workspace',
  );
  const libraryProxy = resolveProxy(
    env.WORKSPACE_LIBRARY_PROXY_TARGET ||
      env.VITE_WORKSPACE_LIBRARY_PROXY_TARGET ||
      env.VITE_WORKSPACE_LIBRARY_API_URL,
    workspaceProxy.target,
    '/api/library',
  );
  const tpCapitalProxy = resolveProxy(
    env.TP_CAPITAL_PROXY_TARGET || env.VITE_TP_CAPITAL_PROXY_TARGET || env.VITE_TP_CAPITAL_API_URL,
    'http://localhost:4008',
  );
  // Docs API (FlexSearch + CRUD) runs on 3405; 3400 serves Docusaurus dev/NGINX
  const docsApiProxy = resolveProxy(
    env.DOCS_API_PROXY_TARGET || env.VITE_DOCS_API_PROXY_TARGET || env.VITE_DOCS_API_URL,
    gatewayProxy.target,
    '/api/docs',
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
    env.DOCUSAURUS_PROXY_TARGET || env.VITE_DOCUSAURUS_PROXY_TARGET || env.VITE_DOCUSAURUS_URL,
    gatewayProxy.target,
    '/docs',
  );
  const dbUiPgAdminProxy = resolveProxy(
    env.DB_UI_PGADMIN_PROXY_TARGET || env.VITE_DB_UI_PGADMIN_PROXY_TARGET,
    'http://localhost:9080',
    '/db-ui/pgadmin',
  );
  const dbUiPgWebProxy = resolveProxy(
    env.DB_UI_PGWEB_PROXY_TARGET || env.VITE_DB_UI_PGWEB_PROXY_TARGET,
    'http://localhost:9080',
    '/db-ui/pgweb',
  );
  const dbUiAdminerProxy = resolveProxy(
    env.DB_UI_ADMINER_PROXY_TARGET || env.VITE_DB_UI_ADMINER_PROXY_TARGET,
    'http://localhost:9080',
    '/db-ui/adminer',
  );
  const dbUiQuestDbProxy = resolveProxy(
    env.DB_UI_QUESTDB_PROXY_TARGET || env.VITE_DB_UI_QUESTDB_PROXY_TARGET,
    'http://localhost:9080',
    '/db-ui/questdb',
  );
  const firecrawlProxy = resolveProxy(
    env.VITE_FIRECRAWL_PROXY_TARGET || env.VITE_FIRECRAWL_PROXY_URL,
    'http://localhost:9080/api/firecrawl',
  );
  const telegramGatewayProxy = resolveProxy(
    env.VITE_TELEGRAM_GATEWAY_PROXY_TARGET || env.VITE_TELEGRAM_GATEWAY_API_URL,
    'http://localhost:14010',
    '/api/telegram-gateway',
  );
  const mcpProxy = resolveProxy(env.VITE_MCP_PROXY_TARGET, 'http://localhost:3847');
  const n8nProxy = resolveProxy(
    env.N8N_PROXY_TARGET || env.VITE_N8N_PROXY_TARGET || env.VITE_N8N_URL,
    'http://localhost:3680',
  );
  const n8nBasePath = (() => {
    const configured = normalizePath(env.N8N_PATH || '/n8n');
    if (!configured || configured === '/') {
      return '/n8n';
    }
    return configured.startsWith('/') ? configured : `/${configured}`;
  })();

  const docsProxyConfig = {
    target: docsProxy.target,
    changeOrigin: true,
    // Always strip the "/docs" prefix and apply optional basePath
    rewrite: createRewrite(/^\/docs/, docsProxy.basePath),
  };

  const resolveHeaderValue = (value: string | string[] | undefined): string =>
    Array.isArray(value) ? value[0] ?? '' : value ?? '';

  const n8nBasicAuthHeader = (() => {
    const n8nUser =
      env.N8N_BASIC_AUTH_USER || env.VITE_N8N_BASIC_AUTH_USER || 'automation';
    const n8nPass =
      env.N8N_BASIC_AUTH_PASSWORD || env.VITE_N8N_BASIC_AUTH_PASSWORD || 'changeme';
    if (!n8nUser || !n8nPass) {
      return null;
    }
    return `Basic ${Buffer.from(`${n8nUser}:${n8nPass}`).toString('base64')}`;
  })();

  const attachN8nBasicAuth = (proxy: any) => {
    if (!n8nBasicAuthHeader) {
      return;
    }
    proxy.on('proxyReq', (proxyReq: any) => {
      proxyReq.setHeader('Authorization', n8nBasicAuthHeader);
    });
  };

  const stripFrameBlockingHeaders = (proxy: any) => {
    proxy.on('proxyRes', (proxyRes: any) => {
      delete proxyRes.headers['x-frame-options'];
      const cspHeader = resolveHeaderValue(proxyRes.headers['content-security-policy']);
      if (!cspHeader) {
        return;
      }
      const sanitized = cspHeader
        .split(';')
        .map((directive) => directive.trim())
        .filter((directive) => directive.length > 0 && !/frame-ancestors/i.test(directive))
        .join('; ');
      if (sanitized) {
        proxyRes.headers['content-security-policy'] = sanitized;
      } else {
        delete proxyRes.headers['content-security-policy'];
      }
    });
  };

  const preserveProxyLocation = (proxy: any, mountPath: string) => {
    const normalizedMount =
      !mountPath || mountPath === '/'
        ? ''
        : mountPath.endsWith('/')
          ? mountPath.slice(0, -1)
          : mountPath;

    proxy.on('proxyRes', (proxyRes: any) => {
      const location = proxyRes.headers['location'];
      if (!location || Array.isArray(location)) {
        return;
      }
      if (/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//.test(location)) {
        return;
      }
      const ensured = location.startsWith('/') ? location : `/${location}`;
      proxyRes.headers['location'] =
        normalizedMount ? `${normalizedMount}${ensured}`.replace(/\/{2,}/g, '/') : ensured;
    });
  };

  const n8nAssetsRewriteTarget = n8nProxy.basePath
    ? `${n8nProxy.basePath}/assets`
    : '/assets';
  const n8nStaticRewriteTarget = n8nProxy.basePath
    ? `${n8nProxy.basePath}/static`
    : '/static';
  const n8nFaviconRewriteTarget = n8nProxy.basePath
    ? `${n8nProxy.basePath}/favicon.ico`
    : '/favicon.ico';

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
      // PWA with Service Worker (Phase 2.3 - Browser Caching)
      // MINIMAL CONFIG FOR TESTING
      VitePWA(),
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
        // Docusaurus asset bundles (CSS/JS/Images/Fonts) - MUST come FIRST (more specific)
        '^/assets/css/.*': {
          target: docsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(
            /^\/assets\/css/,
            docsProxy.basePath ? `${docsProxy.basePath}/assets/css` : '/assets/css',
          ),
        },
        '^/assets/js/.*': {
          target: docsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(
            /^\/assets\/js/,
            docsProxy.basePath ? `${docsProxy.basePath}/assets/js` : '/assets/js',
          ),
        },
        '^/assets/images/.*': {
          target: docsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(
            /^\/assets\/images/,
            docsProxy.basePath ? `${docsProxy.basePath}/assets/images` : '/assets/images',
          ),
        },
        '^/assets/fonts/.*': {
          target: docsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(
            /^\/assets\/fonts/,
            docsProxy.basePath ? `${docsProxy.basePath}/assets/fonts` : '/assets/fonts',
          ),
        },
        '^/img/.*': {
          target: docsProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(
            /^\/img/,
            docsProxy.basePath ? `${docsProxy.basePath}/img` : '/img',
          ),
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
          target: workspaceProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/workspace/, workspaceProxy.basePath),
        },
        '/api/tp-capital': {
          target: tpCapitalProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/api\/tp-capital/, tpCapitalProxy.basePath),
          configure: (proxy, _options) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              // Forward X-API-Key header if present
              if (req.headers['x-api-key']) {
                proxyReq.setHeader('X-API-Key', req.headers['x-api-key'] as string);
              }
            });
          },
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
          target: telegramGatewayProxy.target,
          changeOrigin: true,
          rewrite: (incomingPath) => {
            const stripped = incomingPath.replace(/^\/api\/telegram-photo/, '');
            const ensured = stripped.startsWith('/') ? stripped : `/${stripped}`;
            const basePrefix = telegramGatewayProxy.basePath
              ? telegramGatewayProxy.basePath.startsWith('/')
                ? telegramGatewayProxy.basePath
                : `/${telegramGatewayProxy.basePath}`
              : '';
            const composed = `${basePrefix}/photo${ensured}`.replace(/\/{2,}/g, '/');
            return composed.length > 1 ? composed.replace(/\/+$/, '') : composed;
          },
        },
        '/docs': docsProxyConfig,
        '^/next/.*': docsProxyConfig,
        // n8n API routes - must come before /n8n proxy
        // These are absolute paths used by n8n HTML (e.g., /rest/sentry.js)
        '^/rest/.*': {
          target: n8nProxy.target,
          changeOrigin: true,
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
          },
        },
        // n8n assets - catch-all for /assets/* that aren't docs-specific
        // This handles n8n's absolute asset paths (e.g., /assets/polyfills-*.js, /assets/index-*.js)
        // Must come AFTER docs-specific paths (css/, js/, images/, fonts/) to avoid conflicts
        // The regex matches any /assets/* path that doesn't start with docs-specific subdirectories
        '^/assets/(?!css/|js/|images/|fonts/|branding/).*': {
          target: n8nProxy.target,
          changeOrigin: true,
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
            proxy.on('error', (err, req, res) => {
              console.warn('[n8n assets proxy]', req.url, err.message);
            });
          },
        },
        // n8n favicon
        '^/favicon.ico$': {
          target: n8nProxy.target,
          changeOrigin: true,
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
          },
        },
        // n8n prefixed static assets introduced by N8N_PATH (e.g., /n8nassets/*, /n8nstatic/*)
        '^/n8nassets': {
          target: n8nProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/n8nassets/, n8nAssetsRewriteTarget),
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
            stripFrameBlockingHeaders(proxy);
            proxy.on('error', (err, req) => {
              console.warn('[n8n assets proxy]', req.url, err.message);
            });
          },
        },
        '^/n8nstatic': {
          target: n8nProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/n8nstatic/, n8nStaticRewriteTarget),
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
            stripFrameBlockingHeaders(proxy);
            proxy.on('error', (err, req) => {
              console.warn('[n8n static proxy]', req.url, err.message);
            });
          },
        },
        '^/n8nfavicon.ico$': {
          target: n8nProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/n8nfavicon\.ico$/, n8nFaviconRewriteTarget),
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
            stripFrameBlockingHeaders(proxy);
          },
        },
        // n8n proxy - routes /n8n/* to n8n service (captures all paths including assets)
        // Basic Auth disabled - using n8n native authentication with cookies for session persistence
        // N8N_DISABLE_UI_SECURITY=true allows iframe embedding (removes X-Frame-Options)
        '^/n8n': {
          target: n8nProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/n8n/, n8nProxy.basePath),
          cookieDomainRewrite: '', // Preserve cookies from n8n
          cookiePathRewrite: '/', // Keep cookies available for both /n8n and /rest routes
          configure: (proxy, _options) => {
            attachN8nBasicAuth(proxy);
            stripFrameBlockingHeaders(proxy);
          },
          ws: true, // Enable WebSocket support for n8n real-time features
        },
        // Database UI Tools - Proxy to avoid CORS and X-Frame-Options issues
        '/db-ui/pgadmin': {
          target: dbUiPgAdminProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/db-ui\/pgadmin/, dbUiPgAdminProxy.basePath),
          configure: (proxy, _options) => {
            stripFrameBlockingHeaders(proxy);
            preserveProxyLocation(proxy, '/db-ui/pgadmin');
          },
        },
        // pgAdmin core endpoints referenced with absolute paths inside the app
        // (login flows, assets, misc APIs, etc.)
        '/static/': {
          target: dbUiPgAdminProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(
            /^\/static/,
            path.posix.join(dbUiPgAdminProxy.basePath, '/static'),
          ),
          configure: (proxy, _options) => {
            stripFrameBlockingHeaders(proxy);
          },
        },
        '^/(authenticate|browser|misc|settings|user_management|preferences|sqleditor|tools)(/|$)': {
          target: dbUiPgAdminProxy.target,
          changeOrigin: true,
          configure: (proxy, _options) => {
            stripFrameBlockingHeaders(proxy);
            preserveProxyLocation(proxy, '/db-ui/pgadmin');
          },
        },
        '^/(api|favicon.ico)(/|$)': {
          target: dbUiPgAdminProxy.target,
          changeOrigin: true,
          configure: (proxy, _options) => {
            stripFrameBlockingHeaders(proxy);
            preserveProxyLocation(proxy, '/db-ui/pgadmin');
          },
        },
        '/db-ui/pgweb': {
          target: dbUiPgWebProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/db-ui\/pgweb/, dbUiPgWebProxy.basePath),
          configure: (proxy, _options) => {
            stripFrameBlockingHeaders(proxy);
            preserveProxyLocation(proxy, '/db-ui/pgweb');
          },
        },
        '/db-ui/adminer': {
          target: dbUiAdminerProxy.target,
          changeOrigin: true,
          rewrite: createRewrite(/^\/db-ui\/adminer/, dbUiAdminerProxy.basePath),
          configure: (proxy, _options) => {
            stripFrameBlockingHeaders(proxy);
            preserveProxyLocation(proxy, '/db-ui/adminer');
          },
        },
        // QuestDB proxy is disabled due to connection timeout issues
        // QuestDB returns 301 redirects with malformed responses that hang the Vite proxy
        // Access QuestDB directly at: http://localhost:9002
        // See: https://github.com/questdb/questdb/issues/...
        // '/db-ui/questdb': {
        //   target: dbUiQuestDbProxy.target,
        //   changeOrigin: true,
        //   rewrite: createRewrite(/^\/db-ui\/questdb/, dbUiQuestDbProxy.basePath),
        //   configure: (proxy, _options) => {
        //     stripFrameBlockingHeaders(proxy);
        //     preserveProxyLocation(proxy, '/db-ui/questdb');
        //   },
        // },
        // Note: /specs/ files are served directly from public/specs/ by Vite
        // No proxy needed - files are static assets served from same origin
        // This avoids CORS issues in API viewers (redoc, swagger, rapidoc)
      },
    },
    define: {
      // CRITICAL: All VITE_* variables used in code MUST be defined here for production builds
      // Otherwise they will be undefined in production!
      'import.meta.env.VITE_GATEWAY_TOKEN': JSON.stringify(
        env.VITE_GATEWAY_TOKEN || env.VITE_TELEGRAM_GATEWAY_API_TOKEN || env.TELEGRAM_GATEWAY_API_TOKEN || env.API_SECRET_TOKEN || '',
      ),
      'import.meta.env.VITE_TELEGRAM_GATEWAY_API_TOKEN': JSON.stringify(
        env.VITE_TELEGRAM_GATEWAY_API_TOKEN || env.TELEGRAM_GATEWAY_API_TOKEN || env.API_SECRET_TOKEN || '',
      ),
      'import.meta.env.VITE_TELEGRAM_GATEWAY_API_URL': JSON.stringify(
        env.VITE_TELEGRAM_GATEWAY_API_URL || env.VITE_API_BASE_URL || 'http://localhost:14010',
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
          passes: 2, // Extra compression pass for better minification
        },
        mangle: {
          safari10: true, // Safari 10+ compatibility
        },
      },
      rollupOptions: {
        output: {
          // Aggressive code splitting for better caching
          experimentalMinChunkSize: 10240, // 10KB minimum chunk size
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

            // Date utilities (date-fns ~20KB)
            if (id.includes('node_modules/date-fns')) {
              return 'date-vendor';
            }

            // Router (react-router-dom ~30KB - used everywhere)
            if (id.includes('node_modules/react-router-dom')) {
              return 'router-vendor';
            }

            // Diff utility (only used in specific pages)
            if (id.includes('node_modules/diff')) {
              return 'diff-vendor';
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

            // NOTE: Catalog views and data are NOT manually chunked
            // Let Vite create separate chunks naturally for better lazy loading:
            // - Component chunks: ~10-20KB each
            // - Metadata chunks: ~25KB (loaded with component)
            // - Full data chunks: ~350KB (loaded on-demand only)

            // Heavy pages (>50KB) - Split for better lazy loading
            if (id.includes('/pages/LlamaIndexPage')) {
              return 'page-llama';
            }

            if (id.includes('/pages/DocusaurusPage')) {
              return 'page-docusaurus';
            }

            if (id.includes('/pages/WorkspacePageNew')) {
              return 'page-workspace';
            }

            if (id.includes('/pages/TPCapitalOpcoesPage')) {
              return 'page-tpcapital';
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
      // Bundle size budgets and warnings
      chunkSizeWarningLimit: 400, // Stricter limit: 400KB (down from 500KB)
      reportCompressedSize: true,
      // Set target for modern browsers to enable more optimizations
      target: 'es2020',
      // Enable CSS code splitting
      cssCodeSplit: true,
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
