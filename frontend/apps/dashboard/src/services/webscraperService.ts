import { getApiUrl } from '../config/api';
import type {
  Job,
  JobFilters,
  JobStatistics,
  PaginatedResponse,
  StatisticsFilters
} from '../types/jobs';
import { mapJobStatus } from '../types/jobs';

const API_BASE_URL = getApiUrl('webscraper').replace(/\/$/, '');

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

function buildQuery(params?: Record<string, string | number | undefined | null>): string {
  if (!params) {
    return '';
  }
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    searchParams.append(key, String(value));
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

function serializeJobFilters(filters: JobFilters): Record<string, string | number | undefined | null> {
  const serialized: Record<string, string | number | undefined | null> = {};
  if (filters.status) serialized.status = filters.status;
  if (filters.type) serialized.type = filters.type;
  if (filters.templateId) serialized.templateId = filters.templateId;
  if (filters.url) serialized.url = filters.url;
  if (filters.dateFrom) serialized.dateFrom = filters.dateFrom;
  if (filters.dateTo) serialized.dateTo = filters.dateTo;
  if (filters.page) serialized.page = filters.page;
  if (filters.limit) serialized.limit = filters.limit;
  return serialized;
}

function serializeStatisticsFilters(filters: StatisticsFilters): Record<string, string | number | undefined | null> {
  const serialized: Record<string, string | number | undefined | null> = {};
  if (filters.dateFrom) serialized.dateFrom = filters.dateFrom;
  if (filters.dateTo) serialized.dateTo = filters.dateTo;
  return serialized;
}

async function parseResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!response.ok) {
    if (isJson) {
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      const message = payload.error || (payload.meta?.message as string) || response.statusText;
      throw new Error(message);
    }
    throw new Error(`Request failed with status ${response.status}`);
  }

  if (!isJson) {
    throw new Error('Unexpected non-JSON response from Webscraper API');
  }

  const payload = (await response.json()) as ApiEnvelope<T> | T;
  if ('success' in (payload as ApiEnvelope<T>)) {
    const envelope = payload as ApiEnvelope<T>;
    if (envelope.success === false || envelope.data === undefined) {
      throw new Error(envelope.error || 'Unexpected API response');
    }
    return envelope.data;
  }

  return payload as T;
}

function transformJob(job: unknown): Job {
  const withStatus = job as Job & { status: string };
  return mapJobStatus(withStatus) as Job;
}

function transformJobList(response: PaginatedResponse<unknown>): PaginatedResponse<Job> {
  return {
    ...response,
    items: response.items.map(transformJob)
  };
}

export const webscraperService = {
  async listJobs(filters: JobFilters): Promise<PaginatedResponse<Job>> {
    const query = buildQuery(serializeJobFilters(filters));
    const url = `${API_BASE_URL}/jobs${query}`;
    const response = await fetch(url, { method: 'GET' });
    const data = await parseResponse<PaginatedResponse<unknown>>(response);
    return transformJobList(data);
  },

  async getJob(id: string): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`, { method: 'GET' });
    const data = await parseResponse<unknown>(response);
    return transformJob(data);
  },

  async deleteJob(id: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}`, { method: 'DELETE' });
    await parseResponse<null>(response);
  },

  async rerunJob(id: string): Promise<Job> {
    const response = await fetch(`${API_BASE_URL}/jobs/${id}/rerun`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    const data = await parseResponse<unknown>(response);
    return transformJob(data);
  },

  async getStatistics(filters: StatisticsFilters = {}): Promise<JobStatistics> {
    const query = buildQuery(serializeStatisticsFilters(filters));
    const response = await fetch(`${API_BASE_URL}/statistics${query}`, { method: 'GET' });
    return parseResponse<JobStatistics>(response);
  }
};
