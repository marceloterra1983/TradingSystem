/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COURSE_CRAWLER_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
