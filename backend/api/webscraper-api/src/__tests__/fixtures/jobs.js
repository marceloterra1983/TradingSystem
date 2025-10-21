import { randomUUID } from 'node:crypto';
import {
  mockGitHubTemplate,
  mockDocsTemplate,
  mockNewsTemplate
} from './templates.js';

export const mockScrapeJob = {
  id: 'f6f0878b-777e-4fb4-8b45-ce9e179fe9b0',
  type: 'scrape',
  url: 'https://example.com/articles/ai-trends',
  status: 'completed',
  templateId: mockGitHubTemplate.id,
  options: {
    formats: ['markdown'],
    onlyMainContent: true
  },
  results: {
    markdown: '# AI Trends\n\nInsights captured from Example.com.'
  },
  error: null,
  startedAt: new Date('2024-03-10T09:00:00.000Z'),
  completedAt: new Date('2024-03-10T09:00:45.000Z'),
  duration: 45,
  createdAt: new Date('2024-03-10T09:00:00.000Z'),
  updatedAt: new Date('2024-03-10T09:00:45.000Z')
};

export const mockCrawlJob = {
  id: '2cb53633-1676-4f82-b555-08baa11f607f',
  type: 'crawl',
  url: 'https://docs.example.com',
  status: 'running',
  firecrawlJobId: 'crawl-job-123',
  templateId: mockDocsTemplate.id,
  options: {
    limit: 10,
    maxDepth: 2,
    scrapeOptions: {
      formats: ['markdown', 'html'],
      onlyMainContent: true
    }
  },
  results: null,
  error: null,
  startedAt: new Date('2024-03-11T11:30:00.000Z'),
  completedAt: null,
  duration: null,
  createdAt: new Date('2024-03-11T11:30:00.000Z'),
  updatedAt: new Date('2024-03-11T11:40:00.000Z')
};

export const mockFailedJob = {
  id: 'd1a4c380-7a39-4749-a938-5c2fb9c6fdb5',
  type: 'scrape',
  url: 'https://example.com/unreachable',
  status: 'failed',
  templateId: null,
  options: {
    formats: ['markdown'],
    onlyMainContent: true
  },
  results: null,
  error: 'NetworkError: Request timed out',
  startedAt: new Date('2024-03-08T07:45:00.000Z'),
  completedAt: new Date('2024-03-08T07:45:30.000Z'),
  duration: 30,
  createdAt: new Date('2024-03-08T07:45:00.000Z'),
  updatedAt: new Date('2024-03-08T07:45:30.000Z')
};

export const mockJobWithTemplate = {
  id: '0bde4673-30ad-4b9a-b0c7-2b0f620e0ad0',
  type: 'scrape',
  url: 'https://news.example.com/article/breaking-updates',
  status: 'completed',
  templateId: mockNewsTemplate.id,
  options: {
    formats: ['markdown', 'screenshot'],
    onlyMainContent: true
  },
  results: {
    markdown: '# Breaking Updates\n\nNews article summary.',
    screenshot: 'base64-encoded-image'
  },
  error: null,
  startedAt: new Date('2024-03-12T06:20:00.000Z'),
  completedAt: new Date('2024-03-12T06:21:10.000Z'),
  duration: 70,
  createdAt: new Date('2024-03-12T06:20:00.000Z'),
  updatedAt: new Date('2024-03-12T06:21:10.000Z')
};

export function createMockJob(overrides = {}) {
  const template = overrides.template ?? null;
  return {
    id: overrides.id ?? randomUUID(),
    type: overrides.type ?? 'scrape',
    url: overrides.url ?? 'https://example.com/mock',
    status: overrides.status ?? 'completed',
    templateId: overrides.templateId ?? template?.id ?? null,
    firecrawlJobId: overrides.firecrawlJobId ?? null,
    options:
      overrides.options ??
      (overrides.type === 'crawl'
        ? { limit: 5, maxDepth: 2, scrapeOptions: { formats: ['markdown'], onlyMainContent: true } }
        : { formats: ['markdown'], onlyMainContent: true }),
    results: overrides.results ?? (overrides.status === 'failed' ? null : { markdown: '# Mock Result' }),
    error: overrides.error ?? null,
    startedAt: overrides.startedAt ?? new Date(),
    completedAt: overrides.completedAt ?? new Date(),
    duration: overrides.duration ?? 30,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date()
  };
}
