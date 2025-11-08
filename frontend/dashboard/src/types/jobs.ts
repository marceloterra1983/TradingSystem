export type JobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "pending"
  | string;

export type JobType = "scrape" | "analysis" | "sync" | "notification" | string;

export interface Job {
  id: string;
  name?: string;
  status?: JobStatus;
  type?: JobType;
  url?: string | null;
  templateId?: string | null;
  results?: Record<string, unknown> | null;
  options?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface JobStatistics {
  totals: {
    jobs: number;
    successRate: number;
    templates: number;
  };
  byStatus: Record<JobStatus | string, number>;
  byType: Record<JobType | string, number>;
  jobsPerDay: Array<{ date: string; count: number }>;
  recentJobs: Job[];
  popularTemplates: Array<{ id: string; name: string; usage: number }>;
}

export interface StatisticsFilters {
  dateFrom?: string;
  dateTo?: string;
  templateId?: string;
  status?: JobStatus[];
}
