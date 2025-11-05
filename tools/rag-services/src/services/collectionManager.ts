/**
 * Collection Manager Service
 *
 * Manages multiple RAG collections based on configured directories
 * Handles collection creation, updates, and directory mappings
 *
 * @module services/collectionManager
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { logger } from '../utils/logger';
import { getCacheService } from './cacheService';

/**
 * Collection configuration structure
 */
export interface CollectionConfig {
  name: string;
  description: string;
  directory: string;
  embeddingModel: 'nomic-embed-text' | 'mxbai-embed-large' | 'embeddinggemma';
  chunkSize: number;
  chunkOverlap: number;
  fileTypes: string[];
  recursive: boolean;
  enabled: boolean;
  autoUpdate: boolean;
}

/**
 * Collections configuration file structure
 */
export interface CollectionsConfigFile {
  collections: CollectionConfig[];
  defaults: Partial<CollectionConfig>;
}

export interface CollectionMetrics {
  totalFiles: number;
  indexedFiles: number;
  pendingFiles: number;
  orphanChunks: number;
  chunkCount: number;
  directorySizeBytes?: number;
  directorySizeMB?: number;
}

/**
 * Collection Manager class
 */
export class CollectionManager {
  private configPath: string;
  private collections: Map<string, CollectionConfig> = new Map();
  private qdrantUrl: string;

  constructor(configPath?: string) {
    this.configPath = configPath || process.env.COLLECTIONS_CONFIG_PATH || '/app/collections-config.json';
    this.qdrantUrl = process.env.QDRANT_URL || 'http://data-qdrant:6333';
  }

  /**
   * Initialize collection manager
   * Loads configuration and validates collections
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing Collection Manager', { configPath: this.configPath });

      // Load configuration file
      const config = await this.loadConfig();

      // Validate and register collections (skip persist during init)
      for (const collectionConfig of config.collections) {
        if (collectionConfig.enabled) {
          await this.registerCollection(collectionConfig, true); // skipPersist=true
        }
      }

      logger.info('Collection Manager initialized', {
        totalCollections: this.collections.size,
        enabledCollections: config.collections.filter(c => c.enabled).length,
      });
    } catch (error) {
      logger.error('Failed to initialize Collection Manager', {
        error: error instanceof Error ? error.message : 'Unknown error',
        configPath: this.configPath,
      });
      throw error;
    }
  }

  /**
   * Load collections configuration from JSON file
   */
  private async loadConfig(): Promise<CollectionsConfigFile> {
    try {
      const configData = await fs.readFile(this.configPath, 'utf-8');
      const config: CollectionsConfigFile = JSON.parse(configData);

      // Validate structure
      if (!config.collections || !Array.isArray(config.collections)) {
        throw new Error('Invalid configuration: collections must be an array');
      }

      // Apply defaults to collections
      const collectionsWithDefaults = config.collections.map(c => ({
        ...config.defaults,
        ...c,
      }));

      return {
        collections: collectionsWithDefaults as CollectionConfig[],
        defaults: config.defaults,
      };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn('Collections config file not found, using empty configuration', {
          configPath: this.configPath,
        });
        return { collections: [], defaults: {} };
      }
      throw error;
    }
  }

  /**
   * Register a collection (now public for use by routes)
   */
  async registerCollection(config: CollectionConfig, skipPersist = false): Promise<void> {
    try {
      // Validate directory exists and is accessible
      await this.validateDirectory(config.directory);

      // Check if collection exists in Qdrant
      const exists = await this.collectionExists(config.name);

      if (!exists) {
        logger.info('Collection does not exist in Qdrant, will be created on first ingestion', {
          collection: config.name,
        });
      }

      // Register in memory
      this.collections.set(config.name, config);

      // PERSIST TO FILE to survive container restarts (skip during initialization)
      if (!skipPersist) {
        try {
          await this.saveConfig();
          logger.info('Collection registered and persisted', {
            collection: config.name,
            directory: config.directory,
            autoUpdate: config.autoUpdate,
          });
        } catch (saveError) {
          logger.warn('Collection registered but NOT persisted (file system may be read-only)', {
            collection: config.name,
            directory: config.directory,
            error: saveError instanceof Error ? saveError.message : 'Unknown error',
          });
        }
      } else {
        logger.info('Collection registered (in-memory only)', {
          collection: config.name,
          directory: config.directory,
        });
      }
    } catch (error) {
      logger.error('Failed to register collection', {
        collection: config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Save current collections to configuration file
   */
  private async saveConfig(): Promise<void> {
    try {
      // Use in-memory collections as source of truth (do NOT reload from file)
      const collections = Array.from(this.collections.values());
      
      const updatedConfig: CollectionsConfigFile = {
        collections,
        defaults: {
          chunkSize: 512,
          chunkOverlap: 50,
          fileTypes: ['md', 'mdx', 'txt'],
          embeddingModel: 'mxbai-embed-large',
          autoUpdate: false,
        },
      };

      await fs.writeFile(
        this.configPath,
        JSON.stringify(updatedConfig, null, 2),
        'utf-8',
      );

      logger.info('Collections configuration saved', {
        configPath: this.configPath,
        collectionsCount: collections.length,
      });
    } catch (error) {
      logger.error('Failed to save collections configuration', {
        configPath: this.configPath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Validate that directory exists and is readable
   */
  private async validateDirectory(directory: string): Promise<void> {
    try {
      const stats = await fs.stat(directory);

      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${directory}`);
      }

      // Try to read directory
      await fs.readdir(directory);
    } catch (error) {
      throw new Error(`Directory validation failed: ${directory} - ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if collection exists in Qdrant
   */
  private async collectionExists(collectionName: string): Promise<boolean> {
    try {
      const response = await axios.get(`${this.qdrantUrl}/collections/${collectionName}`);
      return response.status === 200;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return false;
      }
      // Log but don't fail - collection might be created later
      logger.warn('Error checking collection existence', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return false;
    }
  }

  /**
   * Get all registered collections
   */
  getCollections(): CollectionConfig[] {
    return Array.from(this.collections.values());
  }

  /**
   * Get collection by name
   */
  getCollection(name: string): CollectionConfig | undefined {
    return this.collections.get(name);
  }

  /**
   * Get collections with auto-update enabled
   */
  getAutoUpdateCollections(): CollectionConfig[] {
    return Array.from(this.collections.values()).filter(c => c.autoUpdate);
  }

  /**
   * Get collection by directory path
   */
  getCollectionByDirectory(directory: string): CollectionConfig | undefined {
    const normalizedPath = path.normalize(directory);
    return Array.from(this.collections.values()).find(c => {
      const collectionPath = path.normalize(c.directory);
      return normalizedPath === collectionPath || normalizedPath.startsWith(collectionPath + path.sep);
    });
  }

  /**
   * Create a new collection in Qdrant
   */
  async createCollection(config: CollectionConfig): Promise<void> {
    try {
      logger.info('Creating collection in Qdrant', {
        collection: config.name,
        embeddingModel: config.embeddingModel,
      });

      // Determine vector dimension based on model
      const vectorSize = 
        config.embeddingModel === 'mxbai-embed-large' ? 1024 :
        config.embeddingModel === 'embeddinggemma' ? 768 :
        768; // nomic-embed-text and others default to 768

      // Create collection via Qdrant API
      await axios.put(`${this.qdrantUrl}/collections/${config.name}`, {
        vectors: {
          size: vectorSize,
          distance: 'Cosine',
        },
      });

      logger.info('Collection created successfully', {
        collection: config.name,
        vectorSize,
      });
    } catch (error) {
      logger.error('Failed to create collection', {
        collection: config.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Delete a collection from Qdrant
   */
  async deleteCollection(collectionName: string): Promise<void> {
    try {
      logger.info('Deleting collection from Qdrant', { collection: collectionName });

      await axios.delete(`${this.qdrantUrl}/collections/${collectionName}`);

      // Remove from memory
      this.collections.delete(collectionName);

      // PERSIST TO FILE to survive container restarts
      try {
        await this.saveConfig();
        logger.info('Collection deleted and persisted', { collection: collectionName });
      } catch (saveError) {
        logger.warn('Collection deleted but NOT persisted (file system may be read-only)', {
          collection: collectionName,
          error: saveError instanceof Error ? saveError.message : 'Unknown error',
        });
      }
    } catch (error) {
      logger.error('Failed to delete collection', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get collection statistics
   */
  async getCollectionStats(collectionName: string, useCache = true): Promise<any> {
    const collection = this.getCollection(collectionName);
    if (!collection) {
      throw new Error(`Collection not found: ${collectionName}`);
    }

    // Try cache first
    const cacheService = getCacheService();
    const cacheKey = `stats:${collectionName}`;

    if (useCache && cacheService.isAvailable()) {
      const cached = await cacheService.get(cacheKey);
      if (cached) {
        logger.debug('Returning cached collection stats', { collection: collectionName });
        return cached;
      }
    }

    // Fetch fresh data
    let qdrantStats: any = null;
    try {
      const response = await axios.get(`${this.qdrantUrl}/collections/${collectionName}`);
      qdrantStats = response.data;
    } catch (error) {
      logger.warn('Failed to retrieve Qdrant stats', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const metrics = await this.computeCollectionMetrics(collection, qdrantStats);

    const result = {
      qdrant: qdrantStats,
      metrics,
    };

    // Cache the result
    if (cacheService.isAvailable()) {
      await cacheService.set(cacheKey, result);
      logger.debug('Cached collection stats', { collection: collectionName });
    }

    return result;
  }

  /**
   * Update a collection configuration
   */
  async updateCollection(name: string, updates: Partial<CollectionConfig>): Promise<void> {
    try {
      logger.info('Updating collection configuration', { collection: name, updates });

      const existing = this.collections.get(name);
      if (!existing) {
        throw new Error(`Collection not found: ${name}`);
      }

      // Merge updates with existing configuration
      const updatedConfig: CollectionConfig = {
        ...existing,
        ...updates,
        name, // Ensure name cannot be changed
      };

      // Validate directory if it changed
      if (updates.directory && updates.directory !== existing.directory) {
        await this.validateDirectory(updates.directory);
      }

      // Update in memory
      this.collections.set(name, updatedConfig);

      // Invalidate cache
      const cacheService = getCacheService();
      await cacheService.delete(`stats:${name}`);

      logger.info('Collection configuration updated', {
        collection: name,
        updatedFields: Object.keys(updates),
      });
    } catch (error) {
      logger.error('Failed to update collection configuration', {
        collection: name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Reload configuration from file
   */
  async reloadConfig(): Promise<void> {
    logger.info('Reloading collections configuration');

    // Clear current collections
    this.collections.clear();

    // Reinitialize
    await this.initialize();

    logger.info('Collections configuration reloaded', {
      totalCollections: this.collections.size,
    });
  }

  /**
   * Compute directory and index metrics for a collection
   */
  private async computeCollectionMetrics(
    collection: CollectionConfig,
    qdrantStats: any | null,
  ): Promise<CollectionMetrics> {
    const filesInDirectory = await this.collectFiles(collection);

    const chunkCount =
      qdrantStats?.result?.points_count ??
      qdrantStats?.result?.vectors_count ??
      qdrantStats?.result?.points_total ??
      0;

    const totalFiles = filesInDirectory.length;
    
    // Scan ALL indexed files to get accurate pending count
    const indexedFilePaths = new Set<string>();
    
    if (chunkCount > 0) {
      try {
        let offset: string | null = null;
        const limit = 100;
        
        // Scroll through all points to collect unique file paths
        do {
          const scrollResponse: any = await axios.post(
            `${this.qdrantUrl}/collections/${collection.name}/points/scroll`,
            {
              limit,
              offset,
              with_payload: true,
              with_vector: false, // Don't fetch vectors for performance
            },
          );

          const points = scrollResponse.data?.result?.points || [];
          offset = scrollResponse.data?.result?.next_page_offset || null;
          
          // Collect unique file paths
          for (const point of points) {
            const filePath = point.payload?.metadata?.file_path || point.payload?.file_path;
            if (filePath) {
              indexedFilePaths.add(filePath);
            }
          }
          
          // Break if no more pages
          if (!offset || points.length === 0) {
            break;
          }
        } while (offset);

        logger.debug('Scanned indexed file paths', {
          collection: collection.name,
          uniqueIndexedFiles: indexedFilePaths.size,
        });
      } catch (error) {
        logger.warn('Failed to scan indexed files for metrics', {
          collection: collection.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    // Count pending files (files in directory not in Qdrant)
    let pendingFiles = 0;
    
    if (indexedFilePaths.size > 0) {
      for (const filePath of filesInDirectory) {
        if (!indexedFilePaths.has(filePath)) {
          pendingFiles++;
        }
      }
    } else if (chunkCount === 0) {
      // No chunks at all - all files are pending
      pendingFiles = totalFiles;
    }

    const indexedFiles = totalFiles - pendingFiles;
    
    // Detect orphan files (indexed but deleted from filesystem)
    let orphanFiles = 0;
    const filesInDirectorySet = new Set(filesInDirectory);
    
    if (indexedFilePaths.size > 0) {
      for (const indexedPath of indexedFilePaths) {
        if (!filesInDirectorySet.has(indexedPath)) {
          orphanFiles++;
        }
      }
    }

    // For orphanChunks, we already have the count during scroll
    // We'll return orphan files count (each file might have multiple chunks)
    const orphanChunks = orphanFiles;

    // Calculate directory size
    let directorySizeBytes = 0;
    try {
      for (const filePath of filesInDirectory) {
        try {
          const stats = await fs.stat(filePath);
          directorySizeBytes += stats.size;
        } catch (error) {
          // Skip files that can't be read
        }
      }
    } catch (error) {
      logger.warn('Failed to calculate directory size', {
        collection: collection.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    const directorySizeMB = directorySizeBytes / (1024 * 1024);

    logger.debug('Collection metrics computed', {
      collection: collection.name,
      totalFiles,
      indexedFiles,
      pendingFiles,
      orphanChunks,
      chunkCount,
      directorySizeMB: directorySizeMB.toFixed(2),
    });

    return {
      totalFiles,
      indexedFiles,
      pendingFiles,
      orphanChunks,
      chunkCount,
      directorySizeBytes,
      directorySizeMB,
    };
  }

  /**
   * Collect all files for a collection directory
   */
  private async collectFiles(collection: CollectionConfig): Promise<string[]> {
    const files: string[] = [];
    const extensions = new Set(
      collection.fileTypes.map((ext) => ext.replace(/^\./, '').toLowerCase()),
    );

    const walk = async (dir: string): Promise<void> => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (error) {
        logger.warn('Unable to read directory while collecting files', {
          directory: dir,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        return;
      }

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (collection.recursive) {
            await walk(fullPath);
          }
        } else {
          const ext = entry.name.split('.').pop()?.toLowerCase();
          if (ext && extensions.has(ext)) {
            files.push(path.resolve(fullPath));
          }
        }
      }
    };

    try {
      await walk(collection.directory);
    } catch (error) {
      logger.warn('Failed to walk collection directory', {
        directory: collection.directory,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return files;
  }

  /**
   * Clean orphaned chunks from a collection
   */
  async cleanOrphanChunks(collectionName: string): Promise<{ deletedChunks: number; deletedFiles: number }> {
    try {
      logger.info('Cleaning orphan chunks', { collection: collectionName });

      const collection = this.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionName}`);
      }

      // Get all files in directory
      const filesInDirectory = await this.collectFiles(collection);
      const filesInDirectorySet = new Set(filesInDirectory);

      // Get all indexed file paths from Qdrant
      const orphanedPoints: string[] = [];
      let offset: string | null = null;
      const limit = 100;

      do {
        try {
          const scrollResponse: any = await axios.post(
            `${this.qdrantUrl}/collections/${collectionName}/points/scroll`,
            {
              limit,
              offset,
              with_payload: true,
              with_vector: false,
            },
          );

          const points = scrollResponse.data?.result?.points || [];
          offset = scrollResponse.data?.result?.next_page_offset || null;

          // Identify orphaned points
          for (const point of points) {
            const filePath = point.payload?.metadata?.file_path || point.payload?.file_path;
            if (filePath && !filesInDirectorySet.has(filePath)) {
              orphanedPoints.push(point.id);
            }
          }

          if (!offset || points.length === 0) {
            break;
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            logger.warn('Collection not found in Qdrant', { collection: collectionName });
            break;
          }
          throw error;
        }
      } while (offset);

      logger.info('Identified orphaned points', {
        collection: collectionName,
        orphanedPoints: orphanedPoints.length,
      });

      // Delete orphaned points
      let deletedChunks = 0;
      if (orphanedPoints.length > 0) {
        try {
          await axios.post(`${this.qdrantUrl}/collections/${collectionName}/points/delete`, {
            points: orphanedPoints,
          });
          deletedChunks = orphanedPoints.length;
          
          logger.info('Orphaned chunks deleted', {
            collection: collectionName,
            deletedChunks,
          });
        } catch (error) {
          logger.error('Failed to delete orphaned points', {
            collection: collectionName,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          throw error;
        }
      }

      // Invalidate cache
      const cacheService = getCacheService();
      await cacheService.delete(`stats:${collectionName}`);

      return {
        deletedChunks,
        deletedFiles: orphanedPoints.length > 0 ? 1 : 0, // Approximate
      };
    } catch (error) {
      logger.error('Failed to clean orphan chunks', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get all files with metadata (indexed, pending, orphaned)
   */
  async getIndexedFiles(collectionName: string): Promise<any[]> {
    try {
      logger.info('Getting all files for collection', { collection: collectionName });

      const collection = this.getCollection(collectionName);
      if (!collection) {
        throw new Error(`Collection not found: ${collectionName}`);
      }

      // Step 1: Fetch all indexed files from Qdrant
      const fileChunkMap = new Map<string, number>();
      let offset: string | null = null;
      const limit = 100;

      do {
        try {
          const scrollResponse: any = await axios.post(
            `${this.qdrantUrl}/collections/${collectionName}/points/scroll`,
            {
              limit,
              offset,
              with_payload: true,
              with_vector: false,
            },
          );

          const points = scrollResponse.data?.result?.points || [];
          offset = scrollResponse.data?.result?.next_page_offset || null;

          // Count chunks per file
          for (const point of points) {
            const filePath = point.payload?.metadata?.file_path || point.payload?.file_path;
            if (filePath) {
              fileChunkMap.set(filePath, (fileChunkMap.get(filePath) || 0) + 1);
            }
          }

          // Break if no more pages
          if (!offset || points.length === 0) {
            break;
          }
        } catch (error) {
          if (axios.isAxiosError(error) && error.response?.status === 404) {
            logger.warn('Collection not found in Qdrant', { collection: collectionName });
            break;
          }
          throw error;
        }
      } while (offset);

      logger.info('Collected indexed files from Qdrant', {
        collection: collectionName,
        indexedFiles: fileChunkMap.size,
      });

      // Step 2: Scan all files in the collection directory
      const allFilesInDirectory = await this.collectFiles(collection);
      
      logger.info('Scanned filesystem', {
        collection: collectionName,
        filesInDirectory: allFilesInDirectory.length,
      });

      // Step 3: Build complete file list with proper status
      const fileMap = new Map<string, any>();

      // Add indexed files (from Qdrant)
      for (const [filePath, chunkCount] of fileChunkMap.entries()) {
        let sizeBytes = 0;
        let status: 'indexed' | 'orphan' = 'indexed';
        let lastModified: string | null = null;

        try {
          const stats = await fs.stat(filePath);
          sizeBytes = stats.size;
          lastModified = stats.mtime.toISOString();
          status = 'indexed'; // File exists and is indexed
        } catch (error) {
          // File is indexed but doesn't exist anymore (orphan)
          status = 'orphan';
        }

        fileMap.set(filePath, {
          path: filePath,
          sizeBytes,
          chunkCount,
          status,
          lastModified,
        });
      }

      // Add pending files (in directory but not indexed)
      for (const filePath of allFilesInDirectory) {
        if (!fileMap.has(filePath)) {
          try {
            const stats = await fs.stat(filePath);
            fileMap.set(filePath, {
              path: filePath,
              sizeBytes: stats.size,
              chunkCount: 0,
              status: 'pending',
              lastModified: stats.mtime.toISOString(),
            });
          } catch (error) {
            logger.warn('Error reading file stats', {
              filePath,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
          }
        }
      }

      // Convert to array and sort by path
      const files = Array.from(fileMap.values());
      files.sort((a, b) => a.path.localeCompare(b.path));

      const statusCounts = {
        indexed: files.filter(f => f.status === 'indexed').length,
        pending: files.filter(f => f.status === 'pending').length,
        orphan: files.filter(f => f.status === 'orphan').length,
      };

      logger.info('All files retrieved successfully', {
        collection: collectionName,
        totalFiles: files.length,
        ...statusCounts,
        totalChunks: Array.from(fileChunkMap.values()).reduce((sum, count) => sum + count, 0),
      });

      return files;
    } catch (error) {
      logger.error('Failed to get all files', {
        collection: collectionName,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}

/**
 * Singleton instance
 */
export const collectionManager = new CollectionManager();
