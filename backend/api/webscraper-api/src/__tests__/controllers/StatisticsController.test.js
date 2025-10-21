import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getStatistics } from '../../controllers/StatisticsController.js';
import { createTestTemplate, createTestJob } from '../testUtils.js';

function mockResponse() {
  const res = {};
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('StatisticsController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns comprehensive statistics across jobs and templates', async () => {
    const template = await createTestTemplate({ name: 'Stats Template' });
    await createTestJob({
      status: 'completed',
      type: 'scrape',
      templateId: template.id,
      startedAt: new Date('2024-03-01T10:00:00.000Z'),
      createdAt: new Date('2024-03-01T10:00:00.000Z'),
      completedAt: new Date('2024-03-01T10:00:30.000Z')
    });
    await createTestJob({
      status: 'failed',
      type: 'scrape',
      startedAt: new Date('2024-03-02T10:00:00.000Z'),
      createdAt: new Date('2024-03-02T10:00:00.000Z')
    });
    await createTestJob({
      status: 'running',
      type: 'crawl',
      startedAt: new Date('2024-03-03T10:00:00.000Z'),
      createdAt: new Date('2024-03-03T10:00:00.000Z'),
      options: {
        limit: 5,
        maxDepth: 1,
        scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
      }
    });

    const req = { query: {} };
    const res = mockResponse();

    await getStatistics(req, res, vi.fn());

    const payload = res.json.mock.calls[0][0].data;
    expect(payload.totals.jobs).toBe(3);
    expect(payload.byStatus.completed).toBe(1);
    expect(payload.byType.crawl).toBe(1);
    expect(payload.recentJobs.length).toBe(3);
    expect(payload.popularTemplates[0]).toEqual(
      expect.objectContaining({
        templateId: template.id,
        name: template.name,
        usageCount: 1
      })
    );
  });

  it('filters statistics by provided date range', async () => {
    const template = await createTestTemplate({ name: 'Range Template' });
    await createTestJob({
      status: 'completed',
      templateId: template.id,
      startedAt: new Date('2024-02-01T12:00:00.000Z'),
      createdAt: new Date('2024-02-01T12:00:00.000Z')
    });
    await createTestJob({
      status: 'completed',
      startedAt: new Date('2024-03-05T12:00:00.000Z'),
      createdAt: new Date('2024-03-05T12:00:00.000Z')
    });

    const req = { query: { dateFrom: '2024-03-01', dateTo: '2024-03-31' } };
    const res = mockResponse();

    await getStatistics(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          totals: expect.objectContaining({
            jobs: 1
          }),
          byStatus: expect.objectContaining({
            completed: 1
          })
        })
      })
    );
  });

  it('handles empty database gracefully', async () => {
    const req = { query: {} };
    const res = mockResponse();
    await getStatistics(req, res, vi.fn());

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          totals: {
            jobs: 0,
            templates: 0,
            successRate: 0
          },
          byStatus: {
            completed: 0,
            running: 0,
            pending: 0,
            failed: 0
          },
          byType: {
            scrape: 0,
            crawl: 0
          },
          recentJobs: [],
          jobsPerDay: [],
          popularTemplates: []
        }
      })
    );
  });
});
