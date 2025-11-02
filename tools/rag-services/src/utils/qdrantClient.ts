/**
 * Qdrant Client Helper
 * 
 * Provides utilities for interacting with Qdrant vector database
 * Used by File Watcher for automatic chunk cleanup on file deletion
 * 
 * @module utils/qdrantClient
 */

import axios, { AxiosInstance } from 'axios';
import { logger } from './logger';

/**
 * Qdrant Point structure
 */
export interface QdrantPoint {
  id: string | number;
  payload?: {
    file_path?: string;
    path?: string;
    [key: string]: any;
  };
  vector?: number[];
}

/**
 * Scroll response from Qdrant
 */
export interface QdrantScrollResponse {
  result: {
    points: QdrantPoint[];
    next_page_offset?: string | null;
  };
}

/**
 * Qdrant Client class
 */
export class QdrantClient {
  private client: AxiosInstance;
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = (baseUrl || process.env.QDRANT_URL || 'http://localhost:6333').replace(/\/+$/, '');
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Normalize file path to match Qdrant metadata format
   * 
   * Handles various path formats:
   * - /data/docs/content/api/workspace.mdx → content/api/workspace.mdx
   * - /home/user/docs/content/api/workspace.mdx → content/api/workspace.mdx
   * - content/api/workspace.mdx → content/api/workspace.mdx
   */
  private normalizePath(filePath: string): string {
    let normalized = filePath.replace(/\\/g, '/');

    // Remove /data/docs/ prefix if present
    if (normalized.includes('/data/docs/')) {
      const idx = normalized.lastIndexOf('/data/docs/');
      normalized = normalized.slice(idx + '/data/docs/'.length);
    }
    // Remove any absolute path up to /docs/content/
    else if (normalized.includes('/docs/content/')) {
      const idx = normalized.lastIndexOf('/docs/content/');
      normalized = normalized.slice(idx + '/docs/content/'.length);
    }
    // Remove leading slash if present
    else if (normalized.startsWith('/')) {
      normalized = normalized.slice(1);
    }

    return normalized;
  }

  /**
   * Find all chunks (points) for a given file path
   * 
   * @param collection - Collection name
   * @param filePath - File path to search for
   * @returns Array of point IDs matching the file path
   */
  async findChunksByFilePath(collection: string, filePath: string): Promise<(string | number)[]> {
    const normalizedPath = this.normalizePath(filePath);
    const pointIds: (string | number)[] = [];

    try {
      // Scroll through all points (since we need to check payload)
      let offset: string | null = null;
      let iterations = 0;
      const maxIterations = 100; // Safety limit

      do {
        const payload: any = {
          limit: 1000,
          with_payload: true,
          with_vector: false,
        };

        if (offset) {
          payload.offset = offset;
        }

        const response = await this.client.post<QdrantScrollResponse>(
          `/collections/${encodeURIComponent(collection)}/points/scroll`,
          payload
        );

        if (response.data?.result?.points) {
          for (const point of response.data.result.points) {
            const pointPath = point.payload?.file_path || point.payload?.path || '';
            const normalizedPointPath = this.normalizePath(pointPath);

            if (normalizedPointPath === normalizedPath) {
              pointIds.push(point.id);
            }
          }
        }

        offset = response.data?.result?.next_page_offset || null;
        iterations++;

        // Safety check
        if (iterations >= maxIterations) {
          logger.warn('Max iterations reached while scrolling Qdrant', {
            collection,
            iterations,
          });
          break;
        }
      } while (offset);

      return pointIds;
    } catch (error) {
      logger.error('Failed to find chunks by file path', {
        collection,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete points from a collection
   * 
   * @param collection - Collection name
   * @param pointIds - Array of point IDs to delete
   * @returns Success status
   */
  async deletePoints(collection: string, pointIds: (string | number)[]): Promise<boolean> {
    if (pointIds.length === 0) {
      return false;
    }

    try {
      const response = await this.client.post(
        `/collections/${encodeURIComponent(collection)}/points/delete`,
        {
          points: pointIds,
        }
      );

      const success = response.status === 200 && response.data?.status === 'ok';

      if (!success) {
        logger.error('Failed to delete points from Qdrant', {
          collection,
          pointCount: pointIds.length,
          status: response.status,
        });
      }

      return success;
    } catch (error) {
      logger.error('Error deleting points from Qdrant', {
        collection,
        pointCount: pointIds.length,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete all chunks associated with a file
   * 
   * Convenience method that combines findChunksByFilePath and deletePoints
   * 
   * @param collection - Collection name
   * @param filePath - File path whose chunks should be deleted
   * @returns Number of chunks deleted
   */
  async deleteFileChunks(collection: string, filePath: string): Promise<number> {
    try {
      // Find all chunks for this file
      const pointIds = await this.findChunksByFilePath(collection, filePath);

      if (pointIds.length === 0) {
        return 0;
      }

      // Delete the chunks
      const success = await this.deletePoints(collection, pointIds);

      return success ? pointIds.length : 0;
    } catch (error) {
      logger.error('Failed to delete file chunks', {
        collection,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return 0;
    }
  }

  /**
   * Health check - verify Qdrant is accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/');
      return response.status === 200;
    } catch (error) {
      logger.error('Qdrant health check failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const qdrantClient = new QdrantClient();

