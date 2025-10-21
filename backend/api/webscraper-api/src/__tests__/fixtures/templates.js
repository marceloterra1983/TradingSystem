import { randomUUID } from 'node:crypto';

export const mockGitHubTemplate = {
  id: '8972c4fb-6e7c-4d3e-8d14-2c5b31268f4b',
  name: 'GitHub Repository',
  description: 'Extract README and repository information from GitHub projects.',
  urlPattern: '^https://github\\.com/[^/]+/[^/]+/?$',
  options: {
    formats: ['markdown', 'links'],
    onlyMainContent: true,
    includeTags: ['article', '#readme']
  },
  usageCount: 7,
  createdAt: new Date('2024-01-10T10:00:00.000Z'),
  updatedAt: new Date('2024-01-15T18:30:00.000Z')
};

export const mockDocsTemplate = {
  id: 'c6480526-1f7a-4a68-95eb-177a1decc469',
  name: 'Documentation Site',
  description: 'Extract main content from documentation portals and technical guides.',
  urlPattern: '.*/docs/.*',
  options: {
    formats: ['markdown', 'html'],
    onlyMainContent: true,
    waitFor: 1000,
    excludeTags: ['nav', 'footer']
  },
  usageCount: 12,
  createdAt: new Date('2024-02-02T09:15:00.000Z'),
  updatedAt: new Date('2024-02-05T14:45:00.000Z')
};

export const mockNewsTemplate = {
  id: '13dc0155-84d8-4420-8760-9349d673f796',
  name: 'News Article',
  description: 'Extract article content from online newspapers with screenshots.',
  urlPattern: '.*/article/.*',
  options: {
    formats: ['markdown', 'screenshot'],
    onlyMainContent: true,
    includeTags: ['article'],
    excludeTags: ['aside', '.advertisement']
  },
  usageCount: 4,
  createdAt: new Date('2024-03-01T13:25:00.000Z'),
  updatedAt: new Date('2024-03-01T13:25:00.000Z')
};

export const mockTemplateArray = [mockGitHubTemplate, mockDocsTemplate, mockNewsTemplate];

export function createMockTemplate(overrides = {}) {
  return {
    id: overrides.id ?? randomUUID(),
    name: overrides.name ?? `Template ${randomUUID().slice(0, 8)}`,
    description: overrides.description ?? 'Mock template generated for tests.',
    urlPattern: overrides.urlPattern ?? '.*/mock/.*',
    options:
      overrides.options ??
      {
        formats: ['markdown'],
        onlyMainContent: true
      },
    usageCount: overrides.usageCount ?? 0,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date()
  };
}
