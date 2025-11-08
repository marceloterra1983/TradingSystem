/**
 * Categories Service - Workspace Categories CRUD
 *
 * Manages workspace categories through REST API
 */

// Extract base URL from VITE_WORKSPACE_API_URL (remove /items if present)
const getBaseApiUrl = () => {
  const workspaceUrl =
    import.meta.env.VITE_WORKSPACE_API_URL || "http://localhost:3200/api"; // FIXED: LowDB Stack (WSL2 networking workaround)
  // Remove /items from the end if present
  return workspaceUrl.replace(/\/items$/, "");
};

const WORKSPACE_API_URL = getBaseApiUrl();

console.warn("[CategoriesService] WORKSPACE_API_URL:", WORKSPACE_API_URL);

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface CreateCategoryDTO {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  display_order?: number;
  is_active?: boolean;
  created_by?: string;
}

export interface UpdateCategoryDTO {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  display_order?: number;
  is_active?: boolean;
}

export interface CategoryResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
  errors?: Array<{ msg: string; param: string }>;
}

class CategoriesService {
  private baseUrl: string;

  constructor() {
    // Use relative path to leverage Vite proxy (same fix as LibraryService)
    // Browser → /api/workspace/categories → Vite Proxy → workspace-api:3200/api/categories
    this.baseUrl = "/api/workspace/categories";

    console.warn(
      "[CategoriesService] Using relative path (Vite proxy):",
      this.baseUrl,
    );
  }

  /**
   * Get all categories
   */
  async getCategories(params?: {
    active_only?: boolean;
    order_by?: "display_order" | "name" | "created_at" | "updated_at";
  }): Promise<Category[]> {
    const queryParams = new URLSearchParams();

    if (params?.active_only !== undefined) {
      queryParams.append("active_only", params.active_only.toString());
    }
    if (params?.order_by) {
      queryParams.append("order_by", params.order_by);
    }

    const url = queryParams.toString()
      ? `${this.baseUrl}?${queryParams.toString()}`
      : this.baseUrl;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch categories");
    }

    const result: CategoryResponse<Category[]> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to fetch categories");
    }

    return result.data;
  }

  /**
   * Get single category by ID
   */
  async getCategory(id: string): Promise<Category> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch category");
    }

    const result: CategoryResponse<Category> = await response.json();

    if (!result.success || !result.data) {
      throw new Error(result.error || "Failed to fetch category");
    }

    return result.data;
  }

  /**
   * Create new category
   */
  async createCategory(data: CreateCategoryDTO): Promise<Category> {
    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result: CategoryResponse<Category> = await response.json();

    if (!response.ok || !result.success) {
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.msg).join(", ");
        throw new Error(errorMessages);
      }
      throw new Error(
        result.error || result.message || "Failed to create category",
      );
    }

    if (!result.data) {
      throw new Error("No data returned from server");
    }

    return result.data;
  }

  /**
   * Update existing category
   */
  async updateCategory(id: string, data: UpdateCategoryDTO): Promise<Category> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result: CategoryResponse<Category> = await response.json();

    if (!response.ok || !result.success) {
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((e) => e.msg).join(", ");
        throw new Error(errorMessages);
      }
      throw new Error(
        result.error || result.message || "Failed to update category",
      );
    }

    if (!result.data) {
      throw new Error("No data returned from server");
    }

    return result.data;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result: CategoryResponse<void> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || result.message || "Failed to delete category",
      );
    }
  }

  /**
   * Toggle category active status
   */
  async toggleCategory(id: string): Promise<Category> {
    const response = await fetch(`${this.baseUrl}/${id}/toggle`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result: CategoryResponse<Category> = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.error || result.message || "Failed to toggle category",
      );
    }

    if (!result.data) {
      throw new Error("No data returned from server");
    }

    return result.data;
  }
}

export const categoriesService = new CategoriesService();
