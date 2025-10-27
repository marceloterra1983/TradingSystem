import type { JobStatistics, JobStatus, JobType } from '../types/jobs';
import { formatShortDate } from './dateUtils';

interface ChartPoint {
  name: string;
  value: number;
  status?: JobStatus;
  type?: JobType;
}

const ensureNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export function buildStatusChartData(stats?: JobStatistics): ChartPoint[] {
  if (!stats) {
    return [];
  }

  return Object.entries(stats.byStatus).map(([status, value]) => ({
    name: status,
    value: ensureNumber(value),
    status: status as JobStatus,
  }));
}

export function buildTypeChartData(stats?: JobStatistics): ChartPoint[] {
  if (!stats) {
    return [];
  }

  return Object.entries(stats.byType).map(([type, value]) => ({
    name: type,
    value: ensureNumber(value),
    type: type as JobType,
  }));
}

export function buildJobsPerDayData(
  stats?: JobStatistics,
): Array<{ name: string; value: number }> {
  if (!stats) {
    return [];
  }

  return stats.jobsPerDay
    .map((item) => ({
      name: formatShortDate(item.date),
      value: ensureNumber(item.count),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function formatSuccessRate(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return '0%';
  }
  return `${Math.round(value * 100)}%`;
}
