export interface SearchResultItem {
  content: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

export interface LlamaIndexGpuPolicy {
  forced: boolean;
  num_gpu?: number;
  max_concurrency: number;
  cooldown_seconds: number;
  has_additional_options: boolean;
  interprocess_lock_enabled?: boolean;
  lock_path?: string | null;
  lock_poll_seconds?: number | null;
}

export interface LlamaIndexGpuLockMetadata {
  enabled: boolean;
  path?: string | null;
  pollSeconds?: number | null;
  owner?: string | null;
}

export interface LlamaIndexGpuMetadata {
  waitTimeSeconds: number;
  maxConcurrency: number;
  cooldownSeconds: number;
  policy?: LlamaIndexGpuPolicy;
  options?: Record<string, unknown>;
  operation?: string;
  lock?: LlamaIndexGpuLockMetadata;
}

export interface QueryMetadata {
  timestamp: string;
  user: string;
  query_type: string;
  collection?: string;
  gpu?: LlamaIndexGpuMetadata;
  [key: string]: unknown;
}

export interface QueryResponse {
  answer: string;
  confidence: number;
  sources: SearchResultItem[];
  metadata: QueryMetadata;
}

export interface GpuPolicyResponse {
  policy: LlamaIndexGpuPolicy;
  options: Record<string, unknown>;
  maxConcurrency: number;
  cooldownSeconds: number;
}

const DEFAULT_QUERY_URL = 'http://localhost:8202';
const DEFAULT_PROXY_PATH = '/api/v1/rag';

export type ServiceMode = 'auto' | 'proxy' | 'direct';
let overrideMode: ServiceMode = 'auto';

export function setMode(mode: ServiceMode) {
  overrideMode = mode;
}

export function getMode(): ServiceMode {
  return overrideMode;
}

type EndpointPlan = {
  primary: string;
  secondary?: string;
  primaryKind: 'direct' | 'proxy';
};

function resolveEndpoints(): EndpointPlan {
  const env = import.meta.env as Record<string, string | undefined>;
  const useUnified = `${env.VITE_USE_UNIFIED_DOMAIN}`.toLowerCase() === 'true';
  const apiBase = env.VITE_API_BASE_URL?.trim();
  const direct = (env.VITE_LLAMAINDEX_QUERY_URL || DEFAULT_QUERY_URL).replace(/\/+$/, '');
  const proxy = apiBase && apiBase.length > 0
    ? `${apiBase.replace(/\/+$/, '')}${DEFAULT_PROXY_PATH}`
    : DEFAULT_PROXY_PATH;
  const preferProxy = Boolean(proxy);

  if (overrideMode === 'proxy' && proxy) {
    return { primary: proxy, secondary: direct, primaryKind: 'proxy' };
  }
  if (overrideMode === 'direct') {
    return { primary: direct, secondary: proxy, primaryKind: 'direct' };
  }

  if (useUnified && proxy) {
    return { primary: proxy, secondary: direct, primaryKind: 'proxy' };
  }

  if (preferProxy) {
    return { primary: proxy, secondary: direct, primaryKind: 'proxy' };
  }

  return { primary: direct, secondary: undefined, primaryKind: 'direct' };
}

function authHeader(): HeadersInit {
  const env = import.meta.env as Record<string, string | undefined>;
  const token = (env.VITE_LLAMAINDEX_JWT || '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function shouldRetry(status: number): boolean {
  return [401, 403, 404, 408, 429, 500, 502, 503, 504].includes(status);
}

async function fetchWithFallback(path: string, init: RequestInit = {}): Promise<Response> {
  const plan = resolveEndpoints();
  const auth = authHeader();

  const attempts: Array<{ base: string; kind: 'primary' | 'secondary' }> = [
    { base: plan.primary, kind: 'primary' },
  ];
  if (plan.secondary) {
    attempts.push({ base: plan.secondary, kind: 'secondary' });
  }

  let lastError: Error | null = null;
  for (const attempt of attempts) {
    const headers = new Headers(init.headers || {});
    Object.entries(auth).forEach(([key, value]) => {
      if (value) headers.set(key, value as string);
    });

    try {
      const response = await fetch(`${attempt.base}${path}`, { ...init, headers });
      if (response.ok || attempt.kind === 'secondary' || !plan.secondary) {
        if (!response.ok) {
          const text = await response.text();
          throw new Error(`Request failed (${response.status}): ${text || response.statusText}`);
        }
        return response;
      }

      if (!shouldRetry(response.status)) {
        const text = await response.text();
        throw new Error(`Request failed (${response.status}): ${text || response.statusText}`);
      }

      lastError = new Error(`Request failed (${response.status}). Retrying via fallback.`);
    } catch (err: any) {
      if (attempt.kind === 'secondary' || !plan.secondary) {
        if (err?.name === 'TypeError' && err?.message === 'Failed to fetch') {
          throw new Error('Não foi possível conectar ao serviço LlamaIndex.');
        }
        throw err instanceof Error ? err : new Error(String(err));
      }
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error('Falha ao contatar serviço LlamaIndex.');
}

export async function search(query: string, maxResults = 5): Promise<SearchResultItem[]> {
  const resp = await fetchWithFallback(
    `/search?query=${encodeURIComponent(query)}&max_results=${maxResults}`,
    { method: 'GET' }
  );
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Search failed (${resp.status}): ${msg}`);
  }
  return (await resp.json()) as SearchResultItem[];
}

export async function queryDocs(queryText: string, maxResults = 5): Promise<QueryResponse> {
  const resp = await fetchWithFallback('/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: queryText, max_results: maxResults }),
  });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Query failed (${resp.status}): ${msg}`);
  }
  return (await resp.json()) as QueryResponse;
}

export async function fetchGpuPolicy(): Promise<GpuPolicyResponse> {
  const resp = await fetchWithFallback('/gpu/policy', { method: 'GET' });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`GPU policy fetch failed (${resp.status}): ${msg}`);
  }
  return (await resp.json()) as GpuPolicyResponse;
}

export function endpointInfo(): { url: string; mode: ServiceMode; resolved: 'proxy' | 'direct' } {
  const plan = resolveEndpoints();
  const resolved: 'proxy' | 'direct' = plan.primaryKind === 'proxy' ? 'proxy' : 'direct';
  return { url: plan.primary, mode: overrideMode, resolved };
}

export async function checkHealth(): Promise<{ status: 'ok' | 'error'; message: string; url: string; resolved: 'proxy' | 'direct' }> {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiBase = (env.VITE_API_BASE_URL || '').replace(/\/+$/, '');
  const direct = (env.VITE_LLAMAINDEX_QUERY_URL || DEFAULT_QUERY_URL).replace(/\/+$/, '');
  const info = endpointInfo();
  let url = '';
  if (info.resolved === 'proxy') {
    // documentation-api health endpoint (supports unified domain + local dev proxy)
    url = apiBase ? `${apiBase}/api/v1/docs/health` : '/api/v1/docs/health';
  } else {
    url = `${direct}/health`;
  }
  try {
    const resp = await fetch(url, { method: 'GET' });
    if (resp.ok) return { status: 'ok', message: 'OK', url, resolved: info.resolved };
    return { status: 'error', message: `HTTP ${resp.status}`, url, resolved: info.resolved };
  } catch (e: any) {
    return { status: 'error', message: e?.message || 'Network error', url, resolved: info.resolved };
  }
}

export const llamaIndexService = { search, queryDocs, checkHealth, fetchGpuPolicy };
