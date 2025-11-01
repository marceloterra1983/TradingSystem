/**
 * Ingestion Logs Routes
 *
 * API endpoints for retrieving ingestion logs
 * Provides real-time log streaming for frontend monitoring
 *
 * @module routes/ingestion-logs
 */

import { Router, Request, Response } from 'express';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';

const router = Router();

/**
 * In-memory log storage (circular buffer)
 * In production, this should use Redis or a proper log aggregation system
 */
interface IngestionLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  collection?: string;
  details?: {
    filesProcessed?: number;
    chunksCreated?: number;
    currentFile?: string;
    progress?: number;
  };
}

// Circular buffer for logs (max 1000 entries)
const MAX_LOGS = 1000;
const ingestionLogs: IngestionLogEntry[] = [];

/**
 * Add log entry to buffer
 */
export function addIngestionLog(entry: Omit<IngestionLogEntry, 'timestamp'>): void {
  const logEntry: IngestionLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  ingestionLogs.unshift(logEntry); // Add to beginning

  // Keep only last MAX_LOGS entries
  if (ingestionLogs.length > MAX_LOGS) {
    ingestionLogs.pop();
  }

  // Also log to console for debugging
  logger.info('[Ingestion Log]', entry);
}

/**
 * GET /api/v1/rag/ingestion/logs
 * Retrieve ingestion logs with optional filtering
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { limit = '100', collection, level } = req.query;

    let filteredLogs = [...ingestionLogs];

    // Filter by collection
    if (collection && collection !== 'all') {
      filteredLogs = filteredLogs.filter((log) => log.collection === collection);
    }

    // Filter by level
    if (level && level !== 'all') {
      filteredLogs = filteredLogs.filter((log) => log.level === level);
    }

    // Apply limit
    const limitNum = parseInt(limit as string, 10);
    if (!isNaN(limitNum) && limitNum > 0) {
      filteredLogs = filteredLogs.slice(0, limitNum);
    }

    return sendSuccess(res, {
      logs: filteredLogs,
      total: filteredLogs.length,
      totalAvailable: ingestionLogs.length,
      filters: {
        collection: collection || 'all',
        level: level || 'all',
        limit: limitNum,
      },
    });
  } catch (error) {
    logger.error('Failed to retrieve ingestion logs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'LOGS_FETCH_ERROR', 'Failed to retrieve ingestion logs', 500);
  }
});

/**
 * POST /api/v1/rag/ingestion/logs
 * Add a new log entry (for internal use or webhook)
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const { level, message, collection, details } = req.body;

    if (!level || !message) {
      return sendError(res, 'INVALID_LOG_ENTRY', 'Level and message are required', 400);
    }

    addIngestionLog({
      level,
      message,
      collection,
      details,
    });

    return sendSuccess(res, {
      message: 'Log entry added successfully',
    });
  } catch (error) {
    logger.error('Failed to add ingestion log', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'LOG_ADD_ERROR', 'Failed to add ingestion log', 500);
  }
});

/**
 * DELETE /api/v1/rag/ingestion/logs
 * Clear all ingestion logs
 */
router.delete('/', (_req: Request, res: Response) => {
  try {
    const previousCount = ingestionLogs.length;
    ingestionLogs.length = 0; // Clear array

    logger.info('Cleared ingestion logs', { count: previousCount });

    return sendSuccess(res, {
      message: 'Ingestion logs cleared successfully',
      clearedCount: previousCount,
    });
  } catch (error) {
    logger.error('Failed to clear ingestion logs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'LOGS_CLEAR_ERROR', 'Failed to clear ingestion logs', 500);
  }
});

export default router;

