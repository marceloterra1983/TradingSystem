/**
 * Centralized Endpoint Configuration
 *
 * All external service URLs configured via environment variables.
 * Uses protected port ranges for databases (7000-7999).
 *
 * @see {@link https://github.com/marceloterra1983/TradingSystem/blob/main/PORTS-CONVENTION.md}
 *
 * @remarks
 * Port Ranges:
 * - 7000-7099: Database services (TimescaleDB, QuestDB, Qdrant, Redis)
 * - 7100-7199: Database UI tools (PgAdmin, Adminer, PgWeb)
 * - 7200-7299: Database exporters and monitoring
 *
 * @example
 * ```typescript
 * // Accessing backend API
 * const workspaceUrl = ENDPOINTS.workspace;
 *
 * // Accessing database UI
 * const pgAdminUrl = ENDPOINTS.pgAdmin;
 *
 * // Accessing database port
 * const dbPort = ENDPOINTS.timescaledb.port;
 * ```
 */
export const ENDPOINTS = {
  /**
   * Backend API Services
   * @description HTTP REST APIs for application services
   */

  /** Workspace API - Port 3200 (LowDB Stack - WSL2 workaround) */
  workspace: import.meta.env.VITE_API_BASE_URL || "http://localhost:3200",

  /** TP Capital Signals API - Port 4008 (Autonomous Stack) */
  tpCapital: import.meta.env.VITE_TP_CAPITAL_API_URL || "http://localhost:4008",

  /** Documentation API - Port 3405 (Docker container) */
  documentation:
    import.meta.env.VITE_DOCUMENTATION_API_URL || "http://localhost:3405",

  /** Telegram Gateway API - Port 4010 (Node.js service) */
  telegramGateway:
    import.meta.env.VITE_TELEGRAM_GATEWAY_API_URL || "http://localhost:4010",

  /**
   * Database UI Tools
   * @description Web interfaces for database administration
   * @remarks Protected Range: 7100-7199
   */

  /** PgAdmin - PostgreSQL/TimescaleDB Web UI (Direct access - subpath not supported) */
  pgAdmin: import.meta.env.VITE_PGADMIN_URL || "http://localhost:5050",

  /** Adminer - Lightweight database management (Direct access - subpath not supported) */
  adminer: import.meta.env.VITE_ADMINER_URL || "http://localhost:3910",

  /** PgWeb - Lightweight PostgreSQL browser (Direct access - subpath not supported) */
  pgWeb: import.meta.env.VITE_PGWEB_URL || "http://localhost:5051",

  /**
   * Database Services - Direct Access
   * @description Direct database connections and HTTP endpoints
   * @remarks Protected Range: 7000-7099
   */

  /**
   * TimescaleDB (PostgreSQL time-series)
   * @property {number} port - PostgreSQL wire protocol port (7000)
   * @property {string} url - HTTP endpoint for extensions
   */
  timescaledb: {
    port: parseInt(import.meta.env.VITE_TIMESCALEDB_PORT || "7000"),
    url: `http://localhost:${import.meta.env.VITE_TIMESCALEDB_PORT || "7000"}`,
  },

  /** QuestDB - High-performance time-series database (Direct access - subpath not supported) */
  questdb: import.meta.env.VITE_QUESTDB_URL || "http://localhost:9002",

  /** Qdrant - Vector database for RAG/AI - Port 7020 (HTTP API) */
  qdrant: import.meta.env.VITE_QDRANT_URL || "http://localhost:7020",

  /**
   * Redis - Cache and queue management
   * @property {number} port - Redis protocol port (7030)
   */
  redis: {
    port: parseInt(import.meta.env.VITE_REDIS_PORT || "7030"),
  },

  /**
   * Monitoring Services
   * @description Observability and metrics
   */

  /** Prometheus - Metrics collection and time-series - Port 9091 */
  prometheus: import.meta.env.VITE_PROMETHEUS_URL || "http://localhost:9091",

  /** Grafana - Dashboards and visualization - Port 3104 */
  grafana: import.meta.env.VITE_GRAFANA_URL || "http://localhost:3104",

  /**
   * RAG Services
   * @description Retrieval-Augmented Generation stack
   */
  rag: {
    /** RAG Service - Main RAG API - Port 3402 */
    service: import.meta.env.VITE_RAG_SERVICE_URL || "http://localhost:3402",

    /** LlamaIndex Query Service - Semantic search - Port 8202 */
    llamaindex: import.meta.env.VITE_LLAMAINDEX_URL || "http://localhost:8202",

    /** Ollama - LLM inference engine - Port 11434 */
    ollama: import.meta.env.VITE_OLLAMA_URL || "http://localhost:11434",
  },

  /**
   * Kong API Gateway
   * @description API management and routing
   */
  kong: {
    /** Kong API Gateway - Public API - Port 8000 */
    api: import.meta.env.VITE_KONG_API_URL || "http://localhost:8000",

    /** Kong Admin API - Management interface - Port 8001 */
    admin: import.meta.env.VITE_KONG_ADMIN_URL || "http://localhost:8001",
  },
} as const;

/**
 * Type Exports
 * @description Type-safe access to endpoint names and values
 */

/** All available endpoint names */
export type EndpointName = keyof typeof ENDPOINTS;

/** Database UI endpoint names */
export type DatabaseUIName = keyof ReturnType<typeof getDatabaseUIEndpoints>;

/** Monitoring endpoint names */
export type MonitoringEndpointName = keyof ReturnType<
  typeof getMonitoringEndpoints
>;

/** Extract endpoint value type */
export type EndpointValue<T extends EndpointName> = (typeof ENDPOINTS)[T];

/**
 * Validate endpoint availability
 *
 * @param url - Full endpoint URL to validate
 * @param timeout - Request timeout in milliseconds (default: 5000ms)
 * @returns Promise<boolean> - true if endpoint is reachable and healthy
 *
 * @remarks
 * Checks if the endpoint's /health route returns HTTP 200.
 * Useful for dashboard health indicators.
 *
 * @example
 * ```typescript
 * const isHealthy = await validateEndpoint(ENDPOINTS.workspace);
 * if (isHealthy) {
 *   console.log('Workspace API is up!');
 * }
 * ```
 */
export async function validateEndpoint(
  url: string,
  timeout: number = 5000,
): Promise<boolean> {
  try {
    const response = await fetch(`${url}/health`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(timeout),
    });

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get all database UI endpoints
 *
 * @returns Record<string, string> - Map of UI names to URLs
 *
 * @remarks
 * Returns web interfaces for database administration.
 * All URLs use the protected port range (7100-7199).
 *
 * @example
 * ```typescript
 * const uiEndpoints = getDatabaseUIEndpoints();
 * console.log(uiEndpoints['PgAdmin']); // http://localhost:7100
 * ```
 */
export function getDatabaseUIEndpoints(): Record<string, string> {
  return {
    PgAdmin: ENDPOINTS.pgAdmin,
    Adminer: ENDPOINTS.adminer,
    PgWeb: ENDPOINTS.pgWeb,
    "QuestDB UI": ENDPOINTS.questdb,
    "Qdrant Dashboard": `${ENDPOINTS.qdrant}/dashboard`,
  };
}

/**
 * Get all monitoring endpoints
 *
 * @returns Record<string, string> - Map of monitoring service names to URLs
 *
 * @remarks
 * Returns observability and metrics dashboards.
 *
 * @example
 * ```typescript
 * const monitoring = getMonitoringEndpoints();
 * window.open(monitoring['Grafana'], '_blank');
 * ```
 */
export function getMonitoringEndpoints(): Record<string, string> {
  return {
    Prometheus: ENDPOINTS.prometheus,
    Grafana: ENDPOINTS.grafana,
  };
}

/**
 * Validate if a port is in the protected database range
 *
 * @param port - Port number to validate
 * @returns boolean - true if port is in protected range (7000-7999)
 *
 * @remarks
 * Protected ranges:
 * - 7000-7099: Database services
 * - 7100-7199: Database UIs
 * - 7200-7299: Database monitoring
 *
 * @example
 * ```typescript
 * if (isValidDatabasePort(7100)) {
 *   console.log('Port is protected for databases');
 * }
 * ```
 */
export function isValidDatabasePort(port: number): boolean {
  return port >= 7000 && port <= 7999;
}

/**
 * Get port category
 *
 * @param port - Port number to categorize
 * @returns string - Category name or 'unknown'
 *
 * @example
 * ```typescript
 * console.log(getPortCategory(7100)); // "Database UI"
 * console.log(getPortCategory(7010)); // "Database Service"
 * ```
 */
export function getPortCategory(port: number): string {
  if (port >= 7000 && port <= 7099) return "Database Service";
  if (port >= 7100 && port <= 7199) return "Database UI";
  if (port >= 7200 && port <= 7299) return "Database Monitoring";
  if (port >= 3000 && port <= 3999) return "Application Service";
  if (port >= 4000 && port <= 4999) return "Backend API";
  if (port >= 8000 && port <= 8999) return "Gateway/Infrastructure";
  if (port >= 9000 && port <= 9999) return "Monitoring";
  return "Unknown";
}
