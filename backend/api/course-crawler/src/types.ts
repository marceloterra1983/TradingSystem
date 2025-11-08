export interface CourseRecord {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password: string;
  targetUrls: string[];
  createdAt: string;
  updatedAt: string;
}

export type CourseInput = {
  name: string;
  baseUrl: string;
  username: string;
  password: string;
  targetUrls?: string[];
};

export interface CrawlRunRecord {
  id: string;
  courseId: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  outputsDir: string | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  courseName?: string;
  courseBaseUrl?: string;
}
