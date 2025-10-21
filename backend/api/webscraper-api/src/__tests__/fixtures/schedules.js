export const mockCronSchedule = {
  id: 'schedule-cron-1',
  name: 'Daily GitHub Trending',
  description: 'Scrape trending repositories every morning',
  templateId: 'template-1',
  url: 'https://github.com/trending',
  scheduleType: 'cron',
  cronExpression: '0 9 * * *',
  intervalSeconds: null,
  scheduledAt: null,
  enabled: true,
  lastRunAt: new Date('2025-01-16T09:00:00Z'),
  nextRunAt: new Date('2025-01-17T09:00:00Z'),
  runCount: 45,
  failureCount: 2,
  options: { formats: ['markdown', 'links'] },
  createdAt: new Date('2025-01-01T10:00:00Z'),
  updatedAt: new Date('2025-01-16T09:00:00Z')
};

export const mockIntervalSchedule = {
  id: 'schedule-interval-1',
  name: 'Hourly Docs Monitor',
  description: 'Check docs every hour',
  templateId: 'template-2',
  url: 'https://docs.example.com',
  scheduleType: 'interval',
  cronExpression: null,
  intervalSeconds: 3600,
  scheduledAt: null,
  enabled: true,
  lastRunAt: new Date(Date.now() - 30 * 60 * 1000),
  nextRunAt: new Date(Date.now() + 30 * 60 * 1000),
  runCount: 24,
  failureCount: 0,
  options: { formats: ['markdown'] },
  createdAt: new Date('2025-01-15T10:00:00Z'),
  updatedAt: new Date()
};

export const mockOneTimeSchedule = {
  id: 'schedule-onetime-1',
  name: 'Quarterly Report',
  description: 'One-time scrape for Q1 report',
  templateId: null,
  url: 'https://news.example.com/q1-report',
  scheduleType: 'one-time',
  cronExpression: null,
  intervalSeconds: null,
  scheduledAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  enabled: true,
  lastRunAt: null,
  nextRunAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  runCount: 0,
  failureCount: 0,
  options: { formats: ['markdown', 'screenshot'] },
  createdAt: new Date(),
  updatedAt: new Date()
};

export const mockDisabledSchedule = {
  id: 'schedule-disabled-1',
  name: 'Disabled Schedule',
  description: 'Disabled for testing',
  templateId: null,
  url: 'https://test.example.com',
  scheduleType: 'interval',
  cronExpression: null,
  intervalSeconds: 300,
  scheduledAt: null,
  enabled: false,
  lastRunAt: null,
  nextRunAt: null,
  runCount: 0,
  failureCount: 0,
  options: {},
  createdAt: new Date(),
  updatedAt: new Date()
};

export function createMockSchedule(overrides = {}) {
  return {
    ...mockCronSchedule,
    ...overrides
  };
}
