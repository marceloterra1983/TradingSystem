import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { Job, JobStatistics, StatisticsFilters } from '../types/jobs';

const RAW_JOBS_API_BASE =
  ((import.meta.env as Record<string, string | undefined>).VITE_JOBS_API_URL ?? '').trim();
const JOBS_API_BASE = RAW_JOBS_API_BASE.replace(/\/+$/, '');
const HAS_JOBS_API = JOBS_API_BASE.length > 0;

const DEFAULT_STATISTICS: JobStatistics = {
  totals: {
    jobs: 0,
    successRate: 0,
    templates: 0,
  },
  byStatus: {},
  byType: {},
  jobsPerDay: [],
  recentJobs: [],
  popularTemplates: [],
};

type ApiEnvelope<T> =
  | T
  | {
      data?: T;
      result?: T;
      success?: boolean;
    };

const toJob = (payload: unknown, fallbackId?: string): Job => {
  if (!payload || typeof payload !== 'object') {
    return { id: fallbackId ?? 'unknown' };
  }
  const base = payload as Partial<Job> & { id?: string };
  return {
    id: base.id ?? fallbackId ?? 'unknown',
    name: base.name,
    status: base.status,
    type: base.type,
    templateId: base.templateId ?? null,
    results: base.results ?? null,
    options: base.options ?? null,
    metadata: base.metadata ?? null,
    createdAt: base.createdAt,
    updatedAt: base.updatedAt,
  };
};

const toStatistics = (payload: unknown): JobStatistics => {
  if (!payload || typeof payload !== 'object') {
    return DEFAULT_STATISTICS;
  }

  const base = payload as Partial<JobStatistics>;
  return {
    totals: {
      jobs: base.totals?.jobs ?? 0,
      successRate:
        typeof base.totals?.successRate === 'number' ? base.totals.successRate : 0,
      templates: base.totals?.templates ?? 0,
    },
    byStatus: { ...(base.byStatus ?? {}) },
    byType: { ...(base.byType ?? {}) },
    jobsPerDay: Array.isArray(base.jobsPerDay)
      ? base.jobsPerDay
          .filter(
            (item): item is { date: string; count: number } =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.date === 'string' &&
              typeof item.count === 'number',
          )
          .map((item) => ({ date: item.date, count: item.count }))
      : [],
    recentJobs: Array.isArray(base.recentJobs)
      ? base.recentJobs.map((item) => toJob(item))
      : [],
    popularTemplates: Array.isArray(base.popularTemplates)
      ? base.popularTemplates
          .filter(
            (item): item is { id: string; name: string; usage: number } =>
              typeof item === 'object' &&
              item !== null &&
              typeof item.id === 'string' &&
              typeof item.name === 'string' &&
              typeof item.usage === 'number',
          )
          .map((item) => ({ id: item.id, name: item.name, usage: item.usage }))
      : [],
  };
};

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Jobs API ${response.status}: ${await response.text()}`);
  }

  return (await response.json()) as T;
}

async function loadStatistics(filters: StatisticsFilters): Promise<JobStatistics> {
  if (!HAS_JOBS_API) {
    return DEFAULT_STATISTICS;
  }

  try {
    const url = new URL(`${JOBS_API_BASE}/statistics`);
    if (filters.dateFrom) url.searchParams.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) url.searchParams.set('dateTo', filters.dateTo);
    if (filters.templateId) url.searchParams.set('templateId', filters.templateId);
    if (filters.status && filters.status.length > 0) {
      filters.status.forEach((status) => url.searchParams.append('status', status));
    }

    const payload = await fetchJson<ApiEnvelope<JobStatistics>>(url.toString());
    const data =
      (typeof payload === 'object' && payload !== null && 'data' in payload
        ? (payload as { data?: JobStatistics }).data
        : undefined) ??
      (typeof payload === 'object' && payload !== null && 'result' in payload
        ? (payload as { result?: JobStatistics }).result
        : undefined) ??
      (payload as JobStatistics | undefined);

    return toStatistics(data);
  } catch (error) {
    console.warn('[useJobs] Failed to load statistics', error);
    return DEFAULT_STATISTICS;
  }
}

async function loadJob(id: string): Promise<Job | null> {
  if (!HAS_JOBS_API) {
    return { id };
  }

  try {
    const url = new URL(`${JOBS_API_BASE}/${encodeURIComponent(id)}`);
    const payload = await fetchJson<ApiEnvelope<Job>>(url.toString());
    const data =
      (typeof payload === 'object' && payload !== null && 'data' in payload
        ? (payload as { data?: Job }).data
        : undefined) ??
      (typeof payload === 'object' && payload !== null && 'result' in payload
        ? (payload as { result?: Job }).result
        : undefined) ??
      (payload as Job | undefined);
    return data ? toJob(data, id) : { id };
  } catch (error) {
    console.warn('[useJobs] Failed to load job', id, error);
    return { id };
  }
}

export function useStatistics(
  filters: StatisticsFilters,
): UseQueryResult<JobStatistics> {
  return useQuery({
    queryKey: ['jobs', 'statistics', filters],
    queryFn: () => loadStatistics(filters),
    initialData: DEFAULT_STATISTICS,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  });
}

export function useJob(id: string | null): UseQueryResult<Job | null> {
  return useQuery({
    queryKey: ['jobs', 'detail', id],
    enabled: Boolean(id),
    queryFn: () => loadJob(id ?? ''),
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    placeholderData: id ? { id } : null,
  });
}
