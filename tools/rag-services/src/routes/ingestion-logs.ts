/**
 * Ingestion Logs Routes
 *
 * API endpoints for retrieving ingestion logs
 * Provides real-time log streaming with persistent storage
 *
 * @module routes/ingestion-logs
 */

import { Router, Request, Response } from 'express';
import { promises as fs } from 'fs';
import path from 'path';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';

const router = Router();

/**
 * Log storage configuration
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

// Persistent storage path
const LOGS_DIR = process.env.LOGS_DIR || '/app/data/logs';
const LOGS_FILE = path.join(LOGS_DIR, 'ingestion-logs.jsonl');

// In-memory cache with increased capacity (last 10,000 logs)
const MAX_LOGS_IN_MEMORY = 10000;
const ingestionLogs: IngestionLogEntry[] = [];

// Flag to track if logs were loaded
let logsLoaded = false;

/**
 * Ensure logs directory exists
 */
async function ensureLogsDirectory(): Promise<void> {
  try {
    await fs.mkdir(LOGS_DIR, { recursive: true });
  } catch (error) {
    logger.warn('Failed to create logs directory', {
      dir: LOGS_DIR,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

/**
 * Load logs from persistent storage on startup
 */
async function loadLogsFromDisk(): Promise<void> {
  if (logsLoaded) return;

  try {
    await ensureLogsDirectory();
    
    const fileContent = await fs.readFile(LOGS_FILE, 'utf-8');
    const lines = fileContent.trim().split('\n').filter(line => line.trim());
    
    // Parse JSONL format (each line is a JSON object)
    const parsedLogs: IngestionLogEntry[] = [];
    for (const line of lines) {
      try {
        const log = JSON.parse(line);
        parsedLogs.push(log);
      } catch (parseError) {
        logger.warn('Failed to parse log line', { line: line.substring(0, 100) });
      }
    }

    // Load most recent MAX_LOGS_IN_MEMORY entries
    ingestionLogs.push(...parsedLogs.slice(-MAX_LOGS_IN_MEMORY));
    
    logger.info('Loaded ingestion logs from disk', {
      total: parsedLogs.length,
      loaded: ingestionLogs.length,
    });
    
    logsLoaded = true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      logger.info('No existing log file found, starting fresh', { path: LOGS_FILE });
    } else {
      logger.error('Failed to load logs from disk', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    logsLoaded = true;
  }
}

/**
 * Append log entry to persistent storage
 */
async function appendLogToDisk(entry: IngestionLogEntry): Promise<void> {
  try {
    await ensureLogsDirectory();
    
    // Append as JSONL (one JSON object per line)
    const jsonLine = JSON.stringify(entry) + '\n';
    await fs.appendFile(LOGS_FILE, jsonLine, 'utf-8');
  } catch (error) {
    logger.warn('Failed to persist log to disk', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    // Don't throw - log is still in memory
  }
}

/**
 * Add log entry to buffer and persist to disk
 */
export function addIngestionLog(entry: Omit<IngestionLogEntry, 'timestamp'>): void {
  const logEntry: IngestionLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  ingestionLogs.unshift(logEntry); // Add to beginning (newest first)

  // Keep only last MAX_LOGS_IN_MEMORY entries in memory
  if (ingestionLogs.length > MAX_LOGS_IN_MEMORY) {
    ingestionLogs.pop();
  }

  // Persist to disk (async, non-blocking)
  appendLogToDisk(logEntry).catch((error) => {
    logger.warn('Failed to persist log', { error });
  });

  // Also log to console for debugging
  logger.info('[Ingestion Log]', entry);
}

/**
 * GET /api/v1/rag/ingestion/logs
 * Retrieve ingestion logs with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Load logs from disk on first request
    await loadLogsFromDisk();

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
 * Archive current logs and start fresh (does NOT delete, only archives)
 */
router.delete('/', async (_req: Request, res: Response) => {
  try {
    const previousCount = ingestionLogs.length;

    // Archive current logs instead of deleting
    const archivePath = path.join(
      LOGS_DIR,
      `ingestion-logs-archive-${new Date().toISOString().replace(/:/g, '-')}.jsonl`
    );

    try {
      await ensureLogsDirectory();
      
      // Move current log file to archive
      try {
        await fs.rename(LOGS_FILE, archivePath);
        logger.info('Archived ingestion logs', {
          count: previousCount,
          archivePath,
        });
      } catch (renameError) {
        if ((renameError as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw renameError;
        }
        // File doesn't exist, that's OK
      }
    } catch (archiveError) {
      logger.warn('Failed to archive logs, clearing in-memory only', {
        error: archiveError instanceof Error ? archiveError.message : 'Unknown error',
      });
    }

    // Clear in-memory logs
    ingestionLogs.length = 0;

    return sendSuccess(res, {
      message: 'Ingestion logs archived successfully (history preserved)',
      clearedCount: previousCount,
      archivePath: archivePath.split('/').pop(),
    });
  } catch (error) {
    logger.error('Failed to archive ingestion logs', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return sendError(res, 'LOGS_ARCHIVE_ERROR', 'Failed to archive ingestion logs', 500);
  }
});

export default router;
