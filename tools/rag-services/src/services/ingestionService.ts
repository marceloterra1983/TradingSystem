/**
 * Ingestion Service
 *
 * Orchestrates document ingestion into vector database
 * Manages ingestion jobs via Redis queue
 *
 * @module services/ingestionService
 */

import axios, { AxiosError } from 'axios';
import { randomUUID } from 'crypto';
import { logger, logIngestion } from '../utils/logger';
import { getCacheService } from './cacheService';
import { addIngestionLog } from '../routes/ingestion-logs';

/**
 * Ingestion request for a single file
 */
export interface IngestFileRequest {
  filePath: string;
  collectionName: string;
  chunkSize: number;
  chunkOverlap: number;
  embeddingModel: string;
  source: 'file-watcher' | 'manual' | 'api';
}

/**
 * Ingestion request for a directory
 */
export interface IngestDirectoryRequest {
  directory: string;
  collectionName: string;
  chunkSize: number;
  chunkOverlap: number;
  fileTypes: string[];
  recursive: boolean;
  embeddingModel: string;
  source: 'manual-reingest' | 'api' | 'scheduled';
  statsHint?: {
    pendingFiles: number;
    orphanChunks: number;
  };
}

/**
 * Ingestion job response
 */
export interface IngestionJobResponse {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  message: string;
}

/**
 * Ingestion Service class
 */
export class IngestionService {
  private ingestionUrl: string;
  private timeout: number;
  private interServiceSecret: string;

  constructor() {
    this.ingestionUrl = process.env.LLAMAINDEX_INGESTION_URL || 'http://rag-llamaindex-ingest:8201';
    this.timeout = parseInt(process.env.INGESTION_TIMEOUT_MS || '300000', 10); // 5 minutes
    this.interServiceSecret = process.env.INTER_SERVICE_SECRET || '';

    if (!this.interServiceSecret && process.env.NODE_ENV === 'production') {
      throw new Error('INTER_SERVICE_SECRET is required in production');
    }
  }

  /**
   * Ingest a single file
   */
  async ingestFile(request: IngestFileRequest): Promise<IngestionJobResponse> {
    try {
      logger.info('Starting file ingestion', {
        filePath: request.filePath,
        collection: request.collectionName,
        source: request.source,
      });

      // Call llamaindex ingestion service
      const response = await axios.post(
        `${this.ingestionUrl}/ingest/file`,
        {
          file_path: request.filePath,
          collection_name: request.collectionName,
          chunk_size: request.chunkSize,
          chunk_overlap: request.chunkOverlap,
          embedding_model: request.embeddingModel,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: this.timeout,
        },
      );

      const jobId = response.data.job_id;

      logIngestion(jobId, 'PENDING', {
        filePath: request.filePath,
        collection: request.collectionName,
        source: request.source,
      });

      // Invalidate cache for this collection after ingestion
      const cacheService = getCacheService();
      await cacheService.delete(`stats:${request.collectionName}`);
      logger.debug('Cache invalidated after file ingestion', {
        collection: request.collectionName,
      });

      return {
        jobId,
        status: 'PENDING',
        message: 'File ingestion job created successfully',
      };
    } catch (error) {
      logger.error('File ingestion failed', {
        filePath: request.filePath,
        collection: request.collectionName,
        error: this.formatError(error),
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * Ingest an entire directory
   */
  async ingestDirectory(request: IngestDirectoryRequest): Promise<IngestionJobResponse> {
    // Generate job ID locally BEFORE calling LlamaIndex
    const jobId = randomUUID();

    try {
      logger.info('Starting directory ingestion', {
        jobId,
        directory: request.directory,
        collection: request.collectionName,
        recursive: request.recursive,
        fileTypes: request.fileTypes,
        source: request.source,
      });

      // Get stats BEFORE ingestion to know what we're processing
      // Use stats from request if provided (from frontend), otherwise calculate
      let pendingFiles = 0;
      let orphanChunks = 0;
      
      if (request.statsHint) {
        // Frontend provided stats - use them for consistent logging
        pendingFiles = request.statsHint.pendingFiles || 0;
        orphanChunks = request.statsHint.orphanChunks || 0;
      } else {
        // Calculate stats if not provided
        const collectionManager = await import('./collectionManager').then(m => m.collectionManager);
        const statsBefore = await collectionManager.getCollectionStats(request.collectionName);
        pendingFiles = statsBefore?.pendingFiles || 0;
        orphanChunks = statsBefore?.orphanChunks || 0;
      }
      
      // Still get these for final comparison
      const collectionManager = await import('./collectionManager').then(m => m.collectionManager);
      const statsBefore = await collectionManager.getCollectionStats(request.collectionName);
      const indexedFilesBefore = statsBefore?.indexedFiles || 0;
      const chunksBefore = statsBefore?.chunkCount || 0;

      // Add detailed log entry for frontend
      const initialMsg = pendingFiles > 0 || orphanChunks > 0
        ? `Iniciando: ${pendingFiles} arquivo(s) NOVO(S)${orphanChunks > 0 ? ` + ${orphanChunks} orfao(s)` : ''} - GPU RTX 5090`
        : `Re-indexacao completa (todos arquivos serao verificados)`;
      
      addIngestionLog({
        level: 'info',
        message: initialMsg,
        collection: request.collectionName,
        details: {
          currentFile: request.directory,
          progress: 0,
          filesProcessed: 0,
          chunksCreated: 0,
        },
      });

      // Log as PENDING immediately
      logIngestion(jobId, 'PENDING', {
        directory: request.directory,
        collection: request.collectionName,
        recursive: request.recursive,
        fileTypes: request.fileTypes,
        source: request.source,
      });

      // Call llamaindex ingestion service
      const response = await axios.post(
        `${this.ingestionUrl}/ingest/directory`,
        {
          directory_path: request.directory,
          collection_name: request.collectionName,
          chunk_size: request.chunkSize,
          chunk_overlap: request.chunkOverlap,
          allowed_extensions: request.fileTypes,
          recursive: request.recursive,
          embedding_model: request.embeddingModel,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: this.timeout,
        },
      );

      // Log success from LlamaIndex response
      const { chunks_generated, documents_loaded, files_ingested } = response.data;
      
      logger.info('Directory ingestion completed', {
        jobId,
        collection: request.collectionName,
        chunksGenerated: chunks_generated,
        documentsLoaded: documents_loaded,
        filesIngested: files_ingested,
      });

      // Invalidate cache for this collection after ingestion
      const cacheService = getCacheService();
      await cacheService.delete(`stats:${request.collectionName}`);
      logger.debug('Cache invalidated after directory ingestion', {
        collection: request.collectionName,
      });

      // Get stats AFTER to show what was actually NEW
      const statsAfter = await collectionManager.getCollectionStats(request.collectionName);
      const indexedFilesAfter = statsAfter?.indexedFiles || 0;
      const chunksAfter = statsAfter?.chunkCount || 0;
      
      const newFilesIndexed = Math.max(0, indexedFilesAfter - indexedFilesBefore);
      const newChunksCreated = Math.max(0, chunksAfter - chunksBefore);
      
      // Calculate duration from start to now
      const totalDuration = Date.now() - Date.parse(response.data.timestamp || new Date().toISOString());
      const durationSeconds = (totalDuration / 1000).toFixed(1);
      
      // Create clear message WITH DURATION
      const finalMsg = newFilesIndexed > 0 || newChunksCreated > 0
        ? `Concluido! ${newFilesIndexed} arquivo(s) NOVO(S) indexados, ${newChunksCreated} chunks NOVOS (${durationSeconds}s)`
        : `Concluido! Nenhum novo (verificou ${files_ingested} arquivos, todos ja indexados - ${durationSeconds}s)`;

      // Add success log with duration (duration is in message)
      addIngestionLog({
        level: 'success',
        message: finalMsg,
        collection: request.collectionName,
        details: {
          progress: 100,
          chunksCreated: newChunksCreated,
          filesProcessed: newFilesIndexed,
        },
      });

      // Update to COMPLETED
      logIngestion(jobId, 'COMPLETED', {
        chunksCreated: chunks_generated,
        filesProcessed: files_ingested,
      });

      return {
        jobId,
        status: 'COMPLETED',
        message: `Successfully indexed ${files_ingested || 0} files with ${chunks_generated || 0} chunks`,
      };
    } catch (error) {
      logger.error('Directory ingestion failed', {
        jobId,
        directory: request.directory,
        collection: request.collectionName,
        error: this.formatError(error),
      });

      // Update to FAILED
      logIngestion(jobId, 'FAILED');

      // Add error log
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';

      addIngestionLog({
        level: 'error',
        message: `Falha na indexação (ID: ${jobId}): ${errorMessage}`,
        collection: request.collectionName,
        details: {},
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * Get ingestion job status
   */
  async getJobStatus(jobId: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.ingestionUrl}/jobs/${jobId}`,
        {
          headers: {
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: 5000,
        },
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get job status', {
        jobId,
        error: this.formatError(error),
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * List ingestion jobs
   */
  async listJobs(filters?: {
    status?: string;
    collection?: string;
    limit?: number;
  }): Promise<any[]> {
    try {
      const params = new URLSearchParams();

      if (filters?.status) {params.append('status', filters.status);}
      if (filters?.collection) {params.append('collection', filters.collection);}
      if (filters?.limit) {params.append('limit', filters.limit.toString());}

      const response = await axios.get(
        `${this.ingestionUrl}/jobs?${params.toString()}`,
        {
          headers: {
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: 5000,
        },
      );

      return response.data.jobs || [];
    } catch (error) {
      logger.error('Failed to list jobs', {
        filters,
        error: this.formatError(error),
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * Cancel an ingestion job
   */
  async cancelJob(jobId: string): Promise<void> {
    try {
      await axios.post(
        `${this.ingestionUrl}/jobs/${jobId}/cancel`,
        {},
        {
          headers: {
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: 5000,
        },
      );

      logIngestion(jobId, 'CANCELLED', { reason: 'manual_cancellation' });

      logger.info('Job cancelled', { jobId });
    } catch (error) {
      logger.error('Failed to cancel job', {
        jobId,
        error: this.formatError(error),
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * Retry a failed ingestion job
   */
  async retryJob(jobId: string): Promise<IngestionJobResponse> {
    try {
      const response = await axios.post(
        `${this.ingestionUrl}/jobs/${jobId}/retry`,
        {},
        {
          headers: {
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: 5000,
        },
      );

      const newJobId = response.data.job_id;

      logIngestion(newJobId, 'PENDING', { originalJobId: jobId, reason: 'retry' });

      return {
        jobId: newJobId,
        status: 'PENDING',
        message: 'Job retry initiated',
      };
    } catch (error) {
      logger.error('Failed to retry job', {
        jobId,
        error: this.formatError(error),
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * Get ingestion statistics for a collection
   */
  async getCollectionStats(collectionName: string): Promise<any> {
    try {
      const response = await axios.get(
        `${this.ingestionUrl}/collections/${collectionName}/stats`,
        {
          headers: {
            'X-Internal-Auth': this.interServiceSecret,
          },
          timeout: 5000,
        },
      );

      return response.data;
    } catch (error) {
      logger.error('Failed to get collection stats', {
        collection: collectionName,
        error: this.formatError(error),
      });

      throw this.handleIngestionError(error);
    }
  }

  /**
   * Format error for logging
   */
  private formatError(error: unknown): any {
    if (axios.isAxiosError(error)) {
      return {
        message: error.message,
        code: error.code,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        name: error.name,
        stack: error.stack,
      };
    }

    return { message: 'Unknown error', error };
  }

  /**
   * Handle ingestion errors
   */
  private handleIngestionError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;

      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        return new Error('Authentication failed with ingestion service');
      }

      if (axiosError.response?.status === 404) {
        return new Error('Ingestion service endpoint not found');
      }

      if (axiosError.response?.status === 503) {
        return new Error('Ingestion service unavailable');
      }

      if (axiosError.code === 'ECONNREFUSED') {
        return new Error('Cannot connect to ingestion service');
      }

      if (axiosError.code === 'ETIMEDOUT') {
        return new Error('Ingestion service request timed out');
      }

      return new Error(`Ingestion service error: ${axiosError.message}`);
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown ingestion error');
  }

  /**
   * Health check for ingestion service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.ingestionUrl}/health`,
        {
          timeout: 5000,
        },
      );

      return response.status === 200;
    } catch (error) {
      logger.warn('Ingestion service health check failed', {
        error: this.formatError(error),
      });
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const ingestionService = new IngestionService();
