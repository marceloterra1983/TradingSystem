import type { ScrapeFormat } from '../services/firecrawlService';

export interface TemplateOptions {
  url?: string;
  formats?: ScrapeFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  includeTags?: string[];
  excludeTags?: string[];
}

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
