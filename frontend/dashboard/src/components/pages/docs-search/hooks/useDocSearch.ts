/**
 * useDocSearch - Hook for documentation search
 * Quick Win P1-2: Extract search logic from DocsHybridSearchPage.tsx
 */

import { useState, useCallback } from "react";

export interface SearchResult {
  id: string;
  title: string;
  content: string;
  path: string;
  score: number;
  type?: string;
  domain?: string;
  status?: string;
  metadata?: Record<string, any>;
}

export interface SearchOptions {
  type?: string;
  domain?: string;
  status?: string;
  limit?: number;
}

export function useDocSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const search = useCallback(
    async (searchQuery: string, options: SearchOptions = {}) => {
      if (!searchQuery.trim()) {
        setResults([]);
        setQuery("");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setQuery(searchQuery);

        // Build query params
        const params = new URLSearchParams({
          q: searchQuery,
          limit: String(options.limit || 50),
        });

        if (options.type) params.append("type", options.type);
        if (options.domain) params.append("domain", options.domain);
        if (options.status) params.append("status", options.status);

        const response = await fetch(`/api/docs/search?${params}`);

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        setResults(data.results || data.data || []);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro na busca";
        setError(message);
        setResults([]);
        console.error("[useDocSearch] Error:", err);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setResults([]);
    setQuery("");
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    query,
    search,
    clear,
    setQuery,
  };
}
