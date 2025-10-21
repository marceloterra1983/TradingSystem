import { randomUUID } from 'node:crypto';
import { vi } from 'vitest';
import prisma from '../config/database.js';

export const mockedMetrics = {
  register: {
    metrics: vi.fn(async () => '# mock metrics\n'),
    contentType: 'text/plain; version=0.0.4'
  },
  metricsMiddleware: vi.fn((_req, _res, next) => next()),
  metricsHandler: vi.fn(async () => '# mock metrics\n'),
  incrementJobMetric: vi.fn(),
  setTemplateCount: vi.fn(),
  setActiveJobCount: vi.fn(),
  setScheduleCount: vi.fn(),
  incrementScheduleExecution: vi.fn(),
  observeScheduleExecutionDuration: vi.fn()
};

export async function resetDatabase() {
  await prisma.exportJob.deleteMany();
  await prisma.scrapeJob.deleteMany();
  await prisma.jobSchedule.deleteMany();
  await prisma.template.deleteMany();
}

export async function createTestTemplate(overrides = {}) {
  const data = {
    name: overrides.name ?? `Template ${randomUUID()}`,
    description: overrides.description ?? 'Test template description',
    urlPattern: overrides.urlPattern ?? '.*/test/.*',
    options:
      overrides.options ?? {
        formats: ['markdown'],
        onlyMainContent: true
      },
    usageCount: overrides.usageCount ?? 0
  };
  return prisma.template.create({ data });
}

export async function createTestJob(overrides = {}) {
  const template = overrides.template ?? null;
  const data = {
    type: overrides.type ?? 'scrape',
    url: overrides.url ?? 'https://example.com/article',
    status: overrides.status ?? 'completed',
    templateId: overrides.templateId ?? template?.id ?? null,
    scheduleId: overrides.scheduleId ?? null,
    firecrawlJobId: overrides.firecrawlJobId ?? null,
    options:
      overrides.options ??
      (overrides.type === 'crawl'
        ? {
            limit: 10,
            maxDepth: 2,
            scrapeOptions: { formats: ['markdown'], onlyMainContent: true }
          }
        : { formats: ['markdown'], onlyMainContent: true }),
    results: overrides.results ?? { markdown: '# Test Content\n\nSeeded by test utility.' },
    error: overrides.error ?? null,
    startedAt: overrides.startedAt ?? new Date(),
    completedAt: overrides.completedAt ?? new Date(),
    duration: overrides.duration ?? 42
  };

  delete data.template;
  return prisma.scrapeJob.create({
    data,
    include: { template: true }
  });
}

export async function createTestSchedule(overrides = {}) {
  const data = {
    name: overrides.name ?? `Schedule ${randomUUID()}`,
    description: overrides.description ?? 'Automated test schedule',
    templateId: overrides.templateId ?? null,
    url: overrides.url ?? 'https://example.com',
    scheduleType: overrides.scheduleType ?? 'cron',
    cronExpression: overrides.scheduleType === 'cron' ? overrides.cronExpression ?? '0 9 * * *' : null,
    intervalSeconds: overrides.scheduleType === 'interval' ? overrides.intervalSeconds ?? 3600 : null,
    scheduledAt:
      overrides.scheduleType === 'one-time'
        ? overrides.scheduledAt ?? new Date(Date.now() + 60 * 60 * 1000)
        : null,
    enabled: overrides.enabled ?? true,
    lastRunAt: overrides.lastRunAt ?? null,
    nextRunAt:
      overrides.nextRunAt ??
      (overrides.scheduleType === 'interval'
        ? new Date(Date.now() + (overrides.intervalSeconds ?? 3600) * 1000)
        : overrides.scheduleType === 'one-time'
          ? overrides.scheduledAt ?? new Date(Date.now() + 60 * 60 * 1000)
          : new Date(Date.now() + 60 * 1000)),
    runCount: overrides.runCount ?? 0,
    failureCount: overrides.failureCount ?? 0,
    options: overrides.options ?? { formats: ['markdown'] }
  };

  return prisma.jobSchedule.create({
    data,
    include: { template: true }
  });
}

export { prisma };
