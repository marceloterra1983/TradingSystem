import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collectionsService } from '../../services/collectionsService';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  EmbeddingModel,
} from '../../types/collections';

export interface RagStatusServiceInfo {
  ok: boolean;
  status: number;
  message: string;
  collection?: string;
}

export interface RagStatusResponse {
  timestamp: string;
  requestedCollection?: string;
  services: {
    query: RagStatusServiceInfo;
    ingestion: RagStatusServiceInfo;
    ollama: RagStatusServiceInfo;
    redis: RagStatusServiceInfo;
    collections: RagStatusServiceInfo;
  };
  qdrant: {
    collection: string;
    activeCollection?: string | null;
    ok: boolean;
    status: number;
    count: number | null;
  };
  collections?: Array<{
    name: string;
    count: number | null;
    aliasOf?: string | null;
    embeddingModel?: string | null;
  }>;
}

const queryKeys = {
  collections: ['rag', 'collections'] as const,
  models: ['rag', 'models'] as const,
  status: (collection?: string | null) =>
    ['rag', 'status', collection ?? 'all'] as const,
};

const normalizeError = (err: unknown): string | null => {
  if (!err) return null;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

const apiBase =
  (import.meta.env.VITE_API_BASE_URL || '').trim() || 'http://localhost:3402';

async function fetchStatus(
  collection?: string | null,
): Promise<RagStatusResponse | null> {
  const querySuffix = collection
    ? `?collection=${encodeURIComponent(collection)}`
    : '';
  const response = await fetch(`${apiBase}/api/v1/rag/status${querySuffix}`);
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(raw || `Request failed (${response.status})`);
  }
  if (!raw) {
    return null;
  }
  return JSON.parse(raw) as RagStatusResponse;
}

export interface UseRagManagerOptions {
  statusCollection?: string | null;
}

export function useRagManager(options: UseRagManagerOptions = {}) {
  const { statusCollection = null } = options;
  const queryClient = useQueryClient();

  const collectionsQuery = useQuery({
    queryKey: queryKeys.collections,
    queryFn: () => collectionsService.getCollections(),
    staleTime: 10_000,
  });

  const modelsQuery = useQuery({
    queryKey: queryKeys.models,
    queryFn: () => collectionsService.getModels(),
    staleTime: 60_000,
  });

  const statusQuery = useQuery({
    queryKey: queryKeys.status(statusCollection),
    queryFn: () => fetchStatus(statusCollection),
    refetchInterval: 15_000,
    staleTime: 10_000,
  });

  const createMutation = useMutation({
    mutationFn: (payload: CreateCollectionRequest) =>
      collectionsService.createCollection(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { name: string; updates: UpdateCollectionRequest }) =>
      collectionsService.updateCollection(input.name, input.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const cloneMutation = useMutation({
    mutationFn: (input: { name: string; newName: string }) =>
      collectionsService.cloneCollection(input.name, input.newName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (name: string) => collectionsService.deleteCollection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const ingestMutation = useMutation({
    mutationFn: (name: string) => collectionsService.ingestCollection(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const cleanOrphansMutation = useMutation({
    mutationFn: (name: string) => collectionsService.cleanOrphans(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    },
  });

  const refreshCollections = useCallback(() => {
    console.log('🔄 Forcing collections refetch...');
    collectionsQuery.refetch();
    modelsQuery.refetch();
    queryClient.invalidateQueries({ queryKey: queryKeys.collections });
    queryClient.invalidateQueries({ queryKey: queryKeys.models });
  }, [queryClient, collectionsQuery, modelsQuery]);

  const refreshStatus = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.status(statusCollection),
    });
  }, [queryClient, statusCollection]);

  return {
    collections: collectionsQuery.data ?? [],
    collectionsLoading: collectionsQuery.isLoading,
    collectionsError: normalizeError(collectionsQuery.error),
    models: modelsQuery.data ?? [],
    modelsLoading: modelsQuery.isLoading,
    modelsError: normalizeError(modelsQuery.error),
    status: statusQuery.data ?? null,
    statusLoading: statusQuery.isLoading,
    statusError: normalizeError(statusQuery.error),
    refreshCollections,
    refreshStatus,
    createCollection: createMutation.mutateAsync,
    updateCollection: updateMutation.mutateAsync,
    cloneCollection: cloneMutation.mutateAsync,
    deleteCollection: deleteMutation.mutateAsync,
    ingestCollection: ingestMutation.mutateAsync,
    cleanOrphans: cleanOrphansMutation.mutateAsync,
    resetCollectionsError: () =>
      queryClient.resetQueries({ queryKey: queryKeys.collections }),
    pendingOperation:
      createMutation.isPending ||
      updateMutation.isPending ||
      cloneMutation.isPending ||
      deleteMutation.isPending ||
      ingestMutation.isPending ||
      cleanOrphansMutation.isPending,
  };
}

export type RagCollection = Collection;
export type RagModel = EmbeddingModel;
