import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import prisma from '../../config/database.js';
import {
  generateExportFiles,
  cleanupExpiredExports
} from '../../services/ExportService.js';
import { createTestJob, resetDatabase } from '../testUtils.js';

vi.mock('../../metrics.js', () => ({
  observeExportFileSize: vi.fn(),
  observeExportDuration: vi.fn(),
  incrementExportExecution: vi.fn(),
  setExportCount: vi.fn()
}));

const tempRoot = path.join(os.tmpdir(), `webscraper-export-tests-${Date.now()}`);

describe('ExportService', () => {
  beforeEach(async () => {
    await fs.mkdir(tempRoot, { recursive: true });
    process.env.WEBSCRAPER_EXPORT_DIR = tempRoot;
    process.env.WEBSCRAPER_EXPORT_TTL_HOURS = '1';
    process.env.WEBSCRAPER_EXPORT_CLEANUP_INTERVAL_HOURS = '1';
    await resetDatabase();
  });

  afterEach(async () => {
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it('generates exports for supported formats (CSV/JSON/Parquet)', async () => {
    await createTestJob({ status: 'completed', url: 'https://example.com/test' });

    const exportJob = await prisma.exportJob.create({
      data: {
        name: 'Multi-format test export',
        exportType: 'jobs',
        formats: ['csv', 'json', 'parquet'],
        status: 'processing'
      }
    });

    const result = await generateExportFiles(exportJob);
    expect(result.rowCount).toBeGreaterThan(0);
    expect(result.filePaths.csv).toBeTruthy();
    expect(result.filePaths.json).toBeTruthy();
    expect(result.filePaths.parquet).toBeTruthy();

    // Verify files exist and have content
    expect(await fs.stat(result.filePaths.csv)).toBeTruthy();
    expect((await fs.stat(result.filePaths.csv)).size).toBeGreaterThan(0);

    expect(await fs.stat(result.filePaths.json)).toBeTruthy();
    expect((await fs.stat(result.filePaths.json)).size).toBeGreaterThan(0);

    expect(await fs.stat(result.filePaths.parquet)).toBeTruthy();
    expect((await fs.stat(result.filePaths.parquet)).size).toBeGreaterThan(0);
  });

  it('generates ZIP archive when multiple formats requested', async () => {
    await createTestJob({ status: 'completed', url: 'https://example.com/test' });

    const exportJob = await prisma.exportJob.create({
      data: {
        name: 'ZIP archive test',
        exportType: 'jobs',
        formats: ['csv', 'json', 'parquet'],
        status: 'processing'
      }
    });

    const result = await generateExportFiles(exportJob);
    expect(result.filePaths.zip).toBeTruthy();
    expect(await fs.stat(result.filePaths.zip)).toBeTruthy();
    expect((await fs.stat(result.filePaths.zip)).size).toBeGreaterThan(0);
  });

  it('cleans up expired exports and deletes files', async () => {
    const exportDir = path.join(tempRoot, 'expired');
    await fs.mkdir(exportDir, { recursive: true });
    const filePath = path.join(exportDir, 'jobs.csv');
    await fs.writeFile(filePath, 'id');

    await prisma.exportJob.create({
      data: {
        name: 'Expired export',
        exportType: 'jobs',
        formats: ['csv'],
        status: 'completed',
        filePaths: { csv: filePath },
        expiresAt: new Date(Date.now() - 60_000)
      }
    });

    await cleanupExpiredExports();

    const remaining = await prisma.exportJob.count();
    expect(remaining).toBe(0);
    await expect(fs.access(filePath)).rejects.toThrow();
  });
});
