import type { Item } from '../../src/components/pages/workspace/types/workspace.types';

/**
 * Test Fixtures for Workspace E2E Tests
 * 
 * Provides reusable test data for consistent testing.
 */

export const mockCategories = [
  { id: 'feature', name: 'feature', description: 'Novas funcionalidades', color: '#10b981', display_order: 1, active: true },
  { id: 'bug', name: 'bug', description: 'Correção de bugs', color: '#ef4444', display_order: 2, active: true },
  { id: 'improvement', name: 'improvement', description: 'Melhorias', color: '#3b82f6', display_order: 3, active: true },
  { id: 'documentation', name: 'documentation', description: 'Documentação', color: '#8b5cf6', display_order: 4, active: true },
  { id: 'research', name: 'research', description: 'Pesquisa', color: '#f59e0b', display_order: 5, active: true },
  { id: 'other', name: 'other', description: 'Outros', color: '#6b7280', display_order: 6, active: true },
];

export const mockItems: Partial<Item>[] = [
  {
    title: 'Implement user authentication',
    description: 'Add JWT-based authentication to protect API endpoints',
    category: 'feature',
    priority: 'high',
    status: 'in-progress',
    tags: ['security', 'auth', 'api'],
  },
  {
    title: 'Fix memory leak in WebSocket',
    description: 'WebSocket connections are not being properly cleaned up',
    category: 'bug',
    priority: 'critical',
    status: 'new',
    tags: ['websocket', 'memory', 'performance'],
  },
  {
    title: 'Optimize database queries',
    description: 'Add indexes and optimize slow queries in TimescaleDB',
    category: 'improvement',
    priority: 'medium',
    status: 'review',
    tags: ['database', 'performance', 'timescaledb'],
  },
  {
    title: 'Write API documentation',
    description: 'Document all REST API endpoints with OpenAPI specs',
    category: 'documentation',
    priority: 'medium',
    status: 'completed',
    tags: ['docs', 'openapi', 'api'],
  },
  {
    title: 'Evaluate ML models',
    description: 'Research and evaluate different ML models for signal prediction',
    category: 'research',
    priority: 'low',
    status: 'new',
    tags: ['ml', 'ai', 'research'],
  },
];

export const createMockItem = (overrides: Partial<Item> = {}): Partial<Item> => ({
  title: 'Mock Item',
  description: 'This is a mock item for testing',
  category: 'feature',
  priority: 'medium',
  status: 'new',
  tags: ['test', 'mock'],
  ...overrides,
});

export const createBatchMockItems = (count: number): Partial<Item>[] => {
  return Array.from({ length: count }, (_, i) => ({
    title: `Batch Item ${i + 1}`,
    description: `Description for batch item ${i + 1}`,
    category: ['feature', 'bug', 'improvement'][i % 3] as any,
    priority: ['low', 'medium', 'high'][i % 3] as any,
    status: 'new' as any,
    tags: [`tag${i}`, 'batch'],
  }));
};

export const validItemData = {
  minimal: {
    title: 'Minimal Valid Item',
    description: 'Only required fields',
    category: 'feature',
    priority: 'medium',
  },
  complete: {
    title: 'Complete Item',
    description: 'All fields populated',
    category: 'bug',
    priority: 'high',
    tags: ['complete', 'test', 'full'],
  },
  withSpecialChars: {
    title: 'Special: <>&"\' 日本語',
    description: 'Testing: @#$%^&*()_+-=[]{}|',
    category: 'improvement',
    priority: 'low',
    tags: ['special', 'chars'],
  },
};

export const invalidItemData = {
  emptyTitle: {
    title: '',
    description: 'No title',
    category: 'feature',
    priority: 'high',
  },
  emptyDescription: {
    title: 'No description',
    description: '',
    category: 'bug',
    priority: 'medium',
  },
  invalidCategory: {
    title: 'Invalid category',
    description: 'Category does not exist',
    category: 'INVALID_CATEGORY',
    priority: 'high',
  },
  invalidPriority: {
    title: 'Invalid priority',
    description: 'Priority value is wrong',
    category: 'feature',
    priority: 'SUPER_HIGH',
  },
};

export const API_ENDPOINTS = {
  health: 'http://localhost:3200/health',
  categories: 'http://localhost:3200/api/categories',
  items: 'http://localhost:3200/api/items',
};

