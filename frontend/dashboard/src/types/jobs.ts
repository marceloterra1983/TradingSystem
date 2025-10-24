import type {
  ScrapeOptions,
  ScrapeData,
  CrawlOptions,
  CrawlResultData
} from '../services/firecrawlService';
import type { Template } from './webscraper';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type RawJobStatus = JobStatus | 'scraping' | 'queued';
export type JobType = 'scrape' | 'crawl';

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  url: string;
  templateId?: string | null;
  template?: Template | null;
  options: ScrapeOptions | CrawlOptions;
  results?: ScrapeData | CrawlResultData | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown> | null;
}

export interface JobFilters {
  status?: JobStatus;
  type?: JobType;
  templateId?: string;
  url?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface JobStatistics {
  totals: {
    jobs: number;
    templates: number;
    successRate: number;
  };
  byStatus: Record<JobStatus, number>;
  byType: Record<JobType, number>;
  jobsPerDay: Array<{ date: string; count: number }>;
  recentJobs: Job[];
  popularTemplates: Array<{ templateId: string; name: string; usageCount: number }>;
}

export interface StatisticsFilters {
  dateFrom?: string;
  dateTo?: string;
}

export function normalizeJobStatus(status: RawJobStatus | null | undefined): JobStatus {
  switch (status) {
    case 'queued':
    case 'pending':
      return 'pending';
    case 'scraping':
      return 'running';
    case 'running':
      return 'running';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'pending';
  }
}

export function mapJobStatus<T extends { status: RawJobStatus }>(job: T): T & { status: JobStatus } {
  return {
    ...job,
    status: normalizeJobStatus(job.status)
  };
}
