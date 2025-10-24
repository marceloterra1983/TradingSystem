import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webscraperService } from '../services/webscraperService';
import type {
  Job,
  JobFilters,
  JobStatistics,
  PaginatedResponse,
  StatisticsFilters
} from '../types/jobs';
import { useToast } from './useToast';

const JOBS_QUERY_KEY = 'webscraper-jobs';
const JOB_QUERY_KEY = 'webscraper-job';
const STATS_QUERY_KEY = 'webscraper-job-stats';

function sanitizeFilters(filters: JobFilters): JobFilters {
  const sanitized: JobFilters = { ...filters };
  if (!sanitized.page || sanitized.page < 1) {
    sanitized.page = 1;
  }
  if (!sanitized.limit) {
    sanitized.limit = 25;
  }
  return sanitized;
}

export function useJobs(filters: JobFilters) {
  const sanitizedFilters = useMemo(() => sanitizeFilters(filters), [filters]);

  return useQuery<PaginatedResponse<Job>, Error, PaginatedResponse<Job>, readonly [string, JobFilters]>({
    queryKey: [JOBS_QUERY_KEY, sanitizedFilters] as const,
    queryFn: () => webscraperService.listJobs(sanitizedFilters),
    placeholderData: (previousData) => previousData,
    staleTime: 5_000,
    refetchInterval: (query) => {
      const jobsData = (query as { data?: PaginatedResponse<Job> | undefined }).data;
      if (!jobsData) {
        return false;
      }
      const hasActiveJobs = jobsData.items.some((job: Job) => job.status === 'running' || job.status === 'pending');
      return hasActiveJobs ? 10_000 : false;
    }
  });
}

export function useJob(id: string | null | undefined) {
  return useQuery({
    queryKey: [JOB_QUERY_KEY, id],
    queryFn: () => webscraperService.getJob(id as string),
    enabled: Boolean(id),
    staleTime: 15_000
  });
}

export function useDeleteJob() {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webscraperService.deleteJob(id),
    onSuccess: (_data, id) => {
      toast.success('Job deleted');
      queryClient.invalidateQueries({ queryKey: [JOBS_QUERY_KEY] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: [JOB_QUERY_KEY, id] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] }).catch(() => {});
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to delete job';
      toast.error(message);
    }
  });
}

export function useRerunJob() {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => webscraperService.rerunJob(id),
    onSuccess: (job) => {
      toast.success(`Job ${job.id} re-run triggered`);
      queryClient.invalidateQueries({ queryKey: [JOBS_QUERY_KEY] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: [JOB_QUERY_KEY, job.id] }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: [STATS_QUERY_KEY] }).catch(() => {});
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Failed to rerun job';
      toast.error(message);
    }
  });
}

export function useStatistics(filters: StatisticsFilters) {
  const sanitized = useMemo(() => ({ ...filters }), [filters]);

  return useQuery<JobStatistics>({
    queryKey: [STATS_QUERY_KEY, sanitized],
    queryFn: () => webscraperService.getStatistics(sanitized),
    staleTime: 60_000
  });
}
