import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import axios from 'axios';
import {
  createTestTemplate,
  createTestJob,
  mockedMetrics
} from '../testUtils.js';

process.env.WEBSCRAPER_API_RATE_LIMIT_MAX = '2';
process.env.WEBSCRAPER_API_RATE_LIMIT_WINDOW_MS = '1000';

const { default: app } = await import('../../server.js');

describe('WebScraper API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Health and observability', () => {
    it('returns service metadata', async () => {
      const response = await request(app).get('/');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          service: 'webscraper-api'
        })
      );
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('reports healthy database connection', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
          status: 'ok'
        })
      );
    });

    it('exposes Prometheus metrics', async () => {
      const response = await request(app).get('/metrics');
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('# mock metrics');
    });
  });

  describe('Templates API', () => {
    it('supports end-to-end lifecycle', async () => {
      const createPayload = {
        name: 'Integration Template',
        description: 'Created via integration test',
        urlPattern: '.*/integration/.*',
        options: { formats: ['markdown'], onlyMainContent: true }
      };

      const createResponse = await request(app).post('/api/v1/templates').send(createPayload);
      expect(createResponse.status).toBe(201);
      const createdTemplate = createResponse.body.data;

      const listResponse = await request(app).get('/api/v1/templates');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.some(item => item.id === createdTemplate.id)).toBe(true);

      const getResponse = await request(app).get(`/api/v1/templates/${createdTemplate.id}`);
      expect(getResponse.status).toBe(200);

      const updateResponse = await request(app)
        .put(`/api/v1/templates/${createdTemplate.id}`)
        .send({
          name: 'Integration Template Updated',
          description: 'Updated description',
          options: { formats: ['markdown', 'html'], onlyMainContent: true }
        });
      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe('Integration Template Updated');

      const exportResponse = await request(app).get('/api/v1/templates/export');
      expect(exportResponse.status).toBe(200);
      expect(Array.isArray(exportResponse.body.data)).toBe(true);

      const importResponse = await request(app)
        .post('/api/v1/templates/import')
        .send([
          {
            name: 'Bulk Template',
            description: 'Imported template',
            options: { formats: ['markdown'], onlyMainContent: true }
          }
        ]);
      expect(importResponse.status).toBe(201);

      const deleteResponse = await request(app).delete(`/api/v1/templates/${createdTemplate.id}`);
      expect(deleteResponse.status).toBe(200);
    });
  });

  describe('Jobs API', () => {
    it('creates, lists, retrieves, deletes, and reruns jobs', async () => {
      const template = await createTestTemplate({ name: 'Integration Template Job' });

      const createResponse = await request(app)
        .post('/api/v1/jobs')
        .send({
          type: 'scrape',
          url: 'https://integration.example.com/page',
          status: 'completed',
          templateId: template.id,
          options: { formats: ['markdown'], onlyMainContent: true },
          results: { markdown: '# Integration Job' }
        });
      expect(createResponse.status).toBe(201);
      const job = createResponse.body.data;

      const listResponse = await request(app).get('/api/v1/jobs');
      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data.items.some(item => item.id === job.id)).toBe(true);

      const filterResponse = await request(app)
        .get('/api/v1/jobs')
        .query({ status: 'completed', templateId: template.id, url: 'Integration' });
      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data.total).toBe(1);

      const getResponse = await request(app).get(`/api/v1/jobs/${job.id}`);
      expect(getResponse.status).toBe(200);

      axios.post.mockResolvedValueOnce({
        data: { success: true, data: { markdown: '# Re-run' } }
      });
      const rerunResponse = await request(app).post(`/api/v1/jobs/${job.id}/rerun`);
      expect(rerunResponse.status).toBe(201);
      expect(mockedMetrics.incrementJobMetric).toHaveBeenCalled();

      const deleteResponse = await request(app).delete(`/api/v1/jobs/${job.id}`);
      expect(deleteResponse.status).toBe(200);
    });

    it('enforces validation rules on job creation', async () => {
      const response = await request(app).post('/api/v1/jobs').send({
        type: 'invalid',
        url: 'not-a-url',
        status: 'unknown',
        options: 'invalid-options'
      });
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false,
          error: 'Validation failed'
        })
      );
    });
  });

  describe('Statistics API', () => {
    it('returns aggregated statistics and respects date filters', async () => {
      const template = await createTestTemplate({ name: 'Stats Template Integration' });
      await createTestJob({
        type: 'scrape',
        status: 'completed',
        templateId: template.id,
        startedAt: new Date('2024-04-01T09:00:00.000Z'),
        createdAt: new Date('2024-04-01T09:00:00.000Z')
      });
      await createTestJob({
        type: 'crawl',
        status: 'running',
        startedAt: new Date('2024-04-02T09:00:00.000Z'),
        createdAt: new Date('2024-04-02T09:00:00.000Z')
      });

      const response = await request(app)
        .get('/api/v1/statistics')
        .query({ dateFrom: '2024-04-01', dateTo: '2024-04-30' });
      expect(response.status).toBe(200);
      expect(response.body.data.totals.jobs).toBe(2);
      expect(Array.isArray(response.body.data.jobsPerDay)).toBe(true);

      const historyResponse = await request(app)
        .get('/api/v1/history')
        .query({ dateFrom: '2024-04-01', dateTo: '2024-04-30' });
      expect(historyResponse.status).toBe(200);
      expect(historyResponse.body.data).toEqual(response.body.data);
    });
  });

  describe('Error handling and rate limiting', () => {
    it('returns 404 for unknown routes', async () => {
      const response = await request(app).get('/unknown-route');
      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false
        })
      );
    });

    it('returns 429 when rate limit exceeded', async () => {
      const route = '/api/v1/statistics';
      await new Promise(resolve => setTimeout(resolve, 1100));
      await request(app).get(route);
      await request(app).get(route);
      const response = await request(app).get(route);
      expect(response.status).toBe(429);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: false
        })
      );
    });
  });
});
