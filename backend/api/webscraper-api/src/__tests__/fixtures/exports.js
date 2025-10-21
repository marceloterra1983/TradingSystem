export const mockExportCompleted = {
  id: 'export-1',
  name: 'Completed export',
  description: 'Example completed export',
  exportType: 'jobs',
  formats: ['csv', 'json'],
  filters: { status: 'completed' },
  status: 'completed',
  filePaths: {
    csv: '/tmp/webscraper-exports/export-1/jobs.csv',
    json: '/tmp/webscraper-exports/export-1/jobs.json'
  },
  rowCount: 120,
  fileSizeBytes: 1024 * 512,
  error: null,
  startedAt: new Date(Date.now() - 60_000),
  completedAt: new Date(),
  expiresAt: new Date(Date.now() + 4 * 60 * 60 * 1000),
  createdAt: new Date(Date.now() - 60_000),
  updatedAt: new Date()
};

export const mockExportProcessing = {
  ...mockExportCompleted,
  id: 'export-2',
  name: 'Processing export',
  status: 'processing',
  filePaths: null,
  completedAt: null,
  rowCount: null,
  fileSizeBytes: null
};

export const mockExportFailed = {
  ...mockExportCompleted,
  id: 'export-3',
  name: 'Failed export',
  status: 'failed',
  error: 'ENOSPC'
};

export function cloneExport(overrides = {}) {
  return {
    ...mockExportCompleted,
    ...overrides,
    startedAt: overrides.startedAt ?? new Date(mockExportCompleted.startedAt),
    completedAt: overrides.completedAt ?? new Date(mockExportCompleted.completedAt),
    expiresAt: overrides.expiresAt ?? new Date(mockExportCompleted.expiresAt),
    createdAt: overrides.createdAt ?? new Date(mockExportCompleted.createdAt),
    updatedAt: overrides.updatedAt ?? new Date(mockExportCompleted.updatedAt)
  };
}
