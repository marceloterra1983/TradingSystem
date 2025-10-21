import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PassThrough } from 'node:stream';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  listExports,
  getExport,
  createExport,
  downloadExport,
  deleteExport
} from '../../controllers/ExportsController.js';
import prisma from '../../config/database.js';
import { resetDatabase } from '../testUtils.js';
import { mockExportCompleted, mockExportProcessing } from '../fixtures/exports.js';

vi.mock('../../services/ExportService.js', () => {
  return {
    generateExportFiles: vi.fn(async () => ({
      filePaths: {
        csv: '/tmp/webscraper-exports/mock/jobs.csv'
      },
      rowCount: 10,
      fileSizeBytes: 1024,
      durationSeconds: 1
    })),
    deleteExport: vi.fn(async exportJob => {
      await prisma.exportJob.delete({ where: { id: exportJob.id } });
    }),
    refreshExportGauge: vi.fn(),
    writeExportMetadata: vi.fn()
  };
});

const ExportService = await import('../../services/ExportService.js');

function mockResponse() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn();
  res.headersSent = false;
  return res;
}

function createStreamResponse() {
  const stream = new PassThrough();
  stream.status = vi.fn().mockReturnValue(stream);
  stream.json = vi.fn().mockReturnValue(stream);
  stream.setHeader = vi.fn();
  stream.headersSent = false;
  return stream;
}

describe('ExportsController', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await resetDatabase();
  });

  describe('listExports', () => {
    it('returns paginated export jobs with standardized pagination shape', async () => {
      await prisma.exportJob.create({ data: mockExportProcessing });
      await prisma.exportJob.create({ data: { ...mockExportCompleted, id: 'export-4', createdAt: new Date(Date.now() + 1_000) } });

      const res = mockResponse();
      await listExports({ query: { page: 1, pageSize: 20 } }, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items: expect.arrayContaining([expect.objectContaining({ id: 'export-4' })]),
            total: 2,
            page: 1,
            pageSize: 20,
          })
        })
      );

      const { items, page, pageSize, total } = res.json.mock.calls[0][0].data;
      expect(items[0].id).toBe('export-4');
      expect(page).toBe(1);
      expect(pageSize).toBe(20);
      expect(total).toBe(2);
    });
  });

  describe('getExport', () => {
    it('returns export metadata when found', async () => {
      const created = await prisma.exportJob.create({ data: mockExportCompleted });
      const res = mockResponse();
      await getExport({ params: { id: created.id } }, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ id: created.id })
        })
      );
    });

    it('returns 404 when export missing', async () => {
      const res = mockResponse();
      await getExport({ params: { id: '00000000-0000-0000-0000-000000000000' } }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns 404 when export expired', async () => {
      const expired = await prisma.exportJob.create({
        data: {
          ...mockExportCompleted,
          id: 'export-expired',
          expiresAt: new Date(Date.now() - 60_000)
        }
      });
      const res = mockResponse();
      await getExport({ params: { id: expired.id } }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('createExport', () => {
    it('persists export and triggers background generation', async () => {
      const res = mockResponse();
      const req = {
        body: {
          name: 'Jobs snapshot',
          exportType: 'jobs',
          formats: ['csv'],
          filters: { status: 'completed' }
        }
      };
      await createExport(req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(202);
      const exportId = res.json.mock.calls[0][0].data.id;
      expect(exportId).toBeDefined();

      await new Promise(resolve => setImmediate(resolve));

      const updated = await prisma.exportJob.findUnique({ where: { id: exportId } });
      expect(updated?.status).toBe('completed');
      expect(ExportService.generateExportFiles).toHaveBeenCalled();
    });
  });

  describe('downloadExport', () => {
    const tempDir = path.join(process.cwd(), 'tmp-tests');

    beforeEach(async () => {
      await fs.mkdir(tempDir, { recursive: true });
    });

    it('streams CSV file with correct Content-Type header', async () => {
      const filePath = path.join(tempDir, 'jobs.csv');
      await fs.writeFile(filePath, 'id,type\n1,scrape');
      const exportJob = await prisma.exportJob.create({
        data: {
          ...mockExportCompleted,
          filePaths: { csv: filePath }
        }
      });

      const res = createStreamResponse();
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      const promise = new Promise(resolve => res.on('finish', resolve));

      await downloadExport({ params: { id: exportJob.id, format: 'csv' } }, res, vi.fn());
      await promise;

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(Buffer.concat(chunks).toString()).toContain('id,type');
    });

    it('streams Parquet file with correct Content-Type header', async () => {
      const filePath = path.join(tempDir, 'jobs.parquet');
      await fs.writeFile(filePath, Buffer.from([1, 2, 3])); // Mock Parquet file content
      const exportJob = await prisma.exportJob.create({
        data: {
          ...mockExportCompleted,
          filePaths: { parquet: filePath }
        }
      });

      const res = createStreamResponse();
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      const promise = new Promise(resolve => res.on('finish', resolve));

      await downloadExport({ params: { id: exportJob.id, format: 'parquet' } }, res, vi.fn());
      await promise;

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
      expect(Buffer.concat(chunks)).toEqual(Buffer.from([1, 2, 3]));
    });

    it('streams ZIP archive with correct Content-Type header', async () => {
      const filePath = path.join(tempDir, 'export.zip');
      await fs.writeFile(filePath, Buffer.from([80, 75, 3, 4])); // Mock ZIP file header
      const exportJob = await prisma.exportJob.create({
        data: {
          ...mockExportCompleted,
          filePaths: { zip: filePath }
        }
      });

      const res = createStreamResponse();
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      const promise = new Promise(resolve => res.on('finish', resolve));

      await downloadExport({ params: { id: exportJob.id, format: 'zip' } }, res, vi.fn());
      await promise;

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/zip');
      expect(Buffer.concat(chunks)).toEqual(Buffer.from([80, 75, 3, 4]));
    });

    it('returns 404 when export missing', async () => {
      const res = mockResponse();
      await downloadExport({ params: { id: 'missing', format: 'csv' } }, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  describe('deleteExport', () => {
    it('removes export via service', async () => {
      const created = await prisma.exportJob.create({ data: mockExportCompleted });
      const res = mockResponse();
      await deleteExport({ params: { id: created.id } }, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith({ success: true });
      const after = await prisma.exportJob.findUnique({ where: { id: created.id } });
      expect(after).toBeNull();
    });
  });
});
