import { describe, it, expect, beforeEach, vi } from 'vitest';
import axios from 'axios';
import prisma from '../../config/database.js';
import {
  listJobs,
  getJob,
  createJob,
  deleteJob,
  rerunJob
} from '../../controllers/JobsController.js';
import {
  createTestTemplate,
  createTestJob,
  mockedMetrics
} from '../testUtils.js';

function mockResponse() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('JobsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listJobs', () => {
    it('returns paginated jobs with template relation included', async () => {
      const template = await createTestTemplate({ name: 'Main Template' });
      await createTestJob({ templateId: template.id });
      const req = { query: {} };
      const res = mockResponse();
      const next = vi.fn();

      await listJobs(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                template: expect.objectContaining({
                  id: template.id,
                  name: template.name
                })
              })
            ]),
            page: 1,
            pageSize: 20,
            total: 1
          })
        })
      );
      expect(mockedMetrics.setActiveJobCount).toHaveBeenCalledWith(0);
    });

    it('applies filtering by status, type, template, url, and date range', async () => {
      const template = await createTestTemplate({ name: 'Filter Template' });
      await createTestJob({
        status: 'completed',
        type: 'scrape',
        templateId: template.id,
        url: 'https://filter.example.com/task',
        startedAt: new Date('2024-01-10T00:00:00.000Z'),
        createdAt: new Date('2024-01-10T00:00:00.000Z')
      });
      await createTestJob({
        status: 'failed',
        type: 'crawl',
        url: 'https://other.example.com',
        startedAt: new Date('2023-01-01T00:00:00.000Z'),
        createdAt: new Date('2023-01-01T00:00:00.000Z')
      });

      const req = {
        query: {
          status: 'completed',
          type: 'scrape',
          templateId: template.id,
          url: 'FILTER',
          dateFrom: '2024-01-01',
          dateTo: '2024-12-31',
          limit: '200'
        }
      };
      const res = mockResponse();

      await listJobs(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: expect.arrayContaining([
              expect.objectContaining({
                status: 'completed',
                type: 'scrape'
              })
            ]),
            total: 1,
            pageSize: 100
          })
        })
      );
    });

    it('returns empty list when no jobs match filters', async () => {
      const req = { query: { status: 'running' } };
      const res = mockResponse();
      await listJobs(req, res, vi.fn());
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            items: [],
            total: 0
          })
        })
      );
    });
  });

  describe('getJob', () => {
    it('returns job when found', async () => {
      const job = await createTestJob();
      const req = { params: { id: job.id } };
      const res = mockResponse();

      await getJob(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: job.id
          })
        })
      );
    });

    it('returns 404 when job missing', async () => {
      const req = { params: { id: '00000000-0000-0000-0000-000000000000' } };
      const res = mockResponse();
      await getJob(req, res, vi.fn());
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'Job not found'
      });
    });
  });

  describe('createJob', () => {
    it('creates job, increments metrics, and returns 201', async () => {
      const template = await createTestTemplate();
      const req = {
        body: {
          type: 'scrape',
          url: 'https://new.example.com',
          status: 'completed',
          templateId: template.id,
          options: { formats: ['markdown'], onlyMainContent: true },
          results: { markdown: '# Heading' }
        }
      };
      const res = mockResponse();
      res.status = vi.fn().mockReturnValue(res);

      await createJob(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            url: 'https://new.example.com',
            template: expect.objectContaining({ id: template.id })
          })
        })
      );
      expect(mockedMetrics.incrementJobMetric).toHaveBeenCalledWith('scrape', 'completed');
      expect(mockedMetrics.setActiveJobCount).toHaveBeenCalled();
    });
  });

  describe('deleteJob', () => {
    it('deletes job and returns success response', async () => {
      const job = await createTestJob();
      const req = { params: { id: job.id } };
      const res = mockResponse();

      await deleteJob(req, res, vi.fn());

      expect(res.json).toHaveBeenCalledWith({ success: true });
      expect(mockedMetrics.setActiveJobCount).toHaveBeenCalledWith(0);
      const stored = await prisma.scrapeJob.findFirst({ where: { id: job.id } });
      expect(stored).toBeNull();
    });

    it('returns 404 when deleting missing job', async () => {
      const req = { params: { id: '00000000-0000-0000-0000-000000000000' } };
      const res = mockResponse();

      await deleteJob(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Job not found' });
    });
  });

  describe('rerunJob', () => {
    it('reruns scrape job through Firecrawl and creates new entry', async () => {
      const job = await createTestJob({
        type: 'scrape',
        status: 'completed',
        options: { formats: ['markdown'], onlyMainContent: true }
      });
      axios.post.mockResolvedValue({
        data: { success: true, data: { markdown: '# Updated content' } }
      });

      const req = { params: { id: job.id } };
      const res = mockResponse();
      res.status = vi.fn().mockReturnValue(res);

      await rerunJob(req, res, vi.fn());

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/scrape$/),
        job.options,
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'scrape',
            status: 'completed'
          })
        })
      );
      expect(mockedMetrics.incrementJobMetric).toHaveBeenCalledWith('scrape', 'completed');
    });

    it('reruns crawl job and registers running status', async () => {
      const job = await createTestJob({
        type: 'crawl',
        status: 'completed',
        options: { limit: 5, maxDepth: 1, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } }
      });
      axios.post.mockResolvedValue({
        data: { success: true, data: { id: 'crawl-789' } }
      });

      const req = { params: { id: job.id } };
      const res = mockResponse();
      res.status = vi.fn().mockReturnValue(res);

      await rerunJob(req, res, vi.fn());

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/v1\/crawl$/),
        job.options,
        expect.any(Object)
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockedMetrics.incrementJobMetric).toHaveBeenCalledWith('crawl', 'running');
    });

    it('returns 404 when rerunning missing job', async () => {
      const req = { params: { id: '00000000-0000-0000-0000-000000000000' } };
      const res = mockResponse();
      res.status = vi.fn().mockReturnValue(res);

      await rerunJob(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ success: false, error: 'Job not found' });
    });

    it('returns 502 when Firecrawl request fails', async () => {
      const job = await createTestJob({ type: 'scrape' });
      const error = new Error('Firecrawl down');
      error.isAxiosError = true;
      error.response = { data: { error: 'proxy offline' } };
      axios.post.mockRejectedValue(error);

      const req = { params: { id: job.id } };
      const res = mockResponse();
      res.status = vi.fn().mockReturnValue(res);

      await rerunJob(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(502);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: 'proxy offline'
      });
    });
  });
});
