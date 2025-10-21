/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WS_URL?: string;
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WORKSPACE_API_URL?: string;
  readonly VITE_TP_CAPITAL_API_URL?: string;
  readonly VITE_B3_API_URL?: string;
  readonly VITE_USE_MOCK_DATA?: string;
  readonly DEV: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
