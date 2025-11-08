/**
 * Collections Service
 *
 * API client for RAG collections management
 * Handles CRUD operations and integrates with llamaIndexService
 *
 * @module services/collectionsService
 */

import type {
  Collection,
  CollectionsListResponse,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CollectionOperationResponse,
  DeleteCollectionResponse,
  EmbeddingModel,
  ModelsListResponse,
  HealthCheckResponse,
  ApiResponse,
} from "../types/collections";

/**
 * Collections Service class
 */
class CollectionsService {
  private baseUrl: string;

  constructor() {
    // In development, ALWAYS use Vite proxy (relative URLs)
    // In production, use environment variables or default to empty string (same origin)
    if (import.meta.env.DEV) {
      this.baseUrl = ""; // Use Vite proxy in development
      console.debug(
        "[collectionsService] Using Vite proxy (relative URLs) in development",
      );
    } else {
      const sanitize = (url: string | undefined | null): string | null => {
        if (!url) return null;
        const trimmed = url.trim();
        if (!trimmed) return null;
        return trimmed.replace(/\/+$/, "");
      };

      const directCollectionsUrl = sanitize(
        import.meta.env.VITE_RAG_COLLECTIONS_URL as string,
      );
      const unifiedApiUrl = sanitize(
        import.meta.env.VITE_API_BASE_URL as string,
      );
      const useUnifiedDomain =
        (import.meta.env.VITE_USE_UNIFIED_DOMAIN as string) === "true";

      if (directCollectionsUrl) {
        this.baseUrl = directCollectionsUrl;
      } else if (useUnifiedDomain && unifiedApiUrl) {
        this.baseUrl = unifiedApiUrl;
      } else {
        this.baseUrl = ""; // Same origin in production
      }

      console.debug(
        "[collectionsService] baseUrl resolved to",
        this.baseUrl || "(same origin)",
        directCollectionsUrl
          ? "(direct)"
          : useUnifiedDomain && unifiedApiUrl
            ? "(unified fallback)"
            : "(default)",
      );
    }
  }

  /**
   * Get all collections
   */
  async getCollections(useCache: boolean = false): Promise<Collection[]> {
    try {
      // Add timestamp and useCache parameter to bypass cache
      const timestamp = Date.now();
      const url = `${this.baseUrl}/api/v1/rag/collections?useCache=${useCache}&_t=${timestamp}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch collections: ${response.statusText}`);
      }

      const data: ApiResponse<CollectionsListResponse> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || "Failed to fetch collections");
      }

      return data.data.collections;
    } catch (error) {
      console.error("Error fetching collections:", error);
      throw error;
    }
  }

  /**
   * Get a single collection by name
   */
  async getCollection(name: string): Promise<Collection> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/collections/${name}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch collection: ${response.statusText}`);
      }

      const data: ApiResponse<Collection> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || "Failed to fetch collection");
      }

      return data.data;
    } catch (error) {
      console.error(`Error fetching collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Create a new collection
   */
  async createCollection(
    request: CreateCollectionRequest,
  ): Promise<Collection> {
    console.log("🚀 [collectionsService] createCollection called", {
      request,
      baseUrl: this.baseUrl,
      url: `${this.baseUrl}/api/v1/rag/collections`,
    });

    try {
      const startTime = Date.now();
      console.log("📤 Sending POST request...");

      const response = await fetch(`${this.baseUrl}/api/v1/rag/collections`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      const fetchDuration = Date.now() - startTime;
      console.log(
        `⏱️  Fetch completed in ${fetchDuration}ms, status: ${response.status}`,
      );

      if (!response.ok) {
        console.error(
          "❌ Response not OK:",
          response.status,
          response.statusText,
        );
        const errorData = await response.json();
        console.error("Error data:", errorData);
        throw new Error(
          errorData.error?.message ||
            `Failed to create collection: ${response.statusText}`,
        );
      }

      console.log("📥 Parsing response JSON...");
      const data: ApiResponse<CollectionOperationResponse> =
        await response.json();
      console.log("✅ Response parsed:", data);

      if (!data.success || !data.data?.collection) {
        console.error("❌ Invalid response structure:", data);
        throw new Error(data.error?.message || "Failed to create collection");
      }

      console.log(
        `✅ Collection created successfully: ${data.data.collection.name}`,
      );
      return data.data.collection;
    } catch (error) {
      console.error("❌ Error creating collection:", error);
      throw error;
    }
  }

  /**
   * Update an existing collection
   */
  async updateCollection(
    name: string,
    updates: UpdateCollectionRequest,
  ): Promise<Collection> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/collections/${name}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `Failed to update collection: ${response.statusText}`,
        );
      }

      const data: ApiResponse<CollectionOperationResponse> =
        await response.json();

      if (!data.success || !data.data?.collection) {
        throw new Error(data.error?.message || "Failed to update collection");
      }

      return data.data.collection;
    } catch (error) {
      console.error(`Error updating collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Delete a collection
   */
  async deleteCollection(name: string): Promise<DeleteCollectionResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/collections/${name}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `Failed to delete collection: ${response.statusText}`,
        );
      }

      const data: ApiResponse<DeleteCollectionResponse> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || "Failed to delete collection");
      }

      return data.data;
    } catch (error) {
      console.error(`Error deleting collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Clone a collection (create copy with new name)
   */
  async cloneCollection(name: string, newName: string): Promise<Collection> {
    try {
      // Get the original collection
      const original = await this.getCollection(name);

      // Create a new collection with the same configuration
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
        autoUpdate: original.autoUpdate,
      };

      return await this.createCollection(cloneRequest);
    } catch (error) {
      console.error(`Error cloning collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Trigger ingestion for a collection
   */
  async ingestCollection(name: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/collections/${name}/ingest`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `Failed to trigger ingestion: ${response.statusText}`,
        );
      }

      const data: ApiResponse<CollectionOperationResponse> =
        await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to trigger ingestion");
      }
    } catch (error) {
      console.error(`Error ingesting collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Clean orphaned vectors from a collection
   */
  async cleanOrphans(name: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/collections/${name}/clean-orphans`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error?.message ||
            `Failed to clean orphans: ${response.statusText}`,
        );
      }

      const data: ApiResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "Failed to clean orphans");
      }
    } catch (error) {
      console.error(`Error cleaning orphans for collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(name: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/collections/${name}/stats`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch collection stats: ${response.statusText}`,
        );
      }

      const data: ApiResponse = await response.json();

      if (!data.success || !data.data) {
        throw new Error(
          data.error?.message || "Failed to fetch collection stats",
        );
      }

      return data.data;
    } catch (error) {
      console.error(`Error fetching stats for collection ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get all available embedding models
   */
  async getModels(): Promise<EmbeddingModel[]> {
    console.log("🟡 [collectionsService] getModels() called");
    console.log("🟡 [collectionsService] baseUrl:", this.baseUrl);
    console.log(
      "🟡 [collectionsService] Full URL:",
      `${this.baseUrl}/api/v1/rag/models`,
    );

    try {
      const response = await fetch(`${this.baseUrl}/api/v1/rag/models`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("🟡 [collectionsService] Response status:", response.status);
      console.log(
        "🟡 [collectionsService] Response headers:",
        Object.fromEntries(response.headers.entries()),
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`);
      }

      const data: ApiResponse<ModelsListResponse> = await response.json();
      console.log("🟡 [collectionsService] Response data:", data);

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || "Failed to fetch models");
      }

      console.log(
        "🟡 [collectionsService] Models extracted:",
        data.data.models,
      );
      return data.data.models;
    } catch (error) {
      console.error("🔴 [collectionsService] Error fetching models:", error);
      throw error;
    }
  }

  /**
   * Get information about a specific model
   */
  async getModel(name: string): Promise<EmbeddingModel> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/models/${name}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch model: ${response.statusText}`);
      }

      const data: ApiResponse<EmbeddingModel> = await response.json();

      if (!data.success || !data.data) {
        throw new Error(data.error?.message || "Failed to fetch model");
      }

      return data.data;
    } catch (error) {
      console.error(`Error fetching model ${name}:`, error);
      throw error;
    }
  }

  /**
   * Validate if a model is available
   */
  async validateModel(name: string): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/rag/models/${name}/validate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        return false;
      }

      const data: ApiResponse = await response.json();
      return data.success && data.data?.validated === true;
    } catch (error) {
      console.error(`Error validating model ${name}:`, error);
      return false;
    }
  }

  /**
   * Health check for RAG services
   */
  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`);
      }

      const data: HealthCheckResponse = await response.json();
      return data;
    } catch (error) {
      console.error("Error checking RAG services health:", error);
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const collectionsService = new CollectionsService();
export default collectionsService;
