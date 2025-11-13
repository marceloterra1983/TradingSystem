/**
 * Template: Service Client
 *
 * This template provides a standardized structure for creating new service clients
 * that comply with STD-020 (HTTP Client Standard).
 *
 * Related Documents:
 * - STD-020: HTTP Client Standard
 * - ADR-008: HTTP Client Standardization
 *
 * Usage:
 * 1. Copy this template to `frontend/dashboard/src/services/YOUR_SERVICE-client.ts`
 * 2. Replace ALL_CAPS placeholders with your actual values
 * 3. Implement your service methods
 * 4. Export singleton instance
 * 5. Add to health monitoring in `health-monitor.ts`
 *
 * Example:
 * SERVICE_NAME -> Workspace
 * BASE_URL_PATH -> /api/workspace
 * ENTITY -> WorkspaceItem
 */

import { HttpClient, OperationType } from '../lib/http-client';

/**
 * ENTITY interface
 *
 * Define your entity/DTO types here.
 * Follow TypeScript naming conventions (PascalCase for interfaces/types).
 */
export interface ENTITY {
  id: string;
  // Add your fields here
  createdAt: string;
  updatedAt: string;
}

/**
 * SERVICE_NAME Client
 *
 * Provides typed methods for interacting with the SERVICE_NAME API.
 *
 * Features:
 * - Automatic retry on transient failures
 * - Circuit breaker protection
 * - Request queuing (max 5 concurrent)
 * - Structured logging (development mode)
 * - Health check capability
 *
 * Example Usage:
 * ```typescript
 * import { SERVICE_NAMEClient } from '../services/SERVICE_NAME-client';
 *
 * const client = new SERVICE_NAMEClient();
 *
 * // Get all items
 * const items = await client.getItems();
 *
 * // Create new item
 * const newItem = await client.createItem({ title: 'Example' });
 * ```
 */
export class SERVICE_NAMEClient {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient({
      baseURL: 'http://localhost:9082BASE_URL_PATH', // ✅ Via Traefik API Gateway
      enableCircuitBreaker: true,
      enableRetry: true,
      enableLogging: import.meta.env.DEV, // Logs only in development
      maxConcurrentRequests: 5, // Adjust based on service capacity
    });
  }

  /**
   * Get all ENTITY items
   *
   * @returns Promise<ENTITY[]> - Array of ENTITY objects
   * @throws {Error} - User-friendly error message on failure
   *
   * @example
   * ```typescript
   * const items = await client.getItems();
   * console.log(items); // [{ id: '1', title: '...' }, ...]
   * ```
   */
  async getItems(): Promise<ENTITY[]> {
    return this.http.get<ENTITY[]>('/items', {
      operationType: OperationType.STANDARD_READ,
    });
  }

  /**
   * Get ENTITY by ID
   *
   * @param id - The unique identifier of the ENTITY
   * @returns Promise<ENTITY> - The ENTITY object
   * @throws {Error} - "Recurso não encontrado" if ID doesn't exist
   *
   * @example
   * ```typescript
   * const item = await client.getItemById('123');
   * console.log(item.title);
   * ```
   */
  async getItemById(id: string): Promise<ENTITY> {
    return this.http.get<ENTITY>(`/items/${id}`, {
      operationType: OperationType.QUICK_READ,
    });
  }

  /**
   * Create new ENTITY
   *
   * @param item - ENTITY data (without id, createdAt, updatedAt)
   * @returns Promise<ENTITY> - The created ENTITY with generated ID
   * @throws {Error} - Validation errors or server errors
   *
   * @example
   * ```typescript
   * const newItem = await client.createItem({
   *   title: 'New Item',
   *   content: 'Some content',
   * });
   * console.log(newItem.id); // Generated ID
   * ```
   */
  async createItem(
    item: Omit<ENTITY, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ENTITY> {
    return this.http.post<ENTITY>('/items', item, {
      operationType: OperationType.WRITE,
    });
  }

  /**
   * Update existing ENTITY
   *
   * @param id - The unique identifier of the ENTITY
   * @param item - Partial ENTITY data to update
   * @returns Promise<ENTITY> - The updated ENTITY
   * @throws {Error} - "Recurso não encontrado" if ID doesn't exist
   *
   * @example
   * ```typescript
   * const updated = await client.updateItem('123', {
   *   title: 'Updated Title',
   * });
   * ```
   */
  async updateItem(id: string, item: Partial<ENTITY>): Promise<ENTITY> {
    return this.http.put<ENTITY>(`/items/${id}`, item, {
      operationType: OperationType.WRITE,
    });
  }

  /**
   * Delete ENTITY by ID
   *
   * @param id - The unique identifier of the ENTITY
   * @returns Promise<void>
   * @throws {Error} - "Recurso não encontrado" if ID doesn't exist
   *
   * @example
   * ```typescript
   * await client.deleteItem('123');
   * // Item deleted successfully
   * ```
   */
  async deleteItem(id: string): Promise<void> {
    return this.http.delete(`/items/${id}`, {
      operationType: OperationType.WRITE,
    });
  }

  /**
   * Health check
   *
   * Verifies if the SERVICE_NAME API is accessible and responsive.
   *
   * @param url - Custom health check endpoint (default: /health)
   * @returns Promise<boolean> - true if healthy, false otherwise
   *
   * @example
   * ```typescript
   * const isHealthy = await client.healthCheck();
   * if (!isHealthy) {
   *   console.warn('SERVICE_NAME service is down!');
   * }
   * ```
   */
  async healthCheck(url: string = '/health'): Promise<boolean> {
    return this.http.healthCheck(url);
  }

  // ========================================================================
  // Add custom methods below
  // ========================================================================

  /**
   * Example: Custom search method
   *
   * @param query - Search query string
   * @returns Promise<ENTITY[]> - Matching items
   *
   * @example
   * ```typescript
   * const results = await client.search('example query');
   * ```
   */
  async search(query: string): Promise<ENTITY[]> {
    return this.http.get<ENTITY[]>('/search', {
      operationType: OperationType.STANDARD_READ,
      params: { q: query },
    });
  }

  /**
   * Example: Long-running operation
   *
   * Use OperationType.LONG_OPERATION for tasks that may take >30s.
   *
   * @returns Promise<{ success: boolean; data: any }>
   *
   * @example
   * ```typescript
   * const result = await client.syncData();
   * console.log(result.data.totalSynced);
   * ```
   */
  async syncData(): Promise<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(
      '/sync',
      {},
      {
        operationType: OperationType.LONG_OPERATION, // 2 minutes timeout
      }
    );
  }

  /**
   * Example: File upload
   *
   * Use OperationType.FILE_UPLOAD for large file transfers.
   *
   * @param file - File to upload
   * @returns Promise<{ url: string }>
   *
   * @example
   * ```typescript
   * const file = new File(['content'], 'file.txt');
   * const result = await client.uploadFile(file);
   * console.log(result.url);
   * ```
   */
  async uploadFile(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>('/upload', formData, {
      operationType: OperationType.FILE_UPLOAD, // 5 minutes timeout
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }
}

// ========================================================================
// Singleton Instance (recommended pattern)
// ========================================================================

/**
 * Singleton instance of SERVICE_NAMEClient
 *
 * Use this instance throughout your application to maintain
 * a single HTTP client instance with shared circuit breaker state.
 *
 * @example
 * ```typescript
 * import { SERVICE_NAMEClient } from './services/SERVICE_NAME-client';
 *
 * const items = await SERVICE_NAMEClient.getItems();
 * ```
 */
export const SERVICE_NAMEClient = new SERVICE_NAMEClient();

// ========================================================================
// Type Guards (optional but recommended)
// ========================================================================

/**
 * Type guard to check if object is a valid ENTITY
 *
 * @param obj - Object to validate
 * @returns boolean - true if valid ENTITY
 *
 * @example
 * ```typescript
 * if (isENTITY(data)) {
 *   console.log(data.id); // TypeScript knows this is safe
 * }
 * ```
 */
export function isENTITY(obj: any): obj is ENTITY {
  return (
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.createdAt === 'string' &&
    typeof obj.updatedAt === 'string'
    // Add additional field checks as needed
  );
}

// ========================================================================
// Next Steps After Creating Service Client
// ========================================================================

/**
 * 1. Add to Health Monitor
 *
 * Update `frontend/dashboard/src/lib/health-monitor.ts`:
 *
 * ```typescript
 * import { SERVICE_NAMEClient } from '../services/SERVICE_NAME-client';
 *
 * const checks = [
 *   // ... existing checks
 *   { name: 'SERVICE_NAME', client: SERVICE_NAMEClient },
 * ];
 * ```
 *
 * 2. Write Unit Tests
 *
 * Create `frontend/dashboard/src/services/__tests__/SERVICE_NAME-client.test.ts`:
 *
 * ```typescript
 * import { describe, it, expect } from 'vitest';
 * import { SERVICE_NAMEClient } from '../SERVICE_NAME-client';
 *
 * describe('SERVICE_NAMEClient', () => {
 *   it('should get items', async () => {
 *     // Test implementation
 *   });
 * });
 * ```
 *
 * 3. Update Documentation
 *
 * Add usage examples to `docs/content/frontend/engineering/http-client-implementation-guide.mdx`
 *
 * 4. Validate Compliance
 *
 * Run validation script:
 * ```bash
 * bash scripts/governance/validate-http-client-standard.sh
 * ```
 */
