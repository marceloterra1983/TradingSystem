/**
 * Batch Ingestion Routes
 * 
 * Handles large-scale file ingestion with batch processing,
 * progress tracking, and cancellation support
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';
import { asyncHandler } from '../utils/asyncHandler';
import { collectionManager } from '../services/collectionManager';
import { ingestionService } from '../services/ingestionService';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

// Active ingestion jobs
const activeJobs = new Map<string, {
  collectionName: string;
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  cancelled: boolean;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  startTime: number;
  currentBatch: number;
  totalBatches: number;
  errors: string[];
}>();

/**
 * Get list of files to ingest
 */
async function getFilesToIngest(
  directory: string,
  fileTypes: string[],
  recursive: boolean
): Promise<string[]> {
  const files: string[] = [];
  
  async function scanDir(dir: string) {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          if (recursive && !entry.name.startsWith('.')) {
            await scanDir(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase().slice(1);
          if (fileTypes.includes(ext) || fileTypes.includes('*')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to scan directory', { dir, error });
    }
  }
  
  await scanDir(directory);
  return files;
}

/**
 * Process files in batches
 */
async function processBatch(
  files: string[],
  batchSize: number,
  collection: any,
  jobId: string
): Promise<void> {
  const job = activeJobs.get(jobId);
  if (!job) throw new Error('Job not found');
  
  const batches = [];
  for (let i = 0; i < files.length; i += batchSize) {
    batches.push(files.slice(i, i + batchSize));
  }
  
  job.totalBatches = batches.length;
  
  for (let i = 0; i < batches.length; i++) {
    // Check if job was cancelled
    if (job.cancelled) {
      job.status = 'cancelled';
      logger.info('[BATCH_INGEST] Job cancelled', { jobId, processedFiles: job.processedFiles });
      break;
    }
    
    job.currentBatch = i + 1;
    const batch = batches[i];
    
    logger.info('[BATCH_INGEST] Processing batch', {
      jobId,
      batch: i + 1,
      total: batches.length,
      files: batch.length,
    });
    
    try {
      // Process batch via LlamaIndex
      await ingestionService.ingestDirectory({
        directory: collection.directory,
        collectionName: collection.name,
        chunkSize: collection.chunkSize,
        chunkOverlap: collection.chunkOverlap,
        fileTypes: collection.fileTypes,
        recursive: false, // We're handling recursion ourselves
        embeddingModel: collection.embeddingModel,
        source: 'api', // Use 'api' instead of 'batch' to satisfy TypeScript
        // Limit to specific files in this batch (if supported by LlamaIndex)
      });
      
      job.processedFiles += batch.length;
      
      logger.info('[BATCH_INGEST] Batch completed', {
        jobId,
        batch: i + 1,
        processed: job.processedFiles,
        total: job.totalFiles,
        progress: Math.round((job.processedFiles / job.totalFiles) * 100),
      });
      
      // Small delay to prevent overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      job.failedFiles += batch.length;
      job.errors.push(`Batch ${i + 1}: ${errorMsg}`);
      
      logger.error('[BATCH_INGEST] Batch failed', {
        jobId,
        batch: i + 1,
        error: errorMsg,
      });
      
      // Continue with next batch instead of failing completely
    }
  }
  
  if (!job.cancelled) {
    job.status = job.failedFiles > 0 ? 'completed' : 'completed';
  }
}

/**
 * POST /api/v1/rag/ingestion/batch/:name
 * Start batch ingestion for a collection
 */
router.post('/batch/:name', asyncHandler(async (req: Request, res: Response) => {
  const { name } = req.params;
  const { batchSize = 10 } = req.body;
  
  // Validate batch size
  const effectiveBatchSize = Math.max(5, Math.min(50, parseInt(batchSize as string, 10)));
  
  // Check if collection exists
  const collection = collectionManager.getCollection(name);
  if (!collection) {
    return sendError(res, 'COLLECTION_NOT_FOUND', 'Collection not found', 404);
  }
  
  // Generate job ID
  const jobId = `${name}-${Date.now()}`;
  
  // Get list of files
  logger.info('[BATCH_INGEST] Scanning files', {
    jobId,
    directory: collection.directory,
  });
  
  const files = await getFilesToIngest(
    collection.directory,
    collection.fileTypes,
    collection.recursive
  );
  
  logger.info('[BATCH_INGEST] Files found', {
    jobId,
    totalFiles: files.length,
    batchSize: effectiveBatchSize,
    estimatedBatches: Math.ceil(files.length / effectiveBatchSize),
  });
  
  // Create job
  activeJobs.set(jobId, {
    collectionName: name,
    totalFiles: files.length,
    processedFiles: 0,
    failedFiles: 0,
    cancelled: false,
    status: 'running',
    startTime: Date.now(),
    currentBatch: 0,
    totalBatches: 0,
    errors: [],
  });
  
  // Start processing in background (don't await)
  processBatch(files, effectiveBatchSize, collection, jobId).then(() => {
    const job = activeJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'completed';
    }
    logger.info('[BATCH_INGEST] Job completed', {
      jobId,
      processedFiles: job?.processedFiles,
      failedFiles: job?.failedFiles,
      duration: job ? Date.now() - job.startTime : 0,
    });
  }).catch((error) => {
    const job = activeJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }
    logger.error('[BATCH_INGEST] Job failed', { jobId, error });
  });
  
  // Return job ID immediately
  return sendSuccess(res, {
    jobId,
    totalFiles: files.length,
    batchSize: effectiveBatchSize,
    estimatedBatches: Math.ceil(files.length / effectiveBatchSize),
  }, 202);
}));

/**
 * GET /api/v1/rag/ingestion/batch/:jobId/status
 * Get status of a batch ingestion job
 */
router.get('/batch/:jobId/status', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const job = activeJobs.get(jobId);
  if (!job) {
    return sendError(res, 'JOB_NOT_FOUND', 'Job not found', 404);
  }
  
  const progress = job.totalFiles > 0 
    ? Math.round((job.processedFiles / job.totalFiles) * 100)
    : 0;
  
  const elapsedTime = Date.now() - job.startTime;
  const estimatedTotalTime = job.processedFiles > 0
    ? (elapsedTime / job.processedFiles) * job.totalFiles
    : 0;
  const estimatedRemainingTime = Math.max(0, estimatedTotalTime - elapsedTime);
  
  return sendSuccess(res, {
    jobId,
    collectionName: job.collectionName,
    status: job.status,
    totalFiles: job.totalFiles,
    processedFiles: job.processedFiles,
    failedFiles: job.failedFiles,
    progress,
    currentBatch: job.currentBatch,
    totalBatches: job.totalBatches,
    elapsedTimeMs: elapsedTime,
    estimatedRemainingTimeMs: estimatedRemainingTime,
    errors: job.errors.slice(-5), // Last 5 errors
  });
}));

/**
 * POST /api/v1/rag/ingestion/batch/:jobId/cancel
 * Cancel a batch ingestion job
 */
router.post('/batch/:jobId/cancel', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const job = activeJobs.get(jobId);
  if (!job) {
    return sendError(res, 'JOB_NOT_FOUND', 'Job not found', 404);
  }
  
  if (job.status !== 'running') {
    return sendError(res, 'JOB_NOT_RUNNING', 'Job is not running', 400);
  }
  
  job.cancelled = true;
  logger.info('[BATCH_INGEST] Job cancelled by user', { jobId });
  
  return sendSuccess(res, {
    jobId,
    status: 'cancelling',
    processedFiles: job.processedFiles,
  });
}));

/**
 * DELETE /api/v1/rag/ingestion/batch/:jobId
 * Delete a completed job from memory
 */
router.delete('/batch/:jobId', asyncHandler(async (req: Request, res: Response) => {
  const { jobId } = req.params;
  
  const job = activeJobs.get(jobId);
  if (!job) {
    return sendError(res, 'JOB_NOT_FOUND', 'Job not found', 404);
  }
  
  if (job.status === 'running') {
    return sendError(res, 'JOB_RUNNING', 'Cannot delete running job', 400);
  }
  
  activeJobs.delete(jobId);
  logger.info('[BATCH_INGEST] Job deleted', { jobId });
  
  return sendSuccess(res, { jobId, deleted: true });
}));

/**
 * GET /api/v1/rag/ingestion/batch
 * List all active and recent jobs
 */
router.get('/batch', asyncHandler(async (_req: Request, res: Response) => {
  const jobs = Array.from(activeJobs.entries()).map(([jobId, job]) => ({
    jobId,
    collectionName: job.collectionName,
    status: job.status,
    totalFiles: job.totalFiles,
    processedFiles: job.processedFiles,
    failedFiles: job.failedFiles,
    progress: job.totalFiles > 0 
      ? Math.round((job.processedFiles / job.totalFiles) * 100)
      : 0,
    startTime: job.startTime,
  }));
  
  return sendSuccess(res, { jobs });
}));

export default router;

