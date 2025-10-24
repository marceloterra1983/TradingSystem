import axios, { AxiosInstance, AxiosError } from 'axios';

// Types matching backend API
export interface WorkspaceItem {
  id: string;
  title: string;
  description: string;
  category: WorkspaceCategory;
  priority: WorkspacePriority;
  status: WorkspaceStatus;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
}

export type WorkspaceCategory =
  | 'documentacao'
  | 'coleta-dados'
  | 'banco-dados'
  | 'analise-dados'
  | 'gestao-riscos'
  | 'dashboard';

export type WorkspacePriority = 'low' | 'medium' | 'high' | 'critical';

export type WorkspaceStatus = 'new' | 'review' | 'in-progress' | 'completed' | 'rejected';

export interface CreateWorkspaceItemPayload {
  title: string;
  description: string;
  category: WorkspaceCategory;
  priority: WorkspacePriority;
  tags?: string[];
}

export interface UpdateWorkspaceItemPayload {
  title?: string;
  description?: string;
  category?: WorkspaceCategory;
  priority?: WorkspacePriority;
  status?: WorkspaceStatus;
  tags?: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  message?: string;
  error?: string;
  errors?: Array<{
    msg: string;
    param: string;
    location: string;
  }>;
}

class WorkspaceApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: '/api/workspace',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 15000,
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[WorkspaceAPI] Request failed:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get all workspace items
   */
  async getAllItems(): Promise<ApiResponse<WorkspaceItem[]>> {
    const response = await this.client.get<ApiResponse<WorkspaceItem[]>>('/items');
    return response.data;
  }

  /**
   * Get workspace item by ID
   */
  async getItemById(id: string): Promise<ApiResponse<WorkspaceItem>> {
    const response = await this.client.get<ApiResponse<WorkspaceItem>>(`/items/${id}`);
    return response.data;
  }

  /**
   * Create new workspace item
   */
  async createItem(payload: CreateWorkspaceItemPayload): Promise<ApiResponse<WorkspaceItem>> {
    const response = await this.client.post<ApiResponse<WorkspaceItem>>('/items', payload);
    return response.data;
  }

  /**
   * Update workspace item
   */
  async updateItem(id: string, payload: UpdateWorkspaceItemPayload): Promise<ApiResponse<WorkspaceItem>> {
    const response = await this.client.put<ApiResponse<WorkspaceItem>>(`/items/${id}`, payload);
    return response.data;
  }

  /**
   * Delete workspace item
   */
  async deleteItem(id: string): Promise<ApiResponse<WorkspaceItem>> {
    const response = await this.client.delete<ApiResponse<WorkspaceItem>>(`/items/${id}`);
    return response.data;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; service: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }
}

// Export singleton instance
export const workspaceApi = new WorkspaceApiService();

// Export class for testing
export default WorkspaceApiService;

