import create from 'zustand';
import { useEffect } from 'react';
import { libraryService } from '../../../../services/libraryService';
import type { Item, ItemFormWithStatus } from '../types/workspace.types';

interface WorkspaceState {
  items: Item[];
  loading: boolean;
  error: Error | null;
  lastSyncedAt: string | null;
  loadItems: (options?: { force?: boolean }) => Promise<void>;
  createItem: (formData: Omit<Item, 'id' | 'createdAt' | 'status'>) => Promise<Item>;
  updateItem: (id: string, formData: Partial<ItemFormWithStatus>) => Promise<Item>;
  deleteItem: (id: string) => Promise<void>;
}

const normalizeTags = (tags?: unknown): string[] | undefined => {
  if (Array.isArray(tags)) {
    return tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0);
  }
  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);
  }
  return undefined;
};

let ongoingLoad: Promise<void> | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  items: [],
  loading: false,
  error: null,
  lastSyncedAt: null,
  loadItems: async ({ force } = {}) => {
    if (ongoingLoad && !force) {
      return ongoingLoad;
    }

    set({ loading: true, error: null });

    const request = (async () => {
      try {
        const data = await libraryService.getAllItems();
        set({
          items: data,
          loading: false,
          error: null,
          lastSyncedAt: new Date().toISOString(),
        });
      } catch (err) {
        set({ error: err as Error, loading: false });
        console.error('Error loading items:', err);
        throw err;
      } finally {
        ongoingLoad = null;
      }
    })();

    ongoingLoad = request;
    return request;
  },
  createItem: async (formData) => {
    if (get().loading && ongoingLoad) {
      await ongoingLoad.catch(() => undefined);
    }

    try {
      const created = await libraryService.createItem(formData);
      set((state) => ({
        items: [created, ...state.items.filter((item) => item.id !== created.id)],
        error: null,
        lastSyncedAt: new Date().toISOString(),
      }));
      return created;
    } catch (err) {
      set({ error: err as Error });
      throw err;
    }
  },
  updateItem: async (id, formData) => {
    const { tags, ...restOfFormData } = formData;

    const updatePayload: Partial<Omit<Item, 'id' | 'createdAt'>> = {
      ...restOfFormData,
      tags: normalizeTags(tags),
    };

    if (get().loading && ongoingLoad) {
      await ongoingLoad.catch(() => undefined);
    }

    try {
      const updated = await libraryService.updateItem(id, updatePayload);
      set((state) => ({
        items: state.items.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        error: null,
        lastSyncedAt: new Date().toISOString(),
      }));
      return updated;
    } catch (err) {
      set({ error: err as Error });
      throw err;
    }
  },
  deleteItem: async (id) => {
    if (get().loading && ongoingLoad) {
      await ongoingLoad.catch(() => undefined);
    }

    try {
      await libraryService.deleteItem(id);
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
        error: null,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (err) {
      set({ error: err as Error });
      throw err;
    }
  },
}));

/**
 * Hook to initialize the workspace store and set up event listeners.
 * This should be called once in the main WorkspacePage component.
 * Includes automatic polling every 15 seconds for real-time updates.
 */
export function useInitializeWorkspaceEvents() {
  const loadItems = useWorkspaceStore((state) => state.loadItems);

  useEffect(() => {
    // Initial load
    void loadItems().catch(() => undefined);

    // Set up automatic polling every 15 seconds
    const intervalId = setInterval(() => {
      void loadItems({ force: true }).catch(() => undefined);
    }, 15000); // 15 seconds

    // Cleanup interval on unmount
    return () => clearInterval(intervalId);
  }, [loadItems]);
}
