import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import type { ReactNode } from 'react';

import AgentsCatalogView from '../AgentsCatalogView';
import { useAgentsData, type AgentsData } from '@/hooks/useAgentsData';

vi.mock('@/hooks/useAgentsData', () => ({
  useAgentsData: vi.fn(),
}));

vi.mock('@/components/layout/CustomizablePageLayout', () => ({
  CustomizablePageLayout: ({
    sections,
    leftActions,
  }: {
    sections: Array<{ id: string; content: ReactNode }>;
    leftActions?: ReactNode;
  }) => (
    <div data-testid="mock-layout">
      {leftActions}
      {sections.map((section) => (
        <div key={section.id} data-testid={`section-${section.id}`}>
          {section.content}
        </div>
      ))}
    </div>
  ),
}));

const mockedUseAgentsData = vi.mocked(useAgentsData);

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    value: {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as Storage,
    writable: true,
  });
});

beforeEach(() => {
  mockedUseAgentsData.mockReset();
});

describe('AgentsCatalogView', () => {
  it('renders loading state while data is being fetched', () => {
    mockedUseAgentsData.mockReturnValue({
      data: undefined,
      error: null,
      isLoading: true,
      isFetching: true,
      refetch: vi.fn(),
    } as any);

    render(<AgentsCatalogView />);

    expect(screen.getByTestId('agents-loading-state')).toBeInTheDocument();
  });

  it('renders error state and retries when clicking the button', () => {
    const refetch = vi.fn();
    mockedUseAgentsData.mockReturnValue({
      data: undefined,
      error: new Error('Chunk load error'),
      isLoading: false,
      isFetching: false,
      refetch,
    } as any);

    render(<AgentsCatalogView />);

    const retryButton = screen.getByRole('button', { name: /tentar novamente/i });
    fireEvent.click(retryButton);

    expect(refetch).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('agents-error-state')).toBeInTheDocument();
  });

  it('renders agents when data is available', () => {
    const sampleAgents: AgentsData['agents'] = [
      {
        id: 'typescript-pro',
        name: '@typescript-pro',
        category: 'Frontend & UX',
        capabilities: 'TypeScript expert',
        usage: 'Quando precisar reforçar contratos TS',
        example: 'Exemplo completo',
        shortExample: '@typescript-pro revise config/endpoints.ts',
        outputType: 'Guia técnico',
        tags: ['typescript', 'frontend'],
        filePath: '/.claude/agents/typescript-pro.md',
        fileContent: '# markdown',
      },
    ];

    mockedUseAgentsData.mockReturnValue({
      data: {
        agents: sampleAgents,
        categoryOrder: ['Frontend & UX'],
      },
      error: null,
      isLoading: false,
      isFetching: false,
      refetch: vi.fn(),
    } as any);

    render(<AgentsCatalogView />);

    expect(screen.getAllByText('@typescript-pro').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Frontend & UX').length).toBeGreaterThan(0);
    expect(screen.getAllByTestId('agent-card')).toHaveLength(1);
  });
});
