/**
 * File Watcher Service
 *
 * Monitors configured directories for file changes
 * Automatically triggers ingestion when files are added/modified
 *
 * @module services/fileWatcher
 */

import chokidar, { FSWatcher } from 'chokidar';
import path from 'path';
import { logger } from '../utils/logger';
import { collectionManager, CollectionConfig } from './collectionManager';
import { ingestionService } from './ingestionService';
import { qdrantClient } from '../utils/qdrantClient';

/**
 * File change event types
 */
export type FileEventType = 'add' | 'change' | 'unlink';

/**
 * File change event
 */
export interface FileChangeEvent {
  type: FileEventType;
  filePath: string;
  collection: string;
  timestamp: string;
}

/**
 * File Watcher status
 */
export interface FileWatcherStatus {
  enabled: boolean;
  watching: boolean;
  watchedDirectories: string[];
  eventsProcessed: number;
  lastEvent: FileChangeEvent | null;
  pendingIngestions: number;
}

/**
 * Debounced file changes (to batch rapid changes)
 */
interface PendingChange {
  filePath: string;
  collection: string;
  timeout: NodeJS.Timeout;
}

/**
 * File Watcher Service class
 */
export class FileWatcherService {
  private enabled: boolean;
  private watcher: FSWatcher | null = null;
  private pendingChanges: Map<string, PendingChange> = new Map();
  private debounceMs: number;
  private eventsProcessed: number = 0;
  private lastEvent: FileChangeEvent | null = null;

  constructor() {
    this.enabled = process.env.FILE_WATCHER_ENABLED === 'true';
    this.debounceMs = parseInt(process.env.FILE_WATCHER_DEBOUNCE_MS || '5000', 10);
  }

  /**
   * Initialize and start file watcher
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.enabled) {
        logger.info('File Watcher is disabled');
        resolve();
        return;
      }

      try {
        logger.info('Starting File Watcher Service', {
          debounceMs: this.debounceMs,
        });

        // Get collections with auto-update enabled
        const collections = collectionManager.getAutoUpdateCollections();

        if (collections.length === 0) {
          logger.warn('No collections with auto-update enabled');
          resolve();
          return;
        }

        // Start watching directories
        this.initializeWatcher(collections);

        logger.info('File Watcher Service started', {
          watchedCollections: collections.length,
          directories: collections.map(c => c.directory),
        });

        resolve();
      } catch (error) {
        logger.error('Failed to start File Watcher Service', {
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        reject(error instanceof Error ? error : new Error('Failed to start File Watcher Service'));
      }
    });
  }

  /**
   * Initialize chokidar watcher
   */
  private initializeWatcher(collections: CollectionConfig[]): void {
    // Build watch paths with glob patterns
    const watchPaths = collections.map(c => {
      const extensions = c.fileTypes.map(ext => ext.startsWith('.') ? ext : `.${ext}`);
      const pattern = c.recursive
        ? path.join(c.directory, '**', `*{${extensions.join(',')}}`)
        : path.join(c.directory, `*{${extensions.join(',')}}`);
      return pattern;
    });

    logger.info('Initializing file watcher', {
      patterns: watchPaths,
    });

    // Create watcher
    this.watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true, // Don't trigger events for existing files on startup
      awaitWriteFinish: {
        stabilityThreshold: 2000, // Wait 2s for file write to finish
        pollInterval: 100,
      },
      ignored: [
        /(^|[\/\\])\../, // Ignore dotfiles
        /node_modules/,
        /\.git/,
        /\.DS_Store/,
        /Thumbs\.db/,
      ],
    });

    // Register event handlers
    this.watcher
      .on('add', (filePath) => this.handleFileEvent('add', filePath))
      .on('change', (filePath) => this.handleFileEvent('change', filePath))
      .on('unlink', (filePath) => this.handleFileEvent('unlink', filePath))
      .on('error', (error) => {
        logger.error('File watcher error', {
          error: error.message,
        });
      });
  }

  /**
   * Handle file system event
   */
  private handleFileEvent(eventType: FileEventType, filePath: string): void {
    try {
      // Find collection for this file
      const collection = collectionManager.getCollectionByDirectory(path.dirname(filePath));

      if (!collection) {
        logger.warn('File change detected but no collection found', {
          filePath,
          eventType,
        });
        return;
      }

      // Check if file type is allowed for this collection
      const ext = path.extname(filePath).substring(1);
      if (!collection.fileTypes.includes(ext)) {
        return; // Ignore files with non-matching extensions
      }

      // Only log actual changes to avoid noise
      if (eventType === 'add') {
        logger.info('File added', {
          file: path.basename(filePath),
          collection: collection.name,
        });
      } else if (eventType === 'change') {
        logger.info('File changed', {
          file: path.basename(filePath),
          collection: collection.name,
        });
      }
      // 'unlink' is logged in handleFileDelete with result

      // Store last event
      this.lastEvent = {
        type: eventType,
        filePath,
        collection: collection.name,
        timestamp: new Date().toISOString(),
      };

      // Handle based on event type
      if (eventType === 'unlink') {
        // File deleted - remove from vector database
        void this.handleFileDelete(filePath, collection);
      } else {
        // File added or changed - schedule ingestion with debounce
        this.scheduleIngestion(filePath, collection);
      }

      this.eventsProcessed++;
    } catch (error) {
      logger.error('Error handling file event', {
        eventType,
        filePath,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Schedule file ingestion with debounce
   * Multiple rapid changes to same file are batched into single ingestion
   */
  private scheduleIngestion(filePath: string, collection: CollectionConfig): void {
    // Cancel existing timeout for this file
    const existing = this.pendingChanges.get(filePath);
    if (existing) {
      clearTimeout(existing.timeout);
    }

    // Schedule new ingestion after debounce period
    const timeout = setTimeout(() => {
      this.pendingChanges.delete(filePath);
      void this.triggerIngestion(filePath, collection);
    }, this.debounceMs);

    this.pendingChanges.set(filePath, {
      filePath,
      collection: collection.name,
      timeout,
    });

    // Removed debug log to reduce noise
  }

  /**
   * Trigger actual ingestion
   */
  private async triggerIngestion(filePath: string, collection: CollectionConfig): Promise<void> {
    try {
      // Create ingestion job
      await ingestionService.ingestFile({
        filePath,
        collectionName: collection.name,
        chunkSize: collection.chunkSize,
        chunkOverlap: collection.chunkOverlap,
        embeddingModel: collection.embeddingModel,
        source: 'file-watcher',
      });

      logger.info('Ingestion triggered', {
        file: path.basename(filePath),
        collection: collection.name,
      });
    } catch (error) {
      logger.error('Ingestion failed', {
        file: path.basename(filePath),
        collection: collection.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Handle file deletion
   * 
   * Automatically removes all chunks associated with a deleted file from Qdrant
   */
  private async handleFileDelete(filePath: string, collection: CollectionConfig): Promise<void> {
    try {
      // Delete all chunks for this file from Qdrant
      const chunksDeleted = await qdrantClient.deleteFileChunks(
        collection.name,
        filePath,
      );

      if (chunksDeleted > 0) {
        logger.info('File deleted - chunks removed', {
          file: path.basename(filePath),
          chunks: chunksDeleted,
          collection: collection.name,
        });
      }
      // If no chunks found, file wasn't indexed - no need to log
    } catch (error) {
      logger.error('Failed to delete file chunks', {
        file: path.basename(filePath),
        collection: collection.name,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      
      // Don't throw - log error but continue processing other events
      // The orphan cleanup endpoint can be used as fallback
    }
  }

  /**
   * Stop file watcher
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      logger.info('Stopping File Watcher Service');

      // Clear all pending timeouts
      for (const pending of this.pendingChanges.values()) {
        clearTimeout(pending.timeout);
      }
      this.pendingChanges.clear();

      // Close watcher
      await this.watcher.close();
      this.watcher = null;

      logger.info('File Watcher Service stopped');
    }
  }

  /**
   * Get watcher status
   */
  getStatus(): FileWatcherStatus {
    const collections = collectionManager.getAutoUpdateCollections();

    return {
      enabled: this.enabled,
      watching: this.watcher !== null,
      watchedDirectories: collections.map(c => c.directory),
      eventsProcessed: this.eventsProcessed,
      lastEvent: this.lastEvent,
      pendingIngestions: this.pendingChanges.size,
    };
  }

  /**
   * Force process pending changes (useful for testing)
   */
  async flushPendingChanges(): Promise<void> {
    logger.info('Flushing pending changes', {
      count: this.pendingChanges.size,
    });

    for (const pending of this.pendingChanges.values()) {
      clearTimeout(pending.timeout);

      const collection = collectionManager.getCollection(pending.collection);
      if (collection) {
        await this.triggerIngestion(pending.filePath, collection);
      }
    }

    this.pendingChanges.clear();
  }

  /**
   * Manually trigger re-ingestion of entire collection
   */
  async reingestCollection(collectionName: string): Promise<void> {
    const collection = collectionManager.getCollection(collectionName);

    if (!collection) {
      throw new Error(`Collection not found: ${collectionName}`);
    }

    logger.info('Triggering full collection re-ingestion', {
      collection: collectionName,
      directory: collection.directory,
    });

    await ingestionService.ingestDirectory({
      directory: collection.directory,
      collectionName: collection.name,
      chunkSize: collection.chunkSize,
      chunkOverlap: collection.chunkOverlap,
      fileTypes: collection.fileTypes,
      recursive: collection.recursive,
      embeddingModel: collection.embeddingModel,
      source: 'manual-reingest',
    });

    logger.info('Full re-ingestion job created', {
      collection: collectionName,
    });
  }
}

/**
 * Singleton instance
 */
export const fileWatcherService = new FileWatcherService();
