/**
 * useCollections Hook
 *
 * Custom React hook for managing RAG collections
 * Rewritten to prevent infinite loops using refs
 *
 * @module hooks/llamaIndex/useCollections
 */

import { useState, useEffect, useRef } from 'react';
import { collectionsService } from '../../services/collectionsService';
import type {
  Collection,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  EmbeddingModel
} from '../../types/collections';

interface UseCollectionsState {
  collections: Collection[];
  models: EmbeddingModel[];
  isLoading: boolean;
  error: string | null;
  isRefreshing: boolean;
}

interface UseCollectionsReturn extends UseCollectionsState {
  refreshCollections: () => Promise<void>;
  refreshModels: () => Promise<void>;
  getCollection: (name: string) => Promise<Collection | null>;
  createCollection: (request: CreateCollectionRequest) => Promise<Collection>;
  updateCollection: (name: string, updates: UpdateCollectionRequest) => Promise<Collection>;
  deleteCollection: (name: string) => Promise<void>;
  cloneCollection: (name: string, newName: string) => Promise<Collection>;
  ingestCollection: (name: string) => Promise<void>;
  cleanOrphans: (name: string) => Promise<void>;
  clearError: () => void;
}

interface UseCollectionsOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
  loadModels?: boolean;
}

export function useCollections(options: UseCollectionsOptions = {}): UseCollectionsReturn {
  const {
    autoRefresh = false,
    refreshInterval = 15000,
    loadModels = true
  } = options;

  const [state, setState] = useState<UseCollectionsState>({
    collections: [],
    models: [],
    isLoading: true,
    error: null,
    isRefreshing: false
  });

  const mountedRef = useRef(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const initDoneRef = useRef(false);

  // Store functions in refs to prevent recreation
  const functionsRef = useRef({
    refreshCollections: async () => {
      try {
        setState(prev => ({ ...prev, isRefreshing: true, error: null }));
        console.log('🔄 Fetching collections with useCache=false...');
        const collections = await collectionsService.getCollections(false); // Force fresh data

        if (mountedRef.current) {
          setState(prev => ({
            ...prev,
            collections,
            isRefreshing: false,
            isLoading: false
          }));
          console.log('✓ Collections refreshed:', collections.length);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch collections';
        console.error('Error refreshing collections:', error);
        if (mountedRef.current) {
          setState(prev => ({ ...prev, error: errorMessage, isLoading: false, isRefreshing: false }));
        }
      }
    },

    refreshModels: async () => {
      if (!loadModels) {
        console.log('🔵 [useCollections] loadModels is false, skipping');
        return;
      }

      console.log('🔵 [useCollections] Fetching models...');
      try {
        const models = await collectionsService.getModels();
        console.log('🔵 [useCollections] Models fetched:', models);

        if (mountedRef.current) {
          setState(prev => ({ ...prev, models }));
          console.log('🔵 [useCollections] Models state updated');
        }
      } catch (error) {
        console.error('🔴 [useCollections] Error refreshing models:', error);
      }
    },

    getCollection: async (name: string): Promise<Collection | null> => {
      try {
        return await collectionsService.getCollection(name);
      } catch (error) {
        console.error(`Error fetching collection ${name}:`, error);
        return null;
      }
    },

    createCollection: async (request: CreateCollectionRequest): Promise<Collection> => {
      try {
        setState(prev => ({ ...prev, error: null }));
        const collection = await collectionsService.createCollection(request);
        await functionsRef.current.refreshCollections();
        return collection;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create collection';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },

    updateCollection: async (name: string, updates: UpdateCollectionRequest): Promise<Collection> => {
      try {
        setState(prev => ({ ...prev, error: null }));
        const collection = await collectionsService.updateCollection(name, updates);
        await functionsRef.current.refreshCollections();
        return collection;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to update collection';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },

    deleteCollection: async (name: string): Promise<void> => {
      try {
        setState(prev => ({ ...prev, error: null }));
        await collectionsService.deleteCollection(name);
        await functionsRef.current.refreshCollections();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to delete collection';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },

    cloneCollection: async (name: string, newName: string): Promise<Collection> => {
      try {
        setState(prev => ({ ...prev, error: null }));
        const original = await collectionsService.getCollection(name);

        if (!original) {
          throw new Error(`Collection '${name}' not found`);
        }

        const cloneRequest: CreateCollectionRequest = {
          name: newName,
          description: `${original.description} (cloned from ${name})`,
          directory: original.directory,
          embeddingModel: original.embeddingModel,
          chunkSize: original.chunkSize,
          chunkOverlap: original.chunkOverlap,
          fileTypes: original.fileTypes,
          recursive: original.recursive,
          enabled: original.enabled,
          autoUpdate: original.autoUpdate
        };

        const clonedCollection = await collectionsService.createCollection(cloneRequest);
        await functionsRef.current.refreshCollections();
        return clonedCollection;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to clone collection';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },

    ingestCollection: async (name: string): Promise<void> => {
      try {
        setState(prev => ({ ...prev, error: null }));
        await collectionsService.ingestCollection(name);
        setTimeout(() => functionsRef.current.refreshCollections(), 2000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to trigger ingestion';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },

    cleanOrphans: async (name: string): Promise<void> => {
      try {
        setState(prev => ({ ...prev, error: null }));
        await collectionsService.cleanOrphans(name);
        setTimeout(() => functionsRef.current.refreshCollections(), 1000);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to clean orphans';
        setState(prev => ({ ...prev, error: errorMessage }));
        throw error;
      }
    },

    clearError: () => {
      setState(prev => ({ ...prev, error: null }));
    }
  });

  // Initial load - ONLY ONCE
  useEffect(() => {
    if (initDoneRef.current) {
      console.log('🔵 [useCollections] Init already done, skipping');
      return;
    }

    console.log('🔵 [useCollections] Initial load starting...');
    initDoneRef.current = true;

    const init = async () => {
      await functionsRef.current.refreshCollections();
      await functionsRef.current.refreshModels();
    };

    init();
  }, []); // Empty deps - runs only once

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) {
      console.log('🔵 [useCollections] Auto-refresh disabled');
      return;
    }

    console.log('🔵 [useCollections] Setting up auto-refresh:', refreshInterval);
    intervalRef.current = setInterval(() => {
      console.log('🔵 [useCollections] Auto-refresh tick');
      functionsRef.current.refreshCollections();
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        console.log('🔵 [useCollections] Cleaning up auto-refresh');
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefresh, refreshInterval]); // Only these two deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🔵 [useCollections] Component unmounting');
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    collections: state.collections,
    models: state.models,
    isLoading: state.isLoading,
    error: state.error,
    isRefreshing: state.isRefreshing,
    refreshCollections: functionsRef.current.refreshCollections,
    refreshModels: functionsRef.current.refreshModels,
    getCollection: functionsRef.current.getCollection,
    createCollection: functionsRef.current.createCollection,
    updateCollection: functionsRef.current.updateCollection,
    deleteCollection: functionsRef.current.deleteCollection,
    cloneCollection: functionsRef.current.cloneCollection,
    ingestCollection: functionsRef.current.ingestCollection,
    cleanOrphans: functionsRef.current.cleanOrphans,
    clearError: functionsRef.current.clearError
  };
}

export default useCollections;
