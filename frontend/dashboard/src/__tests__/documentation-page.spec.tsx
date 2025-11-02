import { describe, expect, it, beforeEach, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DocumentationPage from '@/components/pages/DocumentationPage';

vi.mock('@/services/documentationService', () => ({
  __esModule: true,
  default: {
    search: vi.fn(),
    getSuggestions: vi.fn(),
  },
}));

import documentationService from '@/services/documentationService';

const mockedSearch = documentationService.search as unknown as vi.Mock;
const mockedSuggestions =
  documentationService.getSuggestions as unknown as vi.Mock;

describe('DocumentationPage', () => {
  beforeEach(() => {
    mockedSearch.mockReset();
    mockedSuggestions.mockReset();
    mockedSearch.mockResolvedValue({
      results: [
        {
          id: 'openapi-endpoint',
          title: 'Execute Order endpoint',
          description: 'Executa uma ordem no TradingSystem',
          source: 'openapi',
          version: '1.0.0',
          path: 'docs/apis/execute-order',
          score: 0.92,
        },
      ],
      total: 1,
    });
    mockedSuggestions.mockResolvedValue([
      { text: 'execute order', source: 'openapi' },
      { text: 'asyncapi order events', source: 'asyncapi' },
    ]);
  });

  it('performs a search and displays results', async () => {
    render(<DocumentationPage />);

    const input = screen.getByPlaceholderText(/websocket health/i);
    fireEvent.input(input, { target: { value: 'order' } });

    await waitFor(() => {
      expect(mockedSearch).toHaveBeenCalledWith('order', {
        limit: 30,
        source: undefined,
      });
    });

    expect(
      await screen.findByRole('button', { name: /execute order endpoint/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Fonte:\s*openapi/i)).toBeInTheDocument();
  });

  it('allows selecting results and opening documentation', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);

    render(<DocumentationPage />);
    const input = screen.getByPlaceholderText(/websocket health/i);
    fireEvent.input(input, { target: { value: 'execute order' } });
    await waitFor(() => expect(mockedSearch).toHaveBeenCalled());

    await screen.findByRole('button', { name: /execute order endpoint/i });
    const openButton = screen.getByRole('button', { name: /abrir/i });
    fireEvent.click(openButton);

    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
