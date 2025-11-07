export interface VideoResource {
  id: string;
  title: string;
  url: string;
  order: number;
  durationSeconds?: number;
  playable: boolean;
  notes?: string;
}

export interface AttachmentResource {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
}

export interface ClassResource {
  id: string;
  title: string;
  url: string;
  order: number;
  durationSeconds?: number;
  markdown?: string;
  rawHtml?: string;
  transcript?: string;
  confidenceScore: number;
  videos: VideoResource[];
  attachments: AttachmentResource[];
  lastUpdatedAt?: string;
}

export interface ModuleResource {
  id: string;
  title: string;
  url: string;
  order: number;
  classes: ClassResource[];
  lastUpdatedAt?: string;
}

export interface CourseResource {
  id: string;
  title: string;
  url: string;
  modules: ModuleResource[];
  lastUpdatedAt?: string;
}

export interface ExtractionMetrics {
  totalCourses: number;
  totalModules: number;
  totalClasses: number;
  successRate: number;
  minConfidence: number;
  avgConfidence: number;
  selectorFailures: number;
}

export interface ExtractionRun {
  startedAt: string;
  finishedAt: string;
  courses: CourseResource[];
  metrics: ExtractionMetrics;
  incidents: string[];
}
