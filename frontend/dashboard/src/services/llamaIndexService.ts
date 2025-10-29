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

function baseUrl(): string {
  const env = import.meta.env as Record<string, string | undefined>;
  const useUnified = `${env.VITE_USE_UNIFIED_DOMAIN}`.toLowerCase() === 'true';
  const apiBase = env.VITE_API_BASE_URL;
  if (useUnified && apiBase) {
    return `${apiBase.replace(/\/+$/, '')}${DEFAULT_PROXY_PATH}`;
  }
  const raw = env.VITE_LLAMAINDEX_QUERY_URL || DEFAULT_QUERY_URL;
  return (raw || DEFAULT_QUERY_URL).replace(/\/+$/, '');
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

export const llamaIndexService = { search, queryDocs };
