/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_COURSE_CRAWLER_API_URL?: string;
  readonly VITE_COURSE_CRAWLER_APP_URL?: string;
  readonly VITE_DOCKER_CONTROL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
