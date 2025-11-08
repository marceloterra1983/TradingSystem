export type AuthMethod = 'none' | 'form' | 'cookie' | 'bearer' | 'oauth2' | 'sso';

export interface JobDefinition {
  id: string;
  platform: string;
  start_urls: string[];
  auth: {
    method: AuthMethod;
    owner_login?: boolean;
    credentials_env?: {
      username?: string;
      password?: string;
    };
    session_store?: {
      enabled: boolean;
      path: string;
      encrypt_with_env: string;
    };
  };
  selectors: Record<string, unknown>;
  scroll?: {
    enabled: boolean;
    step?: number;
    delay_ms?: number;
    max_scrolls?: number;
  };
  output: {
    format: Array<'json' | 'md'>;
    directory: string;
  };
}

export type JobStatus = 'idle' | 'running' | 'failed' | 'completed';

export interface JobRun {
  jobId: string;
  runId: string;
  startedAt: string;
  finishedAt?: string;
  status: JobStatus;
  progress: number;
  logs: string[];
  artifacts: string[];
  error?: string;
}
