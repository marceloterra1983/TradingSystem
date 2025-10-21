import axios from 'axios';
import type {
  ExportFilters,
  ExportFormat,
  ExportInput,
  ExportJob,
  Job,
  JobFilters,
  JobSchedule,
  JobStatistics,
  PaginatedResponse,
  ScheduleFilters,
  ScheduleInput,
  Template,
  TemplateInput
} from '../types';

const api = axios.create({
  baseURL: '/api/webscraper'
});

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: Record<string, unknown>;
}

function buildQueryParams<T extends object>(filters?: T): string {
  if (!filters) {
    return '';
  }
  const params = new URLSearchParams();
  Object.entries(filters as Record<string, unknown>).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}

function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (response.success === false || !response.data) {
    throw new Error(response.error || 'Unexpected API response');
  }
  return response.data;
}

function handleError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      'Unknown API error';
    throw new Error(message);
  }
  if (error instanceof Error) {
    throw error;
  }
  throw new Error('Unknown API error');
}

export const webscraperService = {
  async getJobs(filters?: JobFilters): Promise<PaginatedResponse<Job>> {
    try {
      const query = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedResponse<Job>>>(`/jobs${query}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getJob(id: string): Promise<Job> {
    try {
      const response = await api.get<ApiResponse<Job>>(`/jobs/${id}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async createJob(payload: Partial<Job>): Promise<Job> {
    try {
      const response = await api.post<ApiResponse<Job>>('/jobs', payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async deleteJob(id: string): Promise<void> {
    try {
      await api.delete<ApiResponse<null>>(`/jobs/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  async rerunJob(id: string): Promise<Job> {
    try {
      const response = await api.post<ApiResponse<Job>>(`/jobs/${id}/rerun`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getTemplates(): Promise<Template[]> {
    try {
      const response = await api.get<ApiResponse<Template[]>>('/templates');
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getTemplate(id: string): Promise<Template> {
    try {
      const response = await api.get<ApiResponse<Template>>(`/templates/${id}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async createTemplate(payload: TemplateInput): Promise<Template> {
    try {
      const response = await api.post<ApiResponse<Template>>('/templates', payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async updateTemplate(id: string, payload: TemplateInput): Promise<Template> {
    try {
      const response = await api.put<ApiResponse<Template>>(`/templates/${id}`, payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async deleteTemplate(id: string): Promise<void> {
    try {
      await api.delete<ApiResponse<null>>(`/templates/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  async importTemplates(payload: TemplateInput[]): Promise<Template[]> {
    try {
      const response = await api.post<ApiResponse<Template[]>>('/templates/import', payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async exportTemplates(): Promise<Template[]> {
    try {
      const response = await api.get<ApiResponse<Template[]>>('/templates/export');
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getStatistics(params?: { dateFrom?: string; dateTo?: string }): Promise<JobStatistics> {
    try {
      const query = buildQueryParams(params);
      const response = await api.get<ApiResponse<JobStatistics>>(`/statistics${query}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getSchedules(filters?: ScheduleFilters): Promise<JobSchedule[]> {
    try {
      const query = buildQueryParams(filters);
      const response = await api.get<ApiResponse<JobSchedule[]>>(`/schedules${query}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getSchedule(id: string): Promise<JobSchedule> {
    try {
      const response = await api.get<ApiResponse<JobSchedule>>(`/schedules/${id}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async createSchedule(payload: ScheduleInput): Promise<JobSchedule> {
    try {
      const response = await api.post<ApiResponse<JobSchedule>>('/schedules', payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async updateSchedule(id: string, payload: Partial<ScheduleInput>): Promise<JobSchedule> {
    try {
      const response = await api.put<ApiResponse<JobSchedule>>(`/schedules/${id}`, payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async deleteSchedule(id: string): Promise<void> {
    try {
      await api.delete<ApiResponse<null>>(`/schedules/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  async toggleSchedule(id: string): Promise<JobSchedule> {
    try {
      const response = await api.patch<ApiResponse<JobSchedule>>(`/schedules/${id}/toggle`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getScheduleHistory(
    id: string,
    filters?: JobFilters
  ): Promise<PaginatedResponse<Job>> {
    try {
      const query = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedResponse<Job>>>(
        `/schedules/${id}/history${query}`
      );
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getExports(filters?: ExportFilters): Promise<PaginatedResponse<ExportJob>> {
    try {
      const query = buildQueryParams(filters);
      const response = await api.get<ApiResponse<PaginatedResponse<ExportJob>>>(
        `/exports${query}`
      );
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async getExport(id: string): Promise<ExportJob> {
    try {
      const response = await api.get<ApiResponse<ExportJob>>(`/exports/${id}`);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async createExport(payload: ExportInput): Promise<ExportJob> {
    try {
      const response = await api.post<ApiResponse<ExportJob>>('/exports', payload);
      return unwrapResponse(response.data);
    } catch (error) {
      handleError(error);
    }
  },

  async deleteExport(id: string): Promise<void> {
    try {
      await api.delete<ApiResponse<null>>(`/exports/${id}`);
    } catch (error) {
      handleError(error);
    }
  },

  async downloadExport(id: string, format: ExportFormat | 'zip'): Promise<Blob> {
    try {
      const response = await api.get(`/exports/${id}/download/${format}`, {
        responseType: 'blob'
      });
      return response.data as Blob;
    } catch (error) {
      handleError(error);
    }
  }
};
