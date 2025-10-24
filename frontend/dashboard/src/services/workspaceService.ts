import axios from 'axios';
import type { Item, ItemCategory, ItemPriority, ItemStatus } from '../components/pages/workspace/types/workspace.types';

// Base URL for workspace API
const WORKSPACE_API_URL = '/api/workspace';

export interface CreateItemPayload {
  title: string;
  description: string;
  category: ItemCategory;
  priority: ItemPriority;
  tags?: string[];
}

export interface UpdateItemPayload {
  title?: string;
  description?: string;
  category?: ItemCategory;
  priority?: ItemPriority;
  status?: ItemStatus;
  tags?: string[];
}

class WorkspaceService {
  async getAllItems(): Promise<Item[]> {
    const response = await axios.get(`${WORKSPACE_API_URL}/items`);
    return response.data.data || [];
  }

  async createItem(payload: CreateItemPayload): Promise<Item> {
    const response = await axios.post(`${WORKSPACE_API_URL}/items`, payload);
    return response.data.data;
  }

  async updateItem(id: string, payload: UpdateItemPayload): Promise<Item> {
    const response = await axios.put(`${WORKSPACE_API_URL}/items/${id}`, payload);
    return response.data.data;
  }

  async deleteItem(id: string): Promise<void> {
    await axios.delete(`${WORKSPACE_API_URL}/items/${id}`);
  }
}

export const workspaceService = new WorkspaceService();

