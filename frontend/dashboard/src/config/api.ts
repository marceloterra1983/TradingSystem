/**
 * Centralized API configuration for unified domain and direct port access
 */

import { ENDPOINTS } from "./endpoints";

// Types
export interface ApiConfig {
  baseUrl: string;
  libraryApi: string;
  tpCapitalApi: string;
  documentationApi: string;
  telegramGatewayApi: string;
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
  | "library"
  | "tpCapital"
  | "documentation"
  | "telegramGateway"
  | "firecrawlProxy";

// Unified domain configuration
const resolveEnv = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = (import.meta.env as Record<string, string | undefined>)[key];
    if (typeof value === "string" && value.trim() !== "") {
      return value;
    }
  }
  return undefined;
};

const normalizeBase = (value: string): string =>
  value.endsWith("/") ? value.slice(0, -1) : value;

const composeUrl = (base: string, path: string): string => {
  const sanitizedBase = normalizeBase(base);
  const sanitizedPath = path.replace(/^\/+/, "");
  return `${sanitizedBase}/${sanitizedPath}`;
};

const getBaseUrl = () => {
  const explicitConfig = resolveEnv(
    "VITE_GATEWAY_HTTP_URL",
    "VITE_API_BASE_URL",
    "VITE_UNIFIED_DOMAIN_URL",
  );
  if (explicitConfig) {
    return normalizeBase(explicitConfig);
  }

  const fallbackPort =
    resolveEnv("VITE_GATEWAY_PORT", "VITE_DASHBOARD_PORT") || "9082";

  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.origin);
      const isLocalHost =
        url.hostname === "localhost" || url.hostname === "127.0.0.1";
      if (url.protocol.startsWith("http") && isLocalHost) {
        url.port = fallbackPort;
      }
      return normalizeBase(url.toString());
    } catch {
      return normalizeBase(window.location.origin);
    }
  }

  return `http://localhost:${fallbackPort}`;
};

const apiBase = getBaseUrl();

const unifiedConfig: ApiConfig = {
  baseUrl: apiBase,
  libraryApi: `${apiBase}/api/workspace`,
  tpCapitalApi: `${apiBase}/api/tp-capital`,
  documentationApi: `${apiBase}/api/docs`,
  telegramGatewayApi: `${apiBase}/api/telegram-gateway`,
  firecrawlProxyApi: `${apiBase}/api/firecrawl`,
  docsUrl: `${apiBase}/docs`,  // Fixed: Docusaurus via Traefik at /docs (not /api/docs)
  docsApiUrl: composeUrl(apiBase, "/docs/api/documentation-api"),
  questdbConsoleUrl:
    import.meta.env.VITE_QUESTDB_CONSOLE_URL || ENDPOINTS.questdb,
  questdbUiUrl: import.meta.env.VITE_QUESTDB_UI_URL || ENDPOINTS.questdb,
  pgAdminUrl: import.meta.env.VITE_PGADMIN_URL || ENDPOINTS.pgAdmin,
  pgWebUrl: import.meta.env.VITE_PGWEB_URL || ENDPOINTS.pgWeb,
  adminerUrl: import.meta.env.VITE_ADMINER_URL || ENDPOINTS.adminer,
};

// Direct port configuration (legacy)
const directConfig: ApiConfig = {
  baseUrl: "",
  libraryApi: resolveEnv("VITE_WORKSPACE_API_URL") || "/api/workspace",
  tpCapitalApi: import.meta.env.VITE_TP_CAPITAL_API_URL || "/api/tp-capital",
  documentationApi: import.meta.env.VITE_DOCUMENTATION_API_URL || "/api/docs",
  telegramGatewayApi:
    import.meta.env.VITE_TELEGRAM_GATEWAY_API_URL || "/api/telegram-gateway",
  firecrawlProxyApi:
    import.meta.env.VITE_FIRECRAWL_PROXY_URL || "/api/firecrawl",
  docsUrl:
    import.meta.env.VITE_DOCUSAURUS_URL ||
    (import.meta.env.DEV ? "http://localhost:3400/docs" : "/docs"),
  docsApiUrl:
    import.meta.env.VITE_DOCSPECS_URL || "/docs/api/documentation-api",
  questdbConsoleUrl:
    import.meta.env.VITE_QUESTDB_CONSOLE_URL || ENDPOINTS.questdb,
  questdbUiUrl: import.meta.env.VITE_QUESTDB_UI_URL || ENDPOINTS.questdb,
  pgAdminUrl: import.meta.env.VITE_PGADMIN_URL || ENDPOINTS.pgAdmin,
  pgWebUrl: import.meta.env.VITE_PGWEB_URL || ENDPOINTS.pgWeb,
  adminerUrl: import.meta.env.VITE_ADMINER_URL || ENDPOINTS.adminer,
};

// Get current configuration based on environment
const useUnifiedDomain = import.meta.env.VITE_USE_UNIFIED_DOMAIN !== "false";
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
    case "library":
      return apiConfig.libraryApi;
    case "tpCapital": {
      // Precedence:
      // 1) Explicit env override (VITE_TP_CAPITAL_API_URL)
      // 2) Default: /api/tp-capital (use proxy)
      const explicit = resolveEnv("VITE_TP_CAPITAL_API_URL");
      const url = explicit || apiConfig.tpCapitalApi;
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console
        console.debug("[api] tpCapitalApi =", url);
      }
      return url;
    }
    case "documentation":
      return apiConfig.documentationApi;
    case "telegramGateway":
      return apiConfig.telegramGatewayApi;
    case "firecrawlProxy":
      return apiConfig.firecrawlProxyApi;
    default:
      throw new Error(`Unknown service: ${service}`);
  }
}
