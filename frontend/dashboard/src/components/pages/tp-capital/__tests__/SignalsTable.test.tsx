/**
 * SignalsTable Component Tests
 * 
 * Baseline tests created BEFORE refactoring to ensure behavior preservation.
 * Tests cover:
 * - Rendering with data
 * - Filtering (channel, type, search)
 * - Export functionality (CSV, JSON)
 * - Delete functionality
 * - Sync messages
 * - Loading and error states
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SignalsTable } from '../SignalsTable';
import * as api from '../api';

// Mock API module
vi.mock('../api');

// Mock tpCapitalApi
vi.mock('@/utils/tpCapitalApi', () => ({
  tpCapitalApi: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

const mockSignals = [
  {
    id: 1,
    ts: 1699000000000,
    channel: 'TP Capital',
    signal_type: 'Swing Trade',
    asset: 'PETR4',
    buy_min: 28.50,
    buy_max: 29.00,
    target_1: 30.00,
    target_2: 31.00,
    target_final: 32.00,
    stop: 27.50,
    raw_message: 'PETR4\nCOMPRA: 28.50 a 29.00\nALVO 1: 30.00\nSTOP: 27.50',
    source: 'telegram',
    ingested_at: '2023-11-03T10:00:00Z',
    created_at: '2023-11-03T10:00:00Z',
    updated_at: '2023-11-03T10:00:00Z',
  },
  {
    id: 2,
    ts: 1699010000000,
    channel: 'TP Capital',
    signal_type: 'Day Trade',
    asset: 'VALE3',
    buy_min: 70.00,
    buy_max: 71.00,
    target_1: 72.00,
    target_2: 73.00,
    target_final: 74.00,
    stop: 69.00,
    raw_message: 'VALE3\nCOMPRA: 70.00 a 71.00\nALVO 1: 72.00\nSTOP: 69.00',
    source: 'telegram',
    ingested_at: '2023-11-03T12:00:00Z',
    created_at: '2023-11-03T12:00:00Z',
    updated_at: '2023-11-03T12:00:00Z',
  },
];

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    },
    writable: true,
  });
});

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('SignalsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchSignals).mockResolvedValue({
      rows: mockSignals,
      usingFallback: false,
    });
  });

  describe('Rendering', () => {
    it('should render with signals data', async () => {
      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
        expect(screen.getByText('VALE3')).toBeInTheDocument();
      });
    });

    it('should display correct signal details', async () => {
      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('28.50')).toBeInTheDocument(); // buy_min
        expect(screen.getByText('29.00')).toBeInTheDocument(); // buy_max
        expect(screen.getByText('27.50')).toBeInTheDocument(); // stop
      });
    });

    it('should show loading state initially', () => {
      render(<SignalsTable />, { wrapper: createWrapper() });
      expect(screen.getByText(/carregando/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('should filter by search term', async () => {
      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/buscar/i);
      await userEvent.type(searchInput, 'PETR');

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
        expect(screen.queryByText('VALE3')).not.toBeInTheDocument();
      });
    });

    it('should filter by channel', async () => {
      const multiChannelSignals = [
        ...mockSignals,
        { ...mockSignals[0], id: 3, channel: 'Other Channel', asset: 'BBAS3' },
      ];

      vi.mocked(api.fetchSignals).mockResolvedValue({
        rows: multiChannelSignals,
        usingFallback: false,
      });

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const channelSelect = screen.getByRole('combobox', { name: /canal/i });
      await userEvent.click(channelSelect);
      await userEvent.click(screen.getByText('Other Channel'));

      await waitFor(() => {
        expect(screen.getByText('BBAS3')).toBeInTheDocument();
        expect(screen.queryByText('PETR4')).not.toBeInTheDocument();
      });
    });

    it('should filter by signal type', async () => {
      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const typeSelect = screen.getByRole('combobox', { name: /tipo/i });
      await userEvent.click(typeSelect);
      await userEvent.click(screen.getByText('Day Trade'));

      await waitFor(() => {
        expect(screen.getByText('VALE3')).toBeInTheDocument();
        expect(screen.queryByText('PETR4')).not.toBeInTheDocument();
      });
    });
  });

  describe('Export Functionality', () => {
    it('should export signals as CSV', async () => {
      const mockDownload = vi.spyOn(document, 'createElement');

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /csv/i });
      await userEvent.click(exportButton);

      expect(mockDownload).toHaveBeenCalledWith('a');
    });

    it('should export signals as JSON', async () => {
      const mockDownload = vi.spyOn(document, 'createElement');

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const exportButton = screen.getByRole('button', { name: /json/i });
      await userEvent.click(exportButton);

      expect(mockDownload).toHaveBeenCalledWith('a');
    });
  });

  describe('Delete Functionality', () => {
    it('should call deleteSignal when delete button clicked', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
      vi.mocked(api.deleteSignal).mockResolvedValue(undefined);

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /deletar/i });
      await userEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(api.deleteSignal).toHaveBeenCalledWith(mockSignals[0].ingested_at);
    });

    it('should not delete if user cancels confirmation', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /deletar/i });
      await userEvent.click(deleteButtons[0]);

      expect(confirmSpy).toHaveBeenCalled();
      expect(api.deleteSignal).not.toHaveBeenCalled();
    });
  });

  describe('Sync Messages', () => {
    it('should trigger sync when button clicked', async () => {
      const { tpCapitalApi } = await import('@/utils/tpCapitalApi');
      vi.mocked(tpCapitalApi.post).mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          message: '12 mensagens sincronizadas',
          data: { messagesSynced: 12 },
        }),
      } as any);

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/checar mensagens/i)).toBeInTheDocument();
      });

      const syncButton = screen.getByRole('button', { name: /checar mensagens/i });
      await userEvent.click(syncButton);

      await waitFor(() => {
        expect(screen.getByText(/mensagens sincronizadas/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error States', () => {
    it('should show error message when fetch fails', async () => {
      vi.mocked(api.fetchSignals).mockResolvedValue({
        rows: [],
        usingFallback: true,
        errorMessage: 'Network error',
      });

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
      });
    });

    it('should use fallback data on error', async () => {
      vi.mocked(api.fetchSignals).mockResolvedValue({
        rows: [mockSignals[0]],
        usingFallback: true,
        errorMessage: 'API down',
      });

      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Should still show data even if using fallback
        expect(screen.getByText('PETR4')).toBeInTheDocument();
        expect(screen.getByText(/api down/i)).toBeInTheDocument();
      });
    });
  });

  describe('Limit Selection', () => {
    it('should update limit when changed', async () => {
      render(<SignalsTable />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('PETR4')).toBeInTheDocument();
      });

      const limitSelect = screen.getByRole('combobox', { name: /limite/i });
      await userEvent.click(limitSelect);
      await userEvent.click(screen.getByText('50'));

      expect(api.fetchSignals).toHaveBeenCalledWith({ limit: 50 });
    });
  });
});
