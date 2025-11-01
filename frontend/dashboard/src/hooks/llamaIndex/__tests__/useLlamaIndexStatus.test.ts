/**
 * Unit Tests for useLlamaIndexStatus Hook
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLlamaIndexStatus } from '../useLlamaIndexStatus';
import type { LlamaIndexStatusResponse } from '../useLlamaIndexStatus';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('useLlamaIndexStatus', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      expect(result.current.statusData).toBeNull();
      expect(result.current.statusLoading).toBe(false);
      expect(result.current.statusError).toBeNull();
      expect(result.current.selectedCollection).toBeNull();
      expect(result.current.loadedCollection).toBeNull();
    });

    it('should initialize with provided collection', () => {
      const { result } = renderHook(() =>
        useLlamaIndexStatus({
          initialCollection: 'docs_index_mxbai',
          autoFetch: false,
        })
      );

      expect(result.current.selectedCollection).toBe('docs_index_mxbai');
    });

    it('should auto-fetch on mount when autoFetch is true', async () => {
      const mockResponse: LlamaIndexStatusResponse = {
        timestamp: '2025-10-31T12:00:00Z',
        services: {
          query: { ok: true, status: 200, message: 'ok' },
          ingestion: { ok: true, status: 200, message: 'ok' },
        },
        qdrant: {
          collection: 'documentation',
          ok: true,
          status: 200,
          count: 100,
          sample: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      });

      const { result } = renderHook(() =>
        useLlamaIndexStatus({ autoFetch: true })
      );

      // Initially loading
      expect(result.current.statusLoading).toBe(true);

      // Wait for fetch to complete
      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(result.current.statusData).toEqual(mockResponse);
      expect(result.current.statusError).toBeNull();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should not auto-fetch when autoFetch is false', () => {
      renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('fetchStatus', () => {
    it('should fetch status successfully', async () => {
      const mockResponse: LlamaIndexStatusResponse = {
        timestamp: '2025-10-31T12:00:00Z',
        requestedCollection: 'docs_index_mxbai',
        services: {
          query: { ok: true, status: 200, message: 'ok' },
          ingestion: { ok: true, status: 200, message: 'ok' },
        },
        qdrant: {
          collection: 'docs_index_mxbai',
          ok: true,
          status: 200,
          count: 250,
          sample: ['doc1.md', 'doc2.md'],
        },
        collections: [
          { name: 'docs_index_mxbai', count: 250, embeddingModel: 'mxbai-embed-large' },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      });

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus('docs_index_mxbai'));

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(result.current.statusData).toEqual(mockResponse);
      expect(result.current.loadedCollection).toBe('docs_index_mxbai');
      expect(result.current.statusError).toBeNull();
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus());

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(result.current.statusData).toBeNull();
      expect(result.current.statusError).toContain('Network error');
    });

    it('should handle 401 errors with custom message', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized',
      });

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus());

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(result.current.statusError).toContain('401');
      expect(result.current.statusError).toContain('porta 3402');
    });

    it('should build correct URL with collection parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          timestamp: '2025-10-31T12:00:00Z',
          services: { query: { ok: true, status: 200, message: 'ok' }, ingestion: { ok: true, status: 200, message: 'ok' } },
          qdrant: { collection: 'test', ok: true, status: 200, count: 0, sample: [] },
        }),
      });

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus('test_collection'));

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/rag/status?collection=test_collection');
    });

    it('should handle empty response body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '',
      });

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus());

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(result.current.statusData).toBeNull();
    });
  });

  describe('handleRefresh', () => {
    it('should refresh with current selectedCollection', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          timestamp: '2025-10-31T12:00:00Z',
          services: { query: { ok: true, status: 200, message: 'ok' }, ingestion: { ok: true, status: 200, message: 'ok' } },
          qdrant: { collection: 'docs_index_mxbai', ok: true, status: 200, count: 100, sample: [] },
        }),
      });

      const { result } = renderHook(() =>
        useLlamaIndexStatus({
          initialCollection: 'docs_index_mxbai',
          autoFetch: false,
        })
      );

      await waitFor(() => result.current.handleRefresh());

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/v1/rag/status?collection=docs_index_mxbai');
    });
  });

  describe('polling', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should poll at specified interval', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          timestamp: '2025-10-31T12:00:00Z',
          services: { query: { ok: true, status: 200, message: 'ok' }, ingestion: { ok: true, status: 200, message: 'ok' } },
          qdrant: { collection: 'documentation', ok: true, status: 200, count: 0, sample: [] },
        }),
      });

      renderHook(() =>
        useLlamaIndexStatus({
          autoFetch: true,
          pollingInterval: 5000, // 5 seconds
        })
      );

      // Wait for initial auto-fetch
      await vi.waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Advance timer and flush promises
      await vi.advanceTimersByTimeAsync(5000);

      // Polling should have triggered
      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Advance again
      await vi.advanceTimersByTimeAsync(5000);

      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should not poll when interval is 0', () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify({
          timestamp: '2025-10-31T12:00:00Z',
          services: { query: { ok: true, status: 200, message: 'ok' }, ingestion: { ok: true, status: 200, message: 'ok' } },
          qdrant: { collection: 'documentation', ok: true, status: 200, count: 0, sample: [] },
        }),
      });

      renderHook(() =>
        useLlamaIndexStatus({
          autoFetch: false,
          pollingInterval: 0,
        })
      );

      vi.advanceTimersByTime(10000);

      // Should not have polled
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('collection fallback', () => {
    it('should use requestedCollection from response', async () => {
      const mockResponse: LlamaIndexStatusResponse = {
        timestamp: '2025-10-31T12:00:00Z',
        requestedCollection: 'docs_index_mxbai',
        services: {
          query: { ok: true, status: 200, message: 'ok' },
          ingestion: { ok: true, status: 200, message: 'ok' },
        },
        qdrant: {
          collection: 'documentation',
          ok: true,
          status: 200,
          count: 100,
          sample: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      });

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus('docs_index_mxbai'));

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      // Should use requestedCollection, not qdrant.collection
      expect(result.current.loadedCollection).toBe('docs_index_mxbai');
    });

    it('should fallback to qdrant.collection if requestedCollection is missing', async () => {
      const mockResponse: LlamaIndexStatusResponse = {
        timestamp: '2025-10-31T12:00:00Z',
        services: {
          query: { ok: true, status: 200, message: 'ok' },
          ingestion: { ok: true, status: 200, message: 'ok' },
        },
        qdrant: {
          collection: 'documentation',
          ok: true,
          status: 200,
          count: 100,
          sample: [],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockResponse),
      });

      const { result } = renderHook(() => useLlamaIndexStatus({ autoFetch: false }));

      await waitFor(() => result.current.fetchStatus());

      await waitFor(() => {
        expect(result.current.statusLoading).toBe(false);
      });

      expect(result.current.loadedCollection).toBe('documentation');
    });
  });
});
