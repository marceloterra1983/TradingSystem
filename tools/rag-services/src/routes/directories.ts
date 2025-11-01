/**
 * Directories Routes
 *
 * API endpoints for browsing and listing directories
 * Allows frontend to navigate filesystem for collection source selection
 *
 * @module routes/directories
 */

import { Router, Request, Response } from 'express';
import { readdir, stat } from 'fs/promises';
import { join, resolve } from 'path';
import type { Stats } from 'fs';
import { logger } from '../utils/logger';
import { sendSuccess, sendError } from '../middleware/responseWrapper';

const router = Router();

/**
 * Directory entry interface
 */
interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modified?: Date;
}

/**
 * Allowed base directories for security
 * Only allow browsing within these paths
 */
const HOST_DOCS_PATH = resolve(process.cwd(), '../../docs');
const HOST_PROJECT_ROOT = resolve(process.cwd(), '../../');

const ALLOWED_BASE_PATHS = [
  '/data/docs',
  '/data/tradingsystem',
  HOST_DOCS_PATH,
  HOST_PROJECT_ROOT,
];

const FALLBACK_PATH_MAPPINGS = [
  {
    prefix: '/data/docs',
    base: HOST_DOCS_PATH,
  },
  {
    prefix: '/data/tradingsystem',
    base: HOST_PROJECT_ROOT,
  },
];

/**
 * Check if path is allowed
 */
const isPathAllowed = (requestedPath: string): boolean => {
  const normalizedPath = resolve(requestedPath);
  return ALLOWED_BASE_PATHS.some(basePath => {
    const normalizedBase = resolve(basePath);
    return normalizedPath.startsWith(normalizedBase);
  });
};

/**
 * Try to retrieve stats for a target path, returning null when it does not exist.
 */
const tryGetStats = async (targetPath: string): Promise<Stats | null> => {
  try {
    return await stat(targetPath);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return null;
    }

    throw error;
  }
};

/**
 * Resolve a requested path to an existing directory, supporting local fallbacks
 * when running outside of containers (where /data mounts are unavailable).
 */
const resolveDirectoryPath = async (requestedPath: string): Promise<string> => {
  const normalizedRequestedPath = resolve(requestedPath);
  const directStats = await tryGetStats(normalizedRequestedPath);

  if (directStats?.isDirectory()) {
    return normalizedRequestedPath;
  }

  for (const mapping of FALLBACK_PATH_MAPPINGS) {
    if (requestedPath.startsWith(mapping.prefix)) {
      const suffix = requestedPath.slice(mapping.prefix.length);
      const fallbackPath = resolve(mapping.base, `.${suffix}`);
      const fallbackStats = await tryGetStats(fallbackPath);

      if (fallbackStats?.isDirectory()) {
        return fallbackPath;
      }
    }
  }

  if (directStats && !directStats.isDirectory()) {
    const notDirError: NodeJS.ErrnoException = new Error('Not a directory');
    notDirError.code = 'ENOTDIR';
    throw notDirError;
  }

  const notFoundError: NodeJS.ErrnoException = new Error('Directory not found');
  notFoundError.code = 'ENOENT';
  throw notFoundError;
};

/**
 * GET /api/v1/rag/directories
 * List available base directories
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    logger.info('Listing available base directories');

    const directories = await Promise.all(
      ALLOWED_BASE_PATHS.map(async (basePath) => {
        try {
          const normalizedPath = resolve(basePath);
          const stats = await stat(normalizedPath);

          return {
            name: basePath.split('/').pop() || basePath,
            path: basePath,
            isDirectory: stats.isDirectory(),
            exists: true,
          };
        } catch (error) {
          return {
            name: basePath.split('/').pop() || basePath,
            path: basePath,
            isDirectory: false,
            exists: false,
          };
        }
      }),
    );

    // Filter only existing directories
    const existingDirs = directories.filter(d => d.exists && d.isDirectory);

    return sendSuccess(res, {
      directories: existingDirs,
      total: existingDirs.length,
    });
  } catch (error) {
    logger.error('Failed to list base directories', { error });
    return sendError(
      res,
      'DIRECTORY_LIST_ERROR',
      'Failed to list base directories',
      500,
    );
  }
});

/**
 * GET /api/v1/rag/directories/browse
 * Browse directory contents
 *
 * Query params:
 *   - path: Directory path to browse
 */
router.get('/browse', async (req: Request, res: Response) => {
  try {
    const { path: requestedPath } = req.query;

    if (!requestedPath || typeof requestedPath !== 'string') {
      return sendError(
        res,
        'INVALID_PATH',
        'Path parameter is required',
        400,
      );
    }

    // Security check
    if (!isPathAllowed(requestedPath)) {
      logger.warn('Attempted to access unauthorized path', { path: requestedPath });
      return sendError(
        res,
        'UNAUTHORIZED_PATH',
        'Access to this directory is not allowed',
        403,
      );
    }

    const normalizedPath = await resolveDirectoryPath(requestedPath);
    logger.info('Browsing directory', {
      path: normalizedPath,
      requestedPath,
    });

    // Read directory contents
    const entries = await readdir(normalizedPath, { withFileTypes: true });

    // Get details for each entry
    const details: DirectoryEntry[] = await Promise.all(
      entries.map(async (entry) => {
        const fullPath = join(normalizedPath, entry.name);
        const stats = await stat(fullPath);

        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime,
        };
      }),
    );

    // Sort: directories first, then alphabetically
    const sorted = details.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) {return -1;}
      if (!a.isDirectory && b.isDirectory) {return 1;}
      return a.name.localeCompare(b.name);
    });

    // Separate directories and files
    const directories = sorted.filter(e => e.isDirectory);
    const files = sorted.filter(e => !e.isDirectory);

    return sendSuccess(res, {
      path: normalizedPath,
      parent: normalizedPath !== '/' ? resolve(normalizedPath, '..') : null,
      directories,
      files,
      totalDirectories: directories.length,
      totalFiles: files.length,
    });
  } catch (error: any) {
    logger.error('Failed to browse directory', { error: error.message });

    if (error.code === 'ENOENT') {
      return sendError(
        res,
        'DIRECTORY_NOT_FOUND',
        'Directory not found',
        404,
      );
    }

    if (error.code === 'EACCES') {
      return sendError(
        res,
        'ACCESS_DENIED',
        'Permission denied',
        403,
      );
    }

    return sendError(
      res,
      'DIRECTORY_READ_ERROR',
      'Failed to read directory',
      500,
    );
  }
});

/**
 * GET /api/v1/rag/directories/validate
 * Validate if a directory exists and is accessible
 *
 * Query params:
 *   - path: Directory path to validate
 */
router.get('/validate', async (req: Request, res: Response) => {
  try {
    const { path: requestedPath } = req.query;

    if (!requestedPath || typeof requestedPath !== 'string') {
      return sendError(
        res,
        'INVALID_PATH',
        'Path parameter is required',
        400,
      );
    }

    // Security check
    if (!isPathAllowed(requestedPath)) {
      return sendSuccess(res, {
        path: requestedPath,
        valid: false,
        reason: 'Path not in allowed directories',
      });
    }

    const normalizedPath = resolve(requestedPath);

    try {
      const stats = await stat(normalizedPath);

      return sendSuccess(res, {
        path: normalizedPath,
        valid: true,
        isDirectory: stats.isDirectory(),
        size: stats.size,
        modified: stats.mtime,
        accessible: true,
      });
    } catch (error: any) {
      return sendSuccess(res, {
        path: normalizedPath,
        valid: false,
        reason: error.code === 'ENOENT' ? 'Directory not found' : 'Access denied',
        accessible: false,
      });
    }
  } catch (error) {
    logger.error('Failed to validate directory', { error });
    return sendError(
      res,
      'VALIDATION_ERROR',
      'Failed to validate directory',
      500,
    );
  }
});

export default router;
