import { promises as fs, createWriteStream } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from 'stream/promises';
import { Readable, Transform } from 'stream';
import archiver from 'archiver';
import { AsyncParser } from '@json2csv/node';
import { ParquetSchema, ParquetWriter } from '@dsnp/parquetjs';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import {
  incrementExportExecution,
  observeExportDuration,
  observeExportFileSize,
  setExportCount
} from '../metrics.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_EXPORT_DIR =
  process.env.WEBSCRAPER_EXPORT_DIR || path.join(process.cwd(), 'tmp', 'webscraper-exports');
const _EXPORT_TTL_HOURS = Number(process.env.WEBSCRAPER_EXPORT_TTL_HOURS ?? 24);
const CLEANUP_INTERVAL_HOURS = Number(process.env.WEBSCRAPER_EXPORT_CLEANUP_INTERVAL_HOURS ?? 6);
const MAX_ROWS = Number(process.env.WEBSCRAPER_EXPORT_MAX_ROWS ?? 100_000);
const MAX_FILE_SIZE_MB = Number(process.env.WEBSCRAPER_EXPORT_MAX_FILE_SIZE_MB ?? 500);

// Average bytes per row by format (conservative estimates)
const BYTES_PER_ROW = {
  jobs: {
    csv: 150,    // Basic fields with some URLs
    json: 300,   // JSON has more overhead due to field names
    parquet: 100 // Parquet is compressed
  },
  templates: {
    csv: 100,    // Shorter content, fewer fields
    json: 200,   // JSON overhead
    parquet: 75  // Parquet compression
  },
  schedules: {
    csv: 120,    // Medium-sized content
    json: 250,   // JSON overhead
    parquet: 90  // Parquet compression
  }
};

const cleanupTimers = new Set();

function estimateRowCount(exportType, filters = {}) {
  switch (exportType) {
    case 'jobs':
      // For jobs, we can actually count with filters since it's the main focus
      return prisma.scrapeJob.count({
        where: filters,
      });
    case 'templates':
      // Templates are usually few, just count them all
      return prisma.template.count();
    case 'schedules':
      // Schedules are also relatively few
      return prisma.jobSchedule.count();
    default:
      throw new Error(`Unknown export type: ${exportType}`);
  }
}

async function estimateExportSize(exportType, formats, filters = {}) {
  // Get row count first
  const rowCount = Math.min(
    await estimateRowCount(exportType, filters),
    MAX_ROWS
  );

  // Calculate size for each format
  const sizes = formats.map(format => {
    const bytesPerRow = BYTES_PER_ROW[exportType]?.[format] ?? 200; // Default to 200 bytes if unknown
    return rowCount * bytesPerRow;
  });

  // Sum all formats plus 10% overhead for zip
  const totalBytes = sizes.reduce((sum, size) => sum + size, 0);
  const withZipOverhead = formats.length > 1 ? totalBytes * 1.1 : totalBytes;

  return {
    estimatedBytes: Math.ceil(withZipOverhead),
    estimatedRows: rowCount
  };
}

function getExportDir(exportId) {
  return path.join(DEFAULT_EXPORT_DIR, exportId);
}

async function ensureExportDirectory(exportId) {
  const exportDir = getExportDir(exportId);
  await fs.mkdir(exportDir, { recursive: true });
  return exportDir;
}

function flattenJob(job) {
  return {
    id: job.id,
    type: job.type,
    url: job.url,
    status: job.status,
    templateName: job.template?.name ?? null,
    templateId: job.templateId ?? null,
    scheduleId: job.scheduleId ?? null,
    startedAt: job.startedAt?.toISOString?.() ?? null,
    completedAt: job.completedAt?.toISOString?.() ?? null,
    durationSeconds: job.duration ?? null,
    error: job.error ?? null,
    createdAt: job.createdAt?.toISOString?.() ?? null,
    updatedAt: job.updatedAt?.toISOString?.() ?? null
  };
}

function flattenTemplate(template) {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? null,
    urlPattern: template.urlPattern ?? null,
    usageCount: template.usageCount,
    createdAt: template.createdAt?.toISOString?.() ?? null,
    updatedAt: template.updatedAt?.toISOString?.() ?? null
  };
}

function flattenSchedule(schedule) {
  return {
    id: schedule.id,
    name: schedule.name,
    description: schedule.description ?? null,
    templateId: schedule.templateId ?? null,
    url: schedule.url,
    scheduleType: schedule.scheduleType,
    cronExpression: schedule.cronExpression ?? null,
    intervalSeconds: schedule.intervalSeconds ?? null,
    scheduledAt: schedule.scheduledAt?.toISOString?.() ?? null,
    enabled: schedule.enabled,
    lastRunAt: schedule.lastRunAt?.toISOString?.() ?? null,
    nextRunAt: schedule.nextRunAt?.toISOString?.() ?? null,
    runCount: schedule.runCount,
    failureCount: schedule.failureCount,
    createdAt: schedule.createdAt?.toISOString?.() ?? null,
    updatedAt: schedule.updatedAt?.toISOString?.() ?? null
  };
}

function getJobParquetSchema() {
  return new ParquetSchema({
    id: { type: 'UTF8' },
    type: { type: 'UTF8' },
    url: { type: 'UTF8' },
    status: { type: 'UTF8' },
    templateName: { type: 'UTF8', optional: true },
    templateId: { type: 'UTF8', optional: true },
    scheduleId: { type: 'UTF8', optional: true },
    startedAt: { type: 'TIMESTAMP_MICROS', optional: true },
    completedAt: { type: 'TIMESTAMP_MICROS', optional: true },
    durationSeconds: { type: 'INT64', optional: true },
    error: { type: 'UTF8', optional: true },
    createdAt: { type: 'TIMESTAMP_MICROS', optional: true },
    updatedAt: { type: 'TIMESTAMP_MICROS', optional: true }
  });
}

function getTemplateParquetSchema() {
  return new ParquetSchema({
    id: { type: 'UTF8' },
    name: { type: 'UTF8' },
    description: { type: 'UTF8', optional: true },
    urlPattern: { type: 'UTF8', optional: true },
    usageCount: { type: 'INT64' },
    createdAt: { type: 'TIMESTAMP_MICROS', optional: true },
    updatedAt: { type: 'TIMESTAMP_MICROS', optional: true }
  });
}

function getScheduleParquetSchema() {
  return new ParquetSchema({
    id: { type: 'UTF8' },
    name: { type: 'UTF8' },
    description: { type: 'UTF8', optional: true },
    templateId: { type: 'UTF8', optional: true },
    url: { type: 'UTF8' },
    scheduleType: { type: 'UTF8' },
    cronExpression: { type: 'UTF8', optional: true },
    intervalSeconds: { type: 'INT64', optional: true },
    scheduledAt: { type: 'TIMESTAMP_MICROS', optional: true },
    enabled: { type: 'BOOLEAN' },
    lastRunAt: { type: 'TIMESTAMP_MICROS', optional: true },
    nextRunAt: { type: 'TIMESTAMP_MICROS', optional: true },
    runCount: { type: 'INT64' },
    failureCount: { type: 'INT64' },
    createdAt: { type: 'TIMESTAMP_MICROS', optional: true },
    updatedAt: { type: 'TIMESTAMP_MICROS', optional: true }
  });
}

function toTimestampMicros(isoString) {
  if (!isoString) {
    return null;
  }
  const date = new Date(isoString);
  return date.getTime() * 1000;
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) {
    return 0;
  }
  return bytes;
}

async function calculateFileSize(filePath) {
  try {
    const stat = await fs.stat(filePath);
    return stat.size;
  } catch (error) {
    logger.warn({ err: error, filePath }, 'Failed to calculate file size');
    return 0;
  }
}

async function exportDataToCSV(dataGenerator, fields, filePath) {
  let rowCount = 0;
  const parser = new AsyncParser({
    fields,
    withBOM: true
  });

  const transformStream = new Transform({
    objectMode: true,
    transform: async function(data, encoding, callback) {
      rowCount++;
      callback(null, data);
    }
  });

  const input = Readable.from(dataGenerator);
  const csvStream = parser.parse(input);
  await pipeline(csvStream, transformStream, createWriteStream(filePath));

  return {
    filePath,
    rowCount
  };
}

async function exportDataToParquet(dataGenerator, schema, filePath) {
  let rowCount = 0;
  const writer = await ParquetWriter.openFile(schema, filePath, {
    useDataPageV2: false
  });

  try {
    for await (const data of dataGenerator) {
      await writer.appendRow(data);
      rowCount++;
    }
    await writer.close();
    return {
      filePath,
      rowCount
    };
  } catch (error) {
    await writer.close().catch(() => {}); // Best effort close on error
    throw error;
  }
}

async function exportDataToJSON(dataGenerator, filePath) {
  let rowCount = 0;
  const stream = createWriteStream(filePath, { encoding: 'utf-8' });

  const transformStream = new Transform({
    objectMode: true,
    transform: function(data, encoding, callback) {
      if (rowCount === 0) {
        // Write opening bracket for first item
        this.push('[\n');
      } else {
        // Write comma and newline for subsequent items
        this.push(',\n');
      }
      // Write the item indented by 2 spaces
      this.push('  ' + JSON.stringify(data));
      rowCount++;
      callback();
    },
    flush: function(callback) {
      // Write closing bracket and newline at the end
      this.push('\n]');
      callback();
    }
  });

  const input = Readable.from(dataGenerator);
  await pipeline(input, transformStream, stream);

  return {
    filePath,
    rowCount
  };
}

async function createZipArchive(files, outputPath) {
  return new Promise((resolve, reject) => {
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = createWriteStream(outputPath);

    output.on('close', () => resolve({ filePath: outputPath, size: archive.pointer() }));
    archive.on('error', error => reject(error));

    archive.pipe(output);
    for (const file of files) {
      archive.file(file.filePath, { name: path.basename(file.filePath) });
    }
    archive.finalize();
  });
}

async function* fetchJobs(filters = {}) {
  const where = {};

  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.type) {
    where.type = filters.type;
  }
  if (filters.templateId) {
    where.templateId = filters.templateId;
  }
  if (filters.url) {
    where.url = { contains: filters.url, mode: 'insensitive' };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.startedAt = {};
    if (filters.dateFrom) {
      where.startedAt.gte = new Date(filters.dateFrom);
    }
    if (filters.dateTo) {
      where.startedAt.lte = new Date(filters.dateTo);
    }
  }

  const batchSize = 1000;
  let skip = 0;
  let rowCount = 0;

  while (true) {
    const batch = await prisma.scrapeJob.findMany({
      where,
      include: { template: true },
      orderBy: { startedAt: 'desc' },
      skip,
      take: batchSize
    });
    if (!batch.length) {
      break;
    }
    for (const job of batch) {
      if (rowCount >= MAX_ROWS) {
        logger.warn(
          { limit: MAX_ROWS },
          'Export reached configured MAX_ROWS limit; remaining rows will be omitted'
        );
        return;
      }
      yield job;
      rowCount++;
    }
    skip += batch.length;
  }
}

async function* fetchTemplates() {
  const batchSize = 1000;
  let skip = 0;
  let rowCount = 0;

  while (true) {
    const batch = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: batchSize
    });
    if (!batch.length) {
      break;
    }
    for (const template of batch) {
      if (rowCount >= MAX_ROWS) {
        logger.warn(
          { limit: MAX_ROWS },
          'Export reached configured MAX_ROWS limit; remaining rows will be omitted'
        );
        return;
      }
      yield template;
      rowCount++;
    }
    skip += batch.length;
  }
}

async function* fetchSchedules() {
  const batchSize = 1000;
  let skip = 0;
  let rowCount = 0;

  while (true) {
    const batch = await prisma.jobSchedule.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: batchSize
    });
    if (!batch.length) {
      break;
    }
    for (const schedule of batch) {
      if (rowCount >= MAX_ROWS) {
        logger.warn(
          { limit: MAX_ROWS },
          'Export reached configured MAX_ROWS limit; remaining rows will be omitted'
        );
        return;
      }
      yield schedule;
      rowCount++;
    }
    skip += batch.length;
  }
}

// buildJobsDataset, buildTemplatesDataset and buildSchedulesDataset have been
// replaced with generator functions in their respective export functions

async function generateJobsExport(exportJob) {
  const exportDir = await ensureExportDirectory(exportJob.id);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const filesGenerated = [];

  // Generate flattened and parquet-ready iterables upfront
  async function* getFlattenedJobs() {
    for await (const job of fetchJobs(exportJob.filters || {})) {
      yield flattenJob({ ...job });
    }
  }

  async function* getParquetJobs() {
    for await (const job of fetchJobs(exportJob.filters || {})) {
      const flat = flattenJob({ ...job });
      yield {
        ...flat,
        startedAt: toTimestampMicros(flat.startedAt),
        completedAt: toTimestampMicros(flat.completedAt),
        createdAt: toTimestampMicros(flat.createdAt),
        updatedAt: toTimestampMicros(flat.updatedAt)
      };
    }
  }

  const defaultRow = {
    id: '',
    type: '',
    url: '',
    status: '',
    templateName: null,
    templateId: null,
    scheduleId: null,
    startedAt: null,
    completedAt: null,
    durationSeconds: null,
    error: null,
    createdAt: null,
    updatedAt: null
  };

  let totalRowCount = 0;
  if (exportJob.formats.includes('csv')) {
    const csvPath = path.join(exportDir, `jobs-${timestamp}.csv`);
    // Use first row to get fields, then restart the generator
    const fields = Object.keys((await (await getFlattenedJobs().next()).value) || defaultRow);
    const result = await exportDataToCSV(getFlattenedJobs(), fields, csvPath);
    filesGenerated.push({ filePath: csvPath, format: 'csv' });
    totalRowCount = result.rowCount;
  }

  if (exportJob.formats.includes('json')) {
    const jsonPath = path.join(exportDir, `jobs-${timestamp}.json`);
    const result = await exportDataToJSON(getFlattenedJobs(), jsonPath);
    filesGenerated.push({ filePath: jsonPath, format: 'json' });
    totalRowCount = result.rowCount;
  }

  if (exportJob.formats.includes('parquet')) {
    const parquetPath = path.join(exportDir, `jobs-${timestamp}.parquet`);
    const schema = getJobParquetSchema();
    const result = await exportDataToParquet(getParquetJobs(), schema, parquetPath);
    filesGenerated.push({ filePath: parquetPath, format: 'parquet' });
    totalRowCount = result.rowCount;
  }

  return {
    filesGenerated,
    rowCount: totalRowCount
  };
}

async function generateTemplatesExport(exportJob) {
  const exportDir = await ensureExportDirectory(exportJob.id);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const filesGenerated = [];

  // Generate flattened and parquet-ready iterables upfront
  async function* getFlattenedTemplates() {
    for await (const template of fetchTemplates()) {
      yield flattenTemplate(template);
    }
  }

  async function* getParquetTemplates() {
    for await (const template of fetchTemplates()) {
      const flat = flattenTemplate(template);
      yield {
        ...flat,
        createdAt: toTimestampMicros(flat.createdAt),
        updatedAt: toTimestampMicros(flat.updatedAt)
      };
    }
  }

  const defaultRow = {
    id: '',
    name: '',
    description: null,
    urlPattern: null,
    usageCount: 0,
    createdAt: null,
    updatedAt: null
  };

  let totalRowCount = 0;
  if (exportJob.formats.includes('csv')) {
    const csvPath = path.join(exportDir, `templates-${timestamp}.csv`);
    // Use first row to get fields, then restart the generator
    const fields = Object.keys((await (await getFlattenedTemplates().next()).value) || defaultRow);
    const result = await exportDataToCSV(getFlattenedTemplates(), fields, csvPath);
    filesGenerated.push({ filePath: csvPath, format: 'csv' });
    totalRowCount = result.rowCount;
  }

  if (exportJob.formats.includes('json')) {
    const jsonPath = path.join(exportDir, `templates-${timestamp}.json`);
    const result = await exportDataToJSON(getFlattenedTemplates(), jsonPath);
    filesGenerated.push({ filePath: jsonPath, format: 'json' });
    totalRowCount = result.rowCount;
  }

  if (exportJob.formats.includes('parquet')) {
    const parquetPath = path.join(exportDir, `templates-${timestamp}.parquet`);
    const schema = getTemplateParquetSchema();
    const result = await exportDataToParquet(getParquetTemplates(), schema, parquetPath);
    filesGenerated.push({ filePath: parquetPath, format: 'parquet' });
    totalRowCount = result.rowCount;
  }

  return {
    filesGenerated,
    rowCount: totalRowCount
  };
}

async function generateSchedulesExport(exportJob) {
  const exportDir = await ensureExportDirectory(exportJob.id);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '');
  const filesGenerated = [];

  // Generate flattened and parquet-ready iterables upfront
  async function* getFlattenedSchedules() {
    for await (const schedule of fetchSchedules()) {
      yield flattenSchedule(schedule);
    }
  }

  async function* getParquetSchedules() {
    for await (const schedule of fetchSchedules()) {
      const flat = flattenSchedule(schedule);
      yield {
        ...flat,
        scheduledAt: toTimestampMicros(flat.scheduledAt),
        lastRunAt: toTimestampMicros(flat.lastRunAt),
        nextRunAt: toTimestampMicros(flat.nextRunAt),
        createdAt: toTimestampMicros(flat.createdAt),
        updatedAt: toTimestampMicros(flat.updatedAt)
      };
    }
  }

  const defaultRow = {
    id: '',
    name: '',
    description: null,
    templateId: null,
    url: '',
    scheduleType: '',
    cronExpression: null,
    intervalSeconds: null,
    scheduledAt: null,
    enabled: false,
    lastRunAt: null,
    nextRunAt: null,
    runCount: 0,
    failureCount: 0,
    createdAt: null,
    updatedAt: null
  };

  let totalRowCount = 0;
  if (exportJob.formats.includes('csv')) {
    const csvPath = path.join(exportDir, `schedules-${timestamp}.csv`);
    // Use first row to get fields, then restart the generator
    const fields = Object.keys((await (await getFlattenedSchedules().next()).value) || defaultRow);
    const result = await exportDataToCSV(getFlattenedSchedules(), fields, csvPath);
    filesGenerated.push({ filePath: csvPath, format: 'csv' });
    totalRowCount = result.rowCount;
  }

  if (exportJob.formats.includes('json')) {
    const jsonPath = path.join(exportDir, `schedules-${timestamp}.json`);
    const result = await exportDataToJSON(getFlattenedSchedules(), jsonPath);
    filesGenerated.push({ filePath: jsonPath, format: 'json' });
    totalRowCount = result.rowCount;
  }

  if (exportJob.formats.includes('parquet')) {
    const parquetPath = path.join(exportDir, `schedules-${timestamp}.parquet`);
    const schema = getScheduleParquetSchema();
    const result = await exportDataToParquet(getParquetSchedules(), schema, parquetPath);
    filesGenerated.push({ filePath: parquetPath, format: 'parquet' });
    totalRowCount = result.rowCount;
  }

  return {
    filesGenerated,
    rowCount: totalRowCount
  };
}

async function generateExportZip(exportJob, files) {
  if (files.length <= 1) {
    return null;
  }
  const exportDir = getExportDir(exportJob.id);
  const zipPath = path.join(exportDir, `export-${exportJob.id}.zip`);
  const result = await createZipArchive(files, zipPath);
  return { filePath: zipPath, format: 'zip', size: result.size };
}

async function deleteFileSafe(filePath) {
  if (!filePath) {
    return;
  }
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      logger.warn({ err: error, filePath }, 'Failed to delete export file');
    }
  }
}

async function deleteDirectorySafe(dirPath) {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    logger.warn({ err: error, dirPath }, 'Failed to delete export directory');
  }
}

function isPathWithinExportDir(filePath) {
  // Resolve both paths to absolute paths and handle any '..' or '.' in the paths
  const realExportDir = path.resolve(DEFAULT_EXPORT_DIR);
  const realFilePath = path.resolve(filePath);
  return realFilePath.startsWith(realExportDir);
}

async function cleanupExportFiles(exportJob) {
  const exportDir = getExportDir(exportJob.id);

  // First validate the export directory is within the allowed directory
  if (!isPathWithinExportDir(exportDir)) {
    logger.error(
      { exportId: exportJob.id, exportDir },
      'Attempt to delete directory outside of export directory'
    );
    return;
  }

  if (exportJob.filePaths && typeof exportJob.filePaths === 'object') {
    const paths = Object.values(exportJob.filePaths).filter(Boolean);
    for (const filePath of paths) {
      // Validate each file path before deletion
      if (!isPathWithinExportDir(filePath)) {
        logger.error(
          { exportId: exportJob.id, filePath },
          'Attempt to delete file outside of export directory'
        );
        continue;
      }
      await deleteFileSafe(filePath);
    }
  }

  await deleteDirectorySafe(exportDir);
}

async function cleanupExpiredExports() {
  const expired = await prisma.exportJob.findMany({
    where: {
      status: 'completed',
      expiresAt: { lt: new Date() }
    }
  });

  if (!expired.length) {
    return;
  }

  for (const exp of expired) {
    await cleanupExportFiles(exp);
    await prisma.exportJob.delete({ where: { id: exp.id } });
  }

  logger.info({ count: expired.length }, 'Export cleanup completed');
  await refreshExportGauge();
}

async function refreshExportGauge() {
  const grouped = await prisma.exportJob.groupBy({
    by: ['status', 'exportType'],
    _count: { _all: true }
  });

  const seen = new Set();
  for (const group of grouped) {
    const key = `${group.status}:${group.exportType}`;
    seen.add(key);
    setExportCount(group.status, group.exportType, group._count._all);
  }

  const statuses = ['pending', 'processing', 'completed', 'failed'];
  const types = ['jobs', 'templates', 'schedules', 'results'];
  for (const status of statuses) {
    for (const type of types) {
      const key = `${status}:${type}`;
      if (!seen.has(key)) {
        setExportCount(status, type, 0);
      }
    }
  }
}

export async function initializeExportCleanup() {
  await fs.mkdir(DEFAULT_EXPORT_DIR, { recursive: true });
  await refreshExportGauge();

  const intervalMs = CLEANUP_INTERVAL_HOURS * 60 * 60 * 1000;
  if (intervalMs <= 0) {
    return;
  }

  const timer = setInterval(() => {
    cleanupExpiredExports().catch(error => {
      logger.error({ err: error }, 'Export cleanup task failed');
    });
  }, intervalMs);

  cleanupTimers.add(timer);
}

export async function shutdownExportCleanup() {
  for (const timer of cleanupTimers) {
    clearInterval(timer);
  }
  cleanupTimers.clear();
}

export async function generateExportFiles(exportJob) {
  const startedAt = Date.now();
  const filesGenerated = new Set(); // Keep track of all generated files

  // Estimate size before proceeding
  const { estimatedBytes, estimatedRows: _estimatedRows } = await estimateExportSize(
    exportJob.exportType,
    exportJob.formats,
    exportJob.filters || {}
  );

  // Check against MAX_FILE_SIZE_MB limit
  const maxAllowedBytes = MAX_FILE_SIZE_MB * 1024 * 1024;
  if (maxAllowedBytes > 0 && estimatedBytes > maxAllowedBytes) {
    throw new Error(`Estimated export size (${Math.ceil(estimatedBytes/1024/1024)} MB) exceeds limit (${MAX_FILE_SIZE_MB} MB). Try reducing the date range or adding filters.`);
  }

  try {
    let result;
    if (exportJob.exportType === 'jobs') {
      result = await generateJobsExport(exportJob);
    } else if (exportJob.exportType === 'templates') {
      result = await generateTemplatesExport(exportJob);
    } else if (exportJob.exportType === 'schedules') {
      result = await generateSchedulesExport(exportJob);
    } else {
      throw new Error(`Unsupported export type: ${exportJob.exportType}`);
    }

    // Track all generated files
    for (const file of result.filesGenerated) {
      filesGenerated.add(file.filePath);
    }

    const zip = await generateExportZip(exportJob, result.filesGenerated);
    if (zip) {
      result.filesGenerated.push(zip);
      filesGenerated.add(zip.filePath);
    }

    const filePaths = {};
    for (const file of result.filesGenerated) {
      filePaths[file.format] = file.filePath;
    }

    const sizes = await Promise.all(
      result.filesGenerated.map(file => calculateFileSize(file.filePath))
    );

    const totalBytes = sizes.reduce((sum, size) => sum + formatBytes(size), 0);
    const maxAllowedBytes = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (maxAllowedBytes > 0 && totalBytes > maxAllowedBytes) {
      logger.warn(
        {
          exportId: exportJob.id,
          actualMB: Math.ceil(totalBytes/1024/1024),
          estimatedMB: Math.ceil(estimatedBytes/1024/1024),
          maxMB: MAX_FILE_SIZE_MB
        },
        'Export exceeded size limit'
      );
      throw new Error(`Export size (${Math.ceil(totalBytes/1024/1024)} MB) exceeds limit (${MAX_FILE_SIZE_MB} MB)`);
    }

    // Log significant estimation deviations
    const sizeDiffPercent = Math.abs((totalBytes - estimatedBytes) / estimatedBytes * 100);
    if (sizeDiffPercent > 20) {
      logger.warn(
        {
          exportId: exportJob.id,
          actualBytes: totalBytes,
          estimatedBytes,
          diffPercent: sizeDiffPercent.toFixed(1)
        },
        'Export size estimation deviated significantly from actual size'
      );
    }

    const durationSeconds = (Date.now() - startedAt) / 1000;
    for (const file of result.filesGenerated) {
      const size = await calculateFileSize(file.filePath);
      observeExportFileSize(exportJob.exportType, file.format, size);
      observeExportDuration(exportJob.exportType, file.format, durationSeconds);
    }
    incrementExportExecution(exportJob.exportType, 'completed');

    return {
      filePaths,
      rowCount: result.rowCount,
      fileSizeBytes: totalBytes,
      durationSeconds
    };
  } catch (error) {
    logger.error({ err: error, exportId: exportJob.id }, 'Failed to generate export');

    // Clean up all generated files on failure
    for (const filePath of filesGenerated) {
      await deleteFileSafe(filePath);
    }
    await deleteDirectorySafe(getExportDir(exportJob.id));

    incrementExportExecution(exportJob.exportType, 'failed');
    throw error;
  }
}

export async function deleteExport(exportJob) {
  await cleanupExportFiles(exportJob);
  await prisma.exportJob.delete({ where: { id: exportJob.id } });
  await refreshExportGauge();
}

export { cleanupExpiredExports, refreshExportGauge };
