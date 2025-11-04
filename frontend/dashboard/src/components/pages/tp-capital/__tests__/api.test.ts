/**
 * API Module Tests
 * 
 * Tests for API functions: fetchSignals, fetchLogs, deleteSignal
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchSignals, fetchLogs, deleteSignal } from '../api';
import * as tpCapitalApiModule from '../../../utils/tpCapitalApi';

// Mock tpCapitalApi
vi.mock('../../../utils/tpCapitalApi', () => ({
  tpCapitalApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('fetchSignals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch signals successfully', async () => {
    const mockData = {
      data: [
        { id: 1, asset: 'PETR4', buy_min: 28.5 },
        { id: 2, asset: 'VALE3', buy_min: 70.0 },
      ],
    };

    vi.mocked(tpCapitalApiModule.tpCapitalApi.get).mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as any);

    const result = await fetchSignals({ limit: 10 });

    expect(result.rows).toEqual(mockData.data);
    expect(result.usingFallback).toBe(false);
    expect(tpCapitalApiModule.tpCapitalApi.get).toHaveBeenCalledWith('/signals?limit=10');
  });

  it('should handle API errors with fallback', async () => {
    vi.mocked(tpCapitalApiModule.tpCapitalApi.get).mockRejectedValue(
      new Error('Network error')
    );

    const result = await fetchSignals({ limit: 10 });

    expect(result.usingFallback).toBe(true);
    expect(result.errorMessage).toContain('Network error');
    expect(result.rows).toBeDefined(); // Should return sample data
    expect(result.rows.length).toBeGreaterThan(0); // Sample data not empty
  });

  it('should build correct query params', async () => {
    vi.mocked(tpCapitalApiModule.tpCapitalApi.get).mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as any);

    await fetchSignals({
      limit: 50,
      channel: 'TP Capital',
      signalType: 'Swing',
      search: 'PETR',
    });

    expect(tpCapitalApiModule.tpCapitalApi.get).toHaveBeenCalledWith(
      '/signals?limit=50&channel=TP+Capital&type=Swing&search=PETR'
    );
  });

  it('should handle HTTP error status', async () => {
    vi.mocked(tpCapitalApiModule.tpCapitalApi.get).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({}),
    } as any);

    const result = await fetchSignals({ limit: 10 });

    expect(result.usingFallback).toBe(true);
    expect(result.errorMessage).toContain('HTTP 500');
  });
});

describe('fetchLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch logs successfully', async () => {
    const mockLogs = {
      logs: [
        { level: 'info', message: 'Test log', timestamp: '2023-11-03T10:00:00Z' },
      ],
    };

    vi.mocked(tpCapitalApiModule.tpCapitalApi.get).mockResolvedValue({
      ok: true,
      json: async () => mockLogs,
    } as any);

    const result = await fetchLogs({ limit: 100 });

    expect(result.rows).toEqual(mockLogs.logs);
    expect(result.usingFallback).toBe(false);
  });

  it('should filter by log level', async () => {
    vi.mocked(tpCapitalApiModule.tpCapitalApi.get).mockResolvedValue({
      ok: true,
      json: async () => ({ logs: [] }),
    } as any);

    await fetchLogs({ limit: 100, level: 'error' });

    expect(tpCapitalApiModule.tpCapitalApi.get).toHaveBeenCalledWith(
      '/logs?limit=100&level=error'
    );
  });
});

describe('deleteSignal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete signal successfully', async () => {
    vi.mocked(tpCapitalApiModule.tpCapitalApi.delete).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    await deleteSignal('2023-11-03T10:00:00Z');

    expect(tpCapitalApiModule.tpCapitalApi.delete).toHaveBeenCalledWith(
      '/signals/2023-11-03T10:00:00Z'
    );
  });

  it('should throw error on delete failure', async () => {
    vi.mocked(tpCapitalApiModule.tpCapitalApi.delete).mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({}),
    } as any);

    await expect(deleteSignal('invalid-id')).rejects.toThrow('HTTP 404');
  });
});

