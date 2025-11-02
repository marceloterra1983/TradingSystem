/**
 * useRagQuery Hook
 *
 * React hook for semantic search using RAG Collections Service
 * Provides query execution, result management, and error handling
 *
 * @module hooks/llamaIndex/useRagQuery
 */

import { useState, useCallback, useRef, useEffect } from 'react';

/**
 * Query options
 */
export interface RagQueryOptions {
  collection?: string;
  limit?: number;
  scoreThreshold?: number;
}

/**
 * Query result item
 */
export interface RagQueryResult {
  id: string;
  score: number;
  title: string;
  path: string;
  url: string;
  snippet: string;
  source: 'rag';
  collection: string;
  metadata: {
    file_path?: string;
    file_name?: string;
    chunk_index?: number;
    chunk_total?: number;
    last_modified?: string;
    tags?: string[];
  };
}

/**
 * Query response
 */
export interface RagQueryResponse {
  query: string;
  results: RagQueryResult[];
  totalResults: number;
  collection: string;
  embeddingModel: string;
  performance: {
    totalMs: number;
    embeddingMs: number;
    searchMs: number;
  };
  cached?: boolean;
}

/**
 * Hook return value
 */
export interface UseRagQueryReturn {
  results: RagQueryResult[];
  loading: boolean;
  error: string | null;
  performance: RagQueryResponse['performance'] | null;
  cached: boolean;
  search: (query: string, options?: RagQueryOptions) => Promise<void>;
  cancel: () => void;
  clear: () => void;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: Required<RagQueryOptions> = {
  collection: 'documentation__nomic',
  limit: 10,
  scoreThreshold: 0.7,
};

/**
 * RAG Collections Service base URL
 */
const RAG_SERVICE_URL =
  import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:3403';

/**
 * useRagQuery Hook
 *
 * @example
 * ```tsx
 * const { results, loading, error, search } = useRagQuery();
 *
 * const handleSearch = async () => {
 *   await search('workspace api', { collection: 'documentation', limit: 20 });
 * };
 * ```
 */
export function useRagQuery(): UseRagQueryReturn {
  const [results, setResults] = useState<RagQueryResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [performance, setPerformance] = useState<
    RagQueryResponse['performance'] | null
  >(null);
  const [cached, setCached] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Cancel ongoing request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setLoading(false);
    }
  }, []);

  /**
   * Clear results and error
   */
  const clear = useCallback(() => {
    setResults([]);
    setError(null);
    setPerformance(null);
    setCached(false);
  }, []);

  /**
   * Execute search query
   */
  const search = useCallback(
    async (query: string, options?: RagQueryOptions) => {
      // Cancel previous request
      cancel();

      // Validate query
      const trimmedQuery = query.trim();
      if (!trimmedQuery || trimmedQuery.length < 2) {
        setError('Query deve ter pelo menos 2 caracteres');
        return;
      }

      setLoading(true);
      setError(null);
      setCached(false);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        console.log('[RAG] Executing query:', trimmedQuery, options);

        const requestBody = {
          query: trimmedQuery,
          collection: options?.collection || DEFAULT_OPTIONS.collection,
          limit: options?.limit || DEFAULT_OPTIONS.limit,
          score_threshold:
            options?.scoreThreshold || DEFAULT_OPTIONS.scoreThreshold,
        };

        const response = await fetch(`${RAG_SERVICE_URL}/api/v1/rag/query`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(
            errorData?.error?.message || `Query failed: ${response.statusText}`,
          );
        }

        const data = await response.json();

        if (data.success) {
          const queryResponse: RagQueryResponse = data.data;

          setResults(queryResponse.results);
          setPerformance(queryResponse.performance);
          setCached(queryResponse.cached || false);

          console.log('[RAG] Query successful:', {
            resultsCount: queryResponse.totalResults,
            performance: queryResponse.performance,
            cached: queryResponse.cached,
          });
        } else {
          throw new Error(data.error?.message || 'Query failed');
        }
      } catch (err) {
        // Ignore AbortError (user-initiated cancellation)
        if (err instanceof Error && err.name === 'AbortError') {
          console.log('[RAG] Query cancelled by user');
          return;
        }

        const errorMessage =
          err instanceof Error ? err.message : 'Unknown error';
        console.error('[RAG] Query failed:', errorMessage);
        setError(errorMessage);
        setResults([]);
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [cancel],
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    results,
    loading,
    error,
    performance,
    cached,
    search,
    cancel,
    clear,
  };
}
