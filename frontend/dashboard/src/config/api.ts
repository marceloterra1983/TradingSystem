/**
 * Centralized API configuration for unified domain and direct port access
 */

// Types
export interface ApiConfig {
  baseUrl: string;
  libraryApi: string;
  tpCapitalApi: string;
  b3MarketApi: string;
  documentationApi: string;
  serviceLauncherApi: string;
  firecrawlProxyApi: string;
  docsUrl: string;
  docsApiUrl: string;
  questdbConsoleUrl: string;
  questdbUiUrl: string;
  pgAdminUrl: string;
  pgWebUrl: string;
  adminerUrl: string;
}

export type ApiService =
  | 'library'
  | 'tpCapital'
  | 'b3Market'
  | 'documentation'
  | 'serviceLauncher'
  | 'firecrawlProxy';

// Unified domain configuration
const resolveEnv = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
};

const pickFirst = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => typeof value === 'string' && value.trim() !== '');

const unifiedConfig: ApiConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local',
  libraryApi:
    resolveEnv('VITE_WORKSPACE_API_URL') ||
    `${
      import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
    }/api/workspace`,
  tpCapitalApi: `${
    import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
  }/api/tp-capital`,
  b3MarketApi: `${
    import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
  }/api/b3`,
  documentationApi: `${
    import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
  }/api/docs`,
  serviceLauncherApi: `${
    import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
  }/api/launcher`,
  firecrawlProxyApi: `${
    import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
  }/api/firecrawl`,
  docsUrl: `${
    import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
  }/docs`,
  docsApiUrl: `${import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'}/docs/api/documentation-api`,
  questdbConsoleUrl:
    pickFirst(
      import.meta.env.VITE_QUESTDB_CONSOLE_URL,
      import.meta.env.VITE_QUESTDB_CONSOLE_INTERNAL_URL,
      `${
        import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
      }/questdb-console`,
      'http://localhost:9000',
      'http://localhost:8813',
      'http://localhost:9002'
    ) || 'http://localhost:9000',
  questdbUiUrl:
    pickFirst(
      import.meta.env.VITE_QUESTDB_UI_URL,
      import.meta.env.VITE_QUESTDB_UI_INTERNAL_URL,
      `${
        import.meta.env.VITE_API_BASE_URL || 'http://tradingsystem.local'
      }/questdb-ui`,
      'http://localhost:9010',
      'http://localhost:8813',
      'http://localhost:9009'
    ) || 'http://localhost:9010',
  pgAdminUrl: import.meta.env.VITE_PGADMIN_URL || 'http://localhost:5050',
  pgWebUrl: import.meta.env.VITE_PGWEB_URL || 'http://localhost:8081',
  adminerUrl: import.meta.env.VITE_ADMINER_URL || 'http://localhost:8082',
};

// Direct port configuration (legacy)
const directConfig: ApiConfig = {
  baseUrl: '',
  libraryApi:
    resolveEnv('VITE_WORKSPACE_API_URL') || 'http://localhost:3200/api',
  tpCapitalApi:
    import.meta.env.VITE_TP_CAPITAL_API_URL || '/api/tp-capital',
  b3MarketApi: import.meta.env.VITE_B3_API_URL || '/api/b3',
  documentationApi: import.meta.env.VITE_DOCUMENTATION_API_URL || '/api/docs',
  serviceLauncherApi:
    import.meta.env.VITE_SERVICE_LAUNCHER_API_URL || '/api/launcher',
  firecrawlProxyApi:
    import.meta.env.VITE_FIRECRAWL_PROXY_URL || 'http://localhost:3600',
  docsUrl: import.meta.env.VITE_DOCUSAURUS_URL || '/docs', // Proxied through Vite to NGINX (localhost:3400)
  // Note: Port 3400 serves static Docusaurus via NGINX (documentation container)
  // Port 3401 serves DocsAPI (Express + FlexSearch) for search and API features
  // Vite proxy configuration: /docs -> http://localhost:3400 (no CORS issues)
  // See DOCUMENTATION-CONTAINER-SOLUTION.md for 2-container architecture
  docsApiUrl: import.meta.env.VITE_DOCSPECS_URL || 'http://localhost:3401',
  questdbConsoleUrl:
    pickFirst(
      import.meta.env.VITE_QUESTDB_CONSOLE_URL,
      'http://localhost:9000',
      'http://localhost:8813',
      'http://localhost:9002'
    ) || 'http://localhost:9000',
  questdbUiUrl:
    pickFirst(
      import.meta.env.VITE_QUESTDB_UI_URL,
      'http://localhost:9010',
      'http://localhost:8813',
      'http://localhost:9009'
    ) || 'http://localhost:9010',
  pgAdminUrl: import.meta.env.VITE_PGADMIN_URL || 'http://localhost:5050',
  pgWebUrl: import.meta.env.VITE_PGWEB_URL || 'http://localhost:8081',
  adminerUrl: import.meta.env.VITE_ADMINER_URL || 'http://localhost:8082',
};

// Get current configuration based on environment
const useUnifiedDomain = import.meta.env.VITE_USE_UNIFIED_DOMAIN === 'true';
export const apiConfig: ApiConfig = useUnifiedDomain
  ? unifiedConfig
  : directConfig;

/**
 * Get API URL for a specific service
 * @param service - Service identifier
 * @returns URL for the specified service
 */
export function getApiUrl(service: ApiService): string {
  switch (service) {
    case 'library':
      return apiConfig.libraryApi;
    case 'tpCapital': {
      // Precedence:
      // 1) Explicit env override (VITE_TP_CAPITAL_API_URL)
      // 2) Default: /api/tp-capital (use proxy)
      const explicit = resolveEnv('VITE_TP_CAPITAL_API_URL');
      const url = explicit || apiConfig.tpCapitalApi;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug('[api] tpCapitalApi =', url);
      }
      return url;
    }
    case 'b3Market':
      return apiConfig.b3MarketApi;
    case 'documentation':
      return apiConfig.documentationApi;
    case 'serviceLauncher':
      return apiConfig.serviceLauncherApi;
    case 'firecrawlProxy':
      return apiConfig.firecrawlProxyApi;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}
