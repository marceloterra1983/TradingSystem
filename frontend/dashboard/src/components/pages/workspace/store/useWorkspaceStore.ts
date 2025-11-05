import create from 'zustand';
import { useEffect } from 'react';
import { libraryService } from '../../../../services/libraryService';
import type { Item, ItemFormWithStatus } from '../types/workspace.types';

const areItemsEqual = (previous: Item[], next: Item[]): boolean => {
  if (previous.length !== next.length) {
    return false;
  }

  const previousById = new Map(previous.map((item) => [item.id, item]));

  for (const nextItem of next) {
    const previousItem = previousById.get(nextItem.id);
    if (!previousItem) {
      return false;
    }

    if (
      previousItem.title !== nextItem.title ||
      previousItem.description !== nextItem.description ||
      previousItem.category !== nextItem.category ||
      previousItem.priority !== nextItem.priority ||
      previousItem.status !== nextItem.status ||
      previousItem.createdAt !== nextItem.createdAt
    ) {
      return false;
    }

    if (previousItem.tags.length !== nextItem.tags.length) {
      return false;
    }

    for (let index = 0; index < previousItem.tags.length; index++) {
      if (previousItem.tags[index] !== nextItem.tags[index]) {
        return false;
      }
    }
  }

  return true;
};

interface WorkspaceState {
  items: Item[];
  loading: boolean;
  syncing: boolean;
  error: Error | null;
  lastSyncedAt: string | null;
  loadItems: (options?: { force?: boolean }) => Promise<void>;
  createItem: (
    formData: Omit<Item, 'id' | 'createdAt' | 'status'>,
  ) => Promise<Item>;
  updateItem: (
    id: string,
    formData: Partial<ItemFormWithStatus>,
  ) => Promise<Item>;
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

// Quick Win B5: Cleanup - ongoingLoad pattern (keeping for now, marked for review)
let ongoingLoad: Promise<void> | null = null;

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  items: [],
  loading: false,
  syncing: false,
  error: null,
  lastSyncedAt: null,
  loadItems: async ({ force } = {}) => {
    if (ongoingLoad && !force) {
      return ongoingLoad;
    }

    const hasExistingItems = get().items.length > 0;
    set({
      loading: hasExistingItems ? false : true,
      syncing: hasExistingItems,
      error: null,
    });

    const request = (async () => {
      try {
        const data = await libraryService.getAllItems();
        
        // Filter out items without valid IDs (safety check for React keys)
        const validItems = data.filter(item => item.id && item.id !== null);
        
        if (validItems.length < data.length) {
          console.warn(`[WorkspaceStore] Filtered ${data.length - validItems.length} items without IDs`);
        }
        
        set((state) => {
          const itemsChanged = !areItemsEqual(state.items, validItems);
          return {
            items: itemsChanged ? validItems : state.items,
            loading: false,
            syncing: false,
            error: null,
            lastSyncedAt: new Date().toISOString(),
          };
        });
      } catch (err) {
        set((state) => ({
          error: err as Error,
          loading: state.items.length === 0 ? false : state.loading,
          syncing: false,
        }));
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
        items: [
          created,
          ...state.items.filter((item) => item.id !== created.id),
        ],
        error: null,
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
      return created;
    } catch (err) {
      set({ error: err as Error, syncing: false });
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
        items: state.items.map((item) =>
          item.id === updated.id ? { ...item, ...updated } : item,
        ),
        error: null,
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
      return updated;
    } catch (err) {
      set({ error: err as Error, syncing: false });
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
        syncing: false,
        lastSyncedAt: new Date().toISOString(),
      }));
    } catch (err) {
      set({ error: err as Error, syncing: false });
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

    // Polling temporarily disabled to prevent UI flicker.
    return undefined;
  }, [loadItems]);
}
