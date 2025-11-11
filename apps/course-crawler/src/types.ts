export interface VideoResource {
  id: string;
  title: string;
  url: string;
  order: number;
  durationSeconds?: number;
  playable: boolean;
  notes?: string;
  localPath?: string; // Local filesystem path after download
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed';
  fileSizeBytes?: number; // File size in bytes
  resolution?: string; // e.g., "1920x1080"
  format?: string; // e.g., "mp4"
  downloadError?: string; // Error message if download failed
  platform?: string; // e.g., "YouTube", "Vimeo"
}

export interface AttachmentResource {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  localPath?: string; // Local filesystem path after download
  downloadStatus?: 'pending' | 'downloading' | 'completed' | 'failed';
  fileSizeBytes?: number; // File size in bytes
  downloadError?: string; // Error message if download failed
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
  totalAttachments?: number; // Total attachments found
  downloadedAttachments?: number; // Successfully downloaded attachments
  downloadFailures?: number; // Failed downloads
  totalDownloadSizeBytes?: number; // Total size of downloaded files
  totalVideos?: number; // Total videos found
  downloadedVideos?: number; // Successfully downloaded videos
  videoDownloadFailures?: number; // Failed video downloads
  totalVideoSizeBytes?: number; // Total size of downloaded videos
  totalVideoDurationSeconds?: number; // Total duration of all videos
}

export interface ExtractionRun {
  startedAt: string;
  finishedAt: string;
  courses: CourseResource[];
  metrics: ExtractionMetrics;
  incidents: string[];
}
