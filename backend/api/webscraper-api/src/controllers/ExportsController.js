import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import {
  deleteExport as deleteExportFiles,
  generateExportFiles,
  refreshExportGauge
} from '../services/ExportService.js';
import { writeExportMetadata } from '../services/QuestDBService.js';

const SUPPORTED_FORMATS = ['csv', 'json', 'parquet', 'zip'];
const EXPORT_TTL_HOURS = Number(process.env.WEBSCRAPER_EXPORT_TTL_HOURS ?? 24);
const WEBSCRAPER_EXPORT_DIR =
  process.env.WEBSCRAPER_EXPORT_DIR || path.join(process.cwd(), 'tmp', 'webscraper-exports');

function isPathWithinExportDir(filePath) {
  // Resolve both paths to absolute paths and handle any '..' or '.' in the paths
  const realExportDir = path.resolve(WEBSCRAPER_EXPORT_DIR);
  const realFilePath = path.resolve(filePath);
  return realFilePath.startsWith(realExportDir);
}

function buildWhereClause(query) {
  const where = {};
  if (query.status) {
    where.status = query.status;
  }
  if (query.exportType) {
    where.exportType = query.exportType;
  }
  if (query.dateFrom || query.dateTo) {
    where.createdAt = {};
    if (query.dateFrom) {
      where.createdAt.gte = new Date(query.dateFrom);
    }
    if (query.dateTo) {
      where.createdAt.lte = new Date(query.dateTo);
    }
  }
  return where;
}

async function runExportGeneration(exportId) {
  try {
    const record = await prisma.exportJob.update({
      where: { id: exportId },
      data: { status: 'processing', startedAt: new Date() }
    });

    const result = await generateExportFiles(record);

    const updated = await prisma.exportJob.update({
      where: { id: exportId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        filePaths: result.filePaths,
        rowCount: result.rowCount,
        fileSizeBytes: result.fileSizeBytes,
        error: null
      }
    });
    await writeExportMetadata(updated);
  } catch (error) {
    logger.error({ err: error, exportId }, 'Export generation failed');
    await prisma.exportJob.update({
      where: { id: exportId },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: error.message
      }
    });
  } finally {
    await refreshExportGauge();
  }
}

export async function listExports(req, res, next) {
  try {
    const page = Math.max(Number(req.query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(req.query.limit ?? 20), 1), 100);
    const skip = (page - 1) * limit;

    const where = buildWhereClause(req.query);

    const [total, items] = await Promise.all([
      prisma.exportJob.count({ where }),
      prisma.exportJob.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      })
    ]);

    res.json({
      success: true,
      data: {
        items,
        page,
        pageSize: limit,
        total
      }
    });
  } catch (error) {
    next(error);
  }
}

export async function getExport(req, res, next) {
  try {
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: req.params.id }
    });

    if (!exportJob) {
      return res.status(404).json({ success: false, error: 'Export not found' });
    }

    if (exportJob.status === 'completed' && exportJob.expiresAt < new Date()) {
      return res.status(404).json({ success: false, error: 'Export has expired' });
    }

    res.json({ success: true, data: exportJob });
  } catch (error) {
    next(error);
  }
}

export async function createExport(req, res, next) {
  try {
    const expiresAt = new Date(Date.now() + EXPORT_TTL_HOURS * 60 * 60 * 1000);
    const exportJob = await prisma.exportJob.create({
      data: {
        name: req.body.name,
        description: req.body.description,
        exportType: req.body.exportType,
        formats: req.body.formats,
        filters: req.body.filters ?? {},
        status: 'pending',
        startedAt: new Date(),
        expiresAt
      }
    });

    await refreshExportGauge();

    setImmediate(() => {
      runExportGeneration(exportJob.id).catch(error => {
        logger.error({ err: error, exportId: exportJob.id }, 'Export generation dispatch failed');
      });
    });

    res.status(202).json({ success: true, data: exportJob });
  } catch (error) {
    next(error);
  }
}

export async function downloadExport(req, res, next) {
  try {
    const { id, format } = { id: req.params.id, format: req.params.format };
    if (!SUPPORTED_FORMATS.includes(format)) {
      return res.status(400).json({ success: false, error: 'Unsupported export format' });
    }

    const exportJob = await prisma.exportJob.findUnique({
      where: { id }
    });

    if (!exportJob) {
      return res.status(404).json({ success: false, error: 'Export not found' });
    }

    if (exportJob.status !== 'completed') {
      return res
        .status(409)
        .json({ success: false, error: 'Export is not ready for download yet' });
    }

    if (exportJob.expiresAt < new Date()) {
      return res.status(404).json({ success: false, error: 'Export has expired' });
    }

    const filePath = exportJob.filePaths?.[format];
    if (!filePath) {
      return res.status(404).json({ success: false, error: 'Export file not found' });
    }

    // Validate file path is within export directory
    if (!isPathWithinExportDir(filePath)) {
      logger.error(
        { exportId: id, filePath },
        'Attempt to access file outside of export directory'
      );
      return res.status(403).json({ success: false, error: 'Invalid file path' });
    }

    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ success: false, error: 'Export file missing' });
    }

    const fileName = path.basename(filePath);
    const mimeTypes = {
      csv: 'text/csv',
      json: 'application/json',
      parquet: 'application/octet-stream',
      zip: 'application/zip'
    };

    res.setHeader('Content-Type', mimeTypes[format] ?? 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    const stream = createReadStream(filePath);
    stream.on('error', error => {
      logger.error({ err: error, exportId: id }, 'Failed to stream export file');
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Failed to download export' });
      } else {
        res.destroy(error);
      }
    });
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
}

export async function deleteExport(req, res, next) {
  try {
    const exportJob = await prisma.exportJob.findUnique({
      where: { id: req.params.id }
    });

    if (!exportJob) {
      return res.status(404).json({ success: false, error: 'Export not found' });
    }

    await deleteExportFiles(exportJob);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}
