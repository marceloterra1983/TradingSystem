import type { JobStatistics, JobStatus, JobType } from '../types/jobs';
import { formatShortDate } from './dateUtils';

interface ChartPoint {
  name: string;
  value: number;
  status?: JobStatus;
  type?: JobType;
}

export function buildStatusChartData(stats?: JobStatistics): ChartPoint[] {
  if (!stats) {
    return [];
  }
  return Object.entries(stats.byStatus).map(([status, value]) => ({
    name: status,
    value,
    status: status as JobStatus,
  }));
}

export function buildTypeChartData(stats?: JobStatistics): ChartPoint[] {
  if (!stats) {
    return [];
  }
  return Object.entries(stats.byType).map(([type, value]) => ({
    name: type,
    value,
    type: type as JobType,
  }));
}

export function buildJobsPerDayData(stats?: JobStatistics): Array<{ name: string; value: number }> {
  if (!stats) {
    return [];
  }

  return stats.jobsPerDay
    .map((item) => ({
      name: formatShortDate(item.date),
      value: item.count,
    }))
    .sort((a, b) => (a.name > b.name ? 1 : -1));
}

export function formatSuccessRate(value?: number): string {
  if (value === undefined || Number.isNaN(value)) {
    return '0%';
  }
  return `${Math.round(value * 100)}%`;
}
