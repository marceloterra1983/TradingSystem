import type {
  CrawlOptions,
  CrawlResult,
  CrawlStatus,
  CrawlResultData,
  ScrapeOptions,
  ScrapeResult,
  ScrapeFormat,
  ScrapeData
} from '../services/firecrawlService';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type JobType = 'scrape' | 'crawl';

export type TemplateOptions = Omit<ScrapeOptions, 'url'> & {
  url?: string;
  mode?: 'scrape' | 'crawl';
  jobType?: 'scrape' | 'crawl';
  crawl?: boolean;
  crawlOptions?: Partial<CrawlOptions>;
};

export interface Template {
  id: string;
  name: string;
  description?: string | null;
  urlPattern?: string | null;
  options: TemplateOptions;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateInput {
  name: string;
  description?: string;
  urlPattern?: string;
  options: TemplateOptions;
}

export interface Job {
  id: string;
  type: JobType;
  url: string;
  status: JobStatus;
  firecrawlJobId?: string | null;
  templateId?: string | null;
  template?: Template | null;
  options: ScrapeOptions | CrawlOptions;
  results?: ScrapeResult['data'] | CrawlResult['data'] | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobFilters {
  status?: JobStatus;
  type?: JobType;
  dateFrom?: string;
  dateTo?: string;
  url?: string;
  templateId?: string;
  page?: number;
  pageSize?: number;
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
  recentJobs: Job[];
  jobsPerDay: Array<{ date: string; count: number }>;
  popularTemplates: Array<{ templateId: string; name: string; usageCount: number }>;
}

export interface HistoryQuery extends JobFilters {
  page: number;
  pageSize: number;
}

export type ScheduleType = 'cron' | 'interval' | 'one-time';

export interface JobSchedule {
  id: string;
  name: string;
  description?: string | null;
  templateId?: string | null;
  template?: Template | null;
  url: string;
  scheduleType: ScheduleType;
  cronExpression?: string | null;
  intervalSeconds?: number | null;
  scheduledAt?: string | null;
  enabled: boolean;
  lastRunAt?: string | null;
  nextRunAt?: string | null;
  runCount: number;
  failureCount: number;
  options: TemplateOptions;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleInput {
  name: string;
  description?: string;
  templateId?: string;
  url: string;
  scheduleType: ScheduleType;
  cronExpression?: string;
  intervalSeconds?: number;
  scheduledAt?: string;
  enabled?: boolean;
  options?: TemplateOptions;
}

export interface ScheduleFilters {
  enabled?: boolean;
  templateId?: string;
  scheduleType?: ScheduleType;
}

export interface ScheduleExecutionLog {
  scheduleId: string;
  scheduleName: string;
  executedAt: string;
  status: 'success' | 'failed';
  jobId?: string;
  error?: string;
  duration: number;
  retryCount: number;
}

export type ExportType = 'jobs' | 'templates' | 'schedules' | 'results';
export type ExportFormat = 'csv' | 'json' | 'parquet';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface ExportJob {
  id: string;
  name: string;
  description?: string | null;
  exportType: ExportType;
  formats: ExportFormat[];
  filters?: JobFilters | null;
  status: ExportStatus;
  filePaths?: {
    csv?: string;
    json?: string;
    parquet?: string;
    zip?: string;
  } | null;
  rowCount?: number | null;
  fileSizeBytes?: number | null;
  error?: string | null;
  startedAt: string;
  completedAt?: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExportInput {
  name: string;
  description?: string;
  exportType: ExportType;
  formats: ExportFormat[];
  filters?: JobFilters;
}

export interface ExportFilters {
  status?: ExportStatus;
  exportType?: ExportType;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  pageSize?: number;
}

export type {
  ScrapeOptions,
  ScrapeResult,
  ScrapeFormat,
  ScrapeData,
  CrawlOptions,
  CrawlResult,
  CrawlStatus,
  CrawlResultData
};
