export interface SearchResultItem {
  content: string;
  relevance: number;
  metadata: Record<string, unknown>;
}

export interface QueryResponse {
  answer: string;
  confidence: number;
  sources: SearchResultItem[];
  metadata: Record<string, unknown>;
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

function baseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const useUnified = `${env.VITE_USE_UNIFIED_DOMAIN}`.toLowerCase() === 'true';
  const apiBase = env.VITE_API_BASE_URL;
  const direct = (env.VITE_LLAMAINDEX_QUERY_URL || DEFAULT_QUERY_URL).replace(/\/+$/, '');
  const proxy = apiBase ? `${apiBase.replace(/\/+$/, '')}${DEFAULT_PROXY_PATH}` : '';

  // Apply override first
  if (overrideMode === 'proxy' && proxy) return proxy;
  if (overrideMode === 'direct') return direct;

  // Auto mode: prefer proxy in unified-domain setups; otherwise direct
  if (useUnified && apiBase && proxy) return proxy;
  return direct;
}

function authHeader(): HeadersInit {
  const env = import.meta.env as Record<string, string | undefined>;
  const token = (env.VITE_LLAMAINDEX_JWT || '').trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function search(query: string, maxResults = 5): Promise<SearchResultItem[]> {
  const url = `${baseUrl()}/search?query=${encodeURIComponent(query)}&max_results=${maxResults}`;
  const resp = await fetch(url, { headers: { ...authHeader() } });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Search failed (${resp.status}): ${msg}`);
  }
  return (await resp.json()) as SearchResultItem[];
}

export async function queryDocs(queryText: string, maxResults = 5): Promise<QueryResponse> {
  const url = `${baseUrl()}/query`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ query: queryText, max_results: maxResults }),
  });
  if (!resp.ok) {
    const msg = await resp.text();
    throw new Error(`Query failed (${resp.status}): ${msg}`);
  }
  return (await resp.json()) as QueryResponse;
}

export function endpointInfo(): { url: string; mode: ServiceMode; resolved: 'proxy' | 'direct' } {
  const env = import.meta.env as Record<string, string | undefined>;
  const apiBase = env.VITE_API_BASE_URL;
  const proxy = apiBase ? `${apiBase.replace(/\/+$/, '')}${DEFAULT_PROXY_PATH}` : '';
  const url = baseUrl();
  const resolved: 'proxy' | 'direct' = proxy && url.startsWith(proxy) ? 'proxy' : 'direct';
  return { url, mode: overrideMode, resolved };
}

export const llamaIndexService = { search, queryDocs };
