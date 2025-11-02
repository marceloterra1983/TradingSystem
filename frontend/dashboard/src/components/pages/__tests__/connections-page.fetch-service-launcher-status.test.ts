import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchServiceLauncherStatus } from '../ConnectionsPage';

describe('fetchServiceLauncherStatus', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('parses aggregated service status from successful response', async () => {
    const mockPayload = {
      overallStatus: 'ok',
      totalServices: 2,
      degradedCount: 0,
      downCount: 0,
      averageLatencyMs: 42,
      lastCheckAt: '2025-10-13T10:00:00.000Z',
      services: [
        {
          id: 'idea-bank-api',
          name: 'Idea Bank API',
          status: 'ok',
          latencyMs: 80,
          updatedAt: '2025-10-13T09:59:59.000Z',
        },
        {
          id: 'documentation-api',
          name: 'Documentation API',
          status: 'ok',
          latencyMs: 104,
          updatedAt: '2025-10-13T09:59:59.000Z',
        },
      ],
    };

    const fetchMock: typeof fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(mockPayload), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    const summary = await fetchServiceLauncherStatus();
    expect(summary.overallStatus).toBe('ok');
    expect(summary.totalServices).toBe(2);
    expect(summary.services).toHaveLength(2);
    expect(summary.averageLatencyMs).toBe(42);
  });

  it('throws descriptive error when response is not ok', async () => {
    const fetchMock: typeof fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: 'service unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }),
    );

    vi.stubGlobal('fetch', fetchMock);

    await expect(fetchServiceLauncherStatus()).rejects.toThrow(/503/);
  });
});
