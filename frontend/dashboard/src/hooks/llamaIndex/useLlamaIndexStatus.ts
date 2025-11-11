/**
 * Custom Hook: useLlamaIndexStatus
 *
 * Manages the fetching and state of LlamaIndex/RAG system status including:
 * - Query service health
 * - Ingestion service health
 * - Qdrant vector store status
 * - Collection information
 * - Documentation statistics
 *
 * @module useLlamaIndexStatus
 */

import { useState, useCallback, useRef, useEffect } from "react";

/**
 * LlamaIndex service health status
 */
export interface LlamaIndexServiceStatus {
  ok: boolean;
  status: number;
  message: string;
  collection?: string;
}

/**
 * Collection information from Qdrant
 */
export interface LlamaIndexCollectionInfo {
  name: string;
  count: number | null;
  aliasOf?: string | null;
  embeddingModel?: string | null;
}

/**
 * Documentation statistics for a collection
 */
export interface LlamaIndexDocumentationStats {
  docsDirectory?: string;
  totalDocuments?: number;
  indexedDocuments?: number;
  indexedUniqueDocuments?: number;
  missingDocuments?: number;
  missingSample?: string[];
  indexedSample?: string[];
  indexedUniqueSample?: string[];
  error?: string;
  indexedScanTruncated?: boolean;
  collection?: string;
  allFilesList?: Array<{ path: string; size: number }>;
  orphanChunks?: number;
  orphanSample?: string[];
}

/**
 * Complete status response from the RAG API
 */
export interface LlamaIndexStatusResponse {
  timestamp: string;
  requestedCollection?: string;
  services: {
    query: LlamaIndexServiceStatus;
    ingestion: LlamaIndexServiceStatus;
  };
  qdrant: {
    collection: string;
    activeCollection?: string | null;
    ok: boolean;
    status: number;
    count: number | null;
    sample: string[];
  };
  collections?: LlamaIndexCollectionInfo[];
  gpuPolicy?: Record<string, unknown>;
  documentation?: LlamaIndexDocumentationStats;
}

/**
 * Hook options
 */
export interface UseLlamaIndexStatusOptions {
  /**
   * Initial collection to fetch status for
   */
  initialCollection?: string | null;

  /**
   * Auto-fetch on mount
   * @default true
   */
  autoFetch?: boolean;

  /**
   * Polling interval in milliseconds (0 = disabled)
   * @default 0
   */
  pollingInterval?: number;
}

/**
 * Hook return value
 */
export interface UseLlamaIndexStatusReturn {
  /**
   * Current status data from the API
   */
  statusData: LlamaIndexStatusResponse | null;

  /**
   * Loading state
   */
  statusLoading: boolean;

  /**
   * Error message if fetch failed
   */
  statusError: string | null;

  /**
   * Fetch status for a specific collection (or default if null)
   */
  fetchStatus: (
    targetCollection?: string | null,
    preserveMessage?: boolean,
  ) => Promise<void>;

  /**
   * Refresh current status (convenience wrapper around fetchStatus)
   */
  handleRefresh: () => void;

  /**
   * Currently selected collection
   */
  selectedCollection: string | null;

  /**
   * Actually loaded collection (may differ from selected due to fallback)
   */
  loadedCollection: string | null;
}

/**
 * Custom hook to manage LlamaIndex status fetching and state
 *
 * @param options - Configuration options
 * @returns Status data, loading state, error, and fetch functions
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { statusData, statusLoading, statusError, fetchStatus, handleRefresh } =
 *     useLlamaIndexStatus({ initialCollection: 'docs_index_mxbai' });
 *
 *   if (statusLoading) return <div>Loading...</div>;
 *   if (statusError) return <div>Error: {statusError}</div>;
 *
 *   return (
 *     <div>
 *       <pre>{JSON.stringify(statusData, null, 2)}</pre>
 *       <button onClick={handleRefresh}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useLlamaIndexStatus(
  options: UseLlamaIndexStatusOptions = {},
): UseLlamaIndexStatusReturn {
  const {
    initialCollection = null,
    autoFetch = true,
    pollingInterval = 0,
  } = options;

  // State management
  const [statusData, setStatusData] = useState<LlamaIndexStatusResponse | null>(
    null,
  );
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [selectedCollection, _setSelectedCollection] = useState<string | null>(
    initialCollection,
  );
  const [loadedCollection, setLoadedCollection] = useState<string | null>(null);

  // Note: Collection selection will be managed by useLlamaIndexCollections hook
  // This hook only tracks the initially selected collection for status fetching

  // Store initial collection in ref to avoid re-fetching on every render
  const initialSelectionRef = useRef<string | null>(initialCollection);

  /**
   * Fetch status from the API
   */
  const fetchStatus = useCallback(
    async (targetCollection: string | null = null, preserveMessage = false) => {
      setStatusLoading(true);
      setStatusError(null);
      if (!preserveMessage) {
        // Clear previous error if not preserving message state
      }

      try {
        const querySuffix = targetCollection
          ? `?collection=${encodeURIComponent(targetCollection)}`
          : "";

        const resp = await fetch(`/api/v1/rag/status${querySuffix}`);
        const raw = await resp.text();

        if (!resp.ok) {
          throw new Error(raw || `Request failed (${resp.status})`);
        }

        const json = raw ? (JSON.parse(raw) as LlamaIndexStatusResponse) : null;
        setStatusData(json);

        // Determine effective collection (may differ from requested due to fallback)
        const effectiveCollection =
          json?.requestedCollection ||
          json?.qdrant?.collection ||
          targetCollection ||
          null;
        setLoadedCollection(effectiveCollection);
      } catch (err: unknown) {
        const rawMessage =
          err instanceof Error
            ? err.message
            : "Falha ao carregar status do LlamaIndex";

        // Provide user-friendly error messages
        const is401Error =
          rawMessage.includes("401") ||
          rawMessage.toLowerCase().includes("unauthorized");
        const friendly = is401Error
          ? "A requisição foi rejeitada (401). Certifique-se de que o RAG Service (porta 3402) esteja em execução via docker-compose.4-4-rag-stack.yml ou configure um VITE_LLAMAINDEX_JWT para acesso direto."
          : rawMessage;

        const scopedMessage =
          targetCollection && !rawMessage.includes(targetCollection)
            ? `${friendly} (coleção: ${targetCollection})`
            : friendly;

        setStatusError(scopedMessage);
        setStatusData(null);
        setLoadedCollection(null);
      } finally {
        setStatusLoading(false);
      }
    },
    [],
  );

  /**
   * Refresh current status (convenience method)
   */
  const handleRefresh = useCallback(() => {
    fetchStatus(selectedCollection);
  }, [fetchStatus, selectedCollection]);

  // Auto-fetch on mount if enabled
  useEffect(() => {
    if (autoFetch) {
      fetchStatus(initialSelectionRef.current);
    }
  }, [autoFetch, fetchStatus]);

  // Polling support (optional)
  useEffect(() => {
    if (pollingInterval <= 0) return;

    const intervalId = setInterval(() => {
      fetchStatus(selectedCollection);
    }, pollingInterval);

    return () => clearInterval(intervalId);
  }, [pollingInterval, selectedCollection, fetchStatus]);

  return {
    statusData,
    statusLoading,
    statusError,
    fetchStatus,
    handleRefresh,
    selectedCollection,
    loadedCollection,
  };
}
