import type { Item } from '../components/pages/workspace/types/workspace.types';
import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl('library');

// Resolve workspace API endpoint ensuring it targets /api/items (or proxy-prefixed variant)
const itemsEndpoint = (suffix = '') => {
  const trimmedBase = API_BASE_URL.replace(/\/+$/, '');

  const withSuffix = (url: string) => `${url}${suffix}`;

  if (/(?:\/api)?\/items$/i.test(trimmedBase)) {
    return withSuffix(trimmedBase);
  }

  if (/\/ideas$/i.test(trimmedBase)) {
    return withSuffix(trimmedBase.replace(/\/ideas$/i, '/items'));
  }

  if (/\/api\/workspace$/i.test(trimmedBase) || /\/workspace$/i.test(trimmedBase)) {
    return withSuffix(`${trimmedBase}/items`);
  }

  if (/\/api$/i.test(trimmedBase)) {
    return withSuffix(`${trimmedBase}/items`);
  }

  return withSuffix(`${trimmedBase}/api/items`);
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: unknown[];
}

/**
 * Workspace Service
 * Handles all HTTP requests to the Workspace backend
 */
export const libraryService = {
  /**
   * Get all items
   */
  async getAllItems(): Promise<Item[]> {
    try {
      const response = await fetch(itemsEndpoint(), {
        headers: {
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result: ApiResponse<Item[]> = await response.json();
      return result.data || [];
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  },

  /**
   * Create a new item
   */
  async createItem(itemData: Omit<Item, 'id' | 'createdAt' | 'status'>): Promise<Item> {
    try {
      const response = await fetch(itemsEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<Item> = await response.json();
      if (!result.data) {
        throw new Error('No data returned from server');
      }
      return result.data;
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  },

  /**
   * Update an existing item
   */
  async updateItem(id: string, itemData: Partial<Omit<Item, 'id' | 'createdAt'>>): Promise<Item> {
    try {
      const response = await fetch(itemsEndpoint(`/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(itemData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result: ApiResponse<Item> = await response.json();
      if (!result.data) {
        throw new Error('No data returned from server');
      }
      return result.data;
    } catch (error) {
      console.error('Error updating item:', error);
      throw error;
    }
  },

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<void> {
    try {
      const response = await fetch(itemsEndpoint(`/${id}`), {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error deleting item:', error);
      throw error;
    }
  },
};
