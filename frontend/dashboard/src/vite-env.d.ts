/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_SECRET_TOKEN?: string;
  readonly VITE_WORKSPACE_API_URL?: string;
  readonly VITE_WORKSPACE_PROXY_TARGET?: string;
  readonly VITE_TP_CAPITAL_API_URL?: string;
  readonly VITE_TP_CAPITAL_API_KEY?: string;
  readonly VITE_TP_CAPITAL_API_TOKEN?: string;
  readonly VITE_LLAMAINDEX_QUERY_URL?: string;
  readonly VITE_LLAMAINDEX_URL?: string;
  readonly VITE_LLAMAINDEX_JWT?: string;
  readonly VITE_RAG_SERVICE_URL?: string;
  readonly VITE_RAG_COLLECTIONS_URL?: string;
  readonly VITE_RAG_COLLECTIONS_INTERNAL_URL?: string;
  readonly VITE_COURSE_CRAWLER_APP_URL?: string;
  readonly VITE_DOCS_BASE_URL?: string;
  readonly VITE_DOCSPECS_URL?: string;
  readonly VITE_DOCUMENTATION_API_URL?: string;
  readonly VITE_DOCUSAURUS_URL?: string;
  readonly VITE_DOCUSAURUS_PROXY_TARGET?: string;
  readonly VITE_FIRECRAWL_PROXY_URL?: string;
  readonly VITE_PRD_BASE_URL?: string;
  readonly VITE_USE_DOCS_V2_PRD?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly VITE_USE_UNIFIED_DOMAIN?: string;
  readonly VITE_GATEWAY_TOKEN?: string;
  readonly VITE_TELEGRAM_GATEWAY_API_URL?: string;
  readonly VITE_TELEGRAM_GATEWAY_API_TOKEN?: string;
  readonly VITE_LAUNCHER_API_URL?: string;
  readonly VITE_LAUNCHER_API_TOKEN?: string;
  readonly VITE_LAUNCHER_API_SECRET?: string;
  readonly VITE_WAHA_DASHBOARD_URL?: string;
  readonly VITE_OLLAMA_URL?: string;
  readonly VITE_TIMEZONE?: string;
  readonly VITE_QUESTDB_URL?: string;
  readonly VITE_QUESTDB_CONSOLE_URL?: string;
  readonly VITE_QUESTDB_CONSOLE_INTERNAL_URL?: string;
  readonly VITE_QUESTDB_UI_URL?: string;
  readonly VITE_QUESTDB_UI_INTERNAL_URL?: string;
  readonly VITE_TIMESCALEDB_PORT?: string;
  readonly VITE_QDRANT_URL?: string;
  readonly VITE_REDIS_PORT?: string;
  readonly VITE_PROMETHEUS_URL?: string;
  readonly VITE_GRAFANA_URL?: string;
  readonly VITE_PGADMIN_URL?: string;
  readonly VITE_PGWEB_URL?: string;
  readonly VITE_ADMINER_URL?: string;
  readonly VITE_KONG_API_URL?: string;
  readonly VITE_KONG_ADMIN_URL?: string;
  readonly VITE_KONG_GATEWAY_URL?: string;
  readonly DEV: boolean;
  readonly PROD?: boolean;
  readonly [key: string]: string | boolean | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
