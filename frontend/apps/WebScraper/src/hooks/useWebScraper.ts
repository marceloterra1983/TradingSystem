import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webscraperService } from '../services/webscraperService';
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
import { useToastStore } from '../store/toastStore';

export function useJobs(filters: JobFilters) {
  return useQuery<PaginatedResponse<Job>>({
    queryKey: ['jobs', filters],
    queryFn: () => webscraperService.getJobs(filters),
    keepPreviousData: true,
    refetchInterval: filters.status === 'running' ? 10_000 : false
  });
}

export function useJob(id: string | undefined) {
  return useQuery<Job>({
    enabled: Boolean(id),
    queryKey: ['jobs', id],
    queryFn: () => webscraperService.getJob(id as string)
  });
}

export function useStatistics(params?: { dateFrom?: string; dateTo?: string }) {
  return useQuery<JobStatistics>({
    queryKey: ['statistics', params],
    queryFn: () => webscraperService.getStatistics(params ?? {}),
    staleTime: 60_000
  });
}

export function useTemplates() {
  return useQuery<Template[]>({
    queryKey: ['templates'],
    queryFn: () => webscraperService.getTemplates(),
    staleTime: 5 * 60_000
  });
}

export function useTemplate(id: string | undefined) {
  return useQuery<Template>({
    enabled: Boolean(id),
    queryKey: ['templates', id],
    queryFn: () => webscraperService.getTemplate(id as string),
    staleTime: 5 * 60_000
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (payload: TemplateInput) => webscraperService.createTemplate(payload),
    onSuccess: template => {
      showToast({ type: 'success', message: `Template "${template.name}" created successfully!` });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to create template' });
    }
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: ({ templateId, payload }: { templateId: string; payload: TemplateInput }) =>
      webscraperService.updateTemplate(templateId, payload),
    onSuccess: template => {
      showToast({ type: 'success', message: `Template "${template.name}" updated successfully!` });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates', template.id] });
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update template' });
    }
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (templateId: string) => webscraperService.deleteTemplate(templateId),
    onSuccess: (_data, templateId) => {
      showToast({ type: 'success', message: 'Template deleted' });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      queryClient.invalidateQueries({ queryKey: ['templates', templateId] });
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete template' });
    }
  });
}

export function useImportTemplates() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (payload: TemplateInput[]) => webscraperService.importTemplates(payload),
    onSuccess: (templates) => {
      const count = templates.length;
      showToast({
        type: 'success',
        message: `Successfully imported ${count} template${count === 1 ? '' : 's'}!`
      });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: (error) => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to import templates'
      });
    }
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (jobId: string) => webscraperService.deleteJob(jobId),
    onSuccess: () => {
      showToast({ type: 'success', message: 'Job deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to delete job' });
    }
  });
}

export function useRerunJob() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (jobId: string) => webscraperService.rerunJob(jobId),
    onSuccess: job => {
      showToast({ type: 'info', message: `Job ${job.id} re-run triggered` });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['statistics'] });
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to rerun job' });
    }
  });
}

export function useSchedules(filters?: ScheduleFilters) {
  return useQuery<JobSchedule[]>({
    queryKey: ['schedules', filters],
    queryFn: () => webscraperService.getSchedules(filters),
    staleTime: 60_000,
    refetchInterval: 30_000
  });
}

export function useSchedule(id: string | undefined) {
  return useQuery<JobSchedule>({
    enabled: Boolean(id),
    queryKey: ['schedules', id],
    queryFn: () => webscraperService.getSchedule(id as string),
    staleTime: 60_000
  });
}

export function useCreateSchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (payload: ScheduleInput) => webscraperService.createSchedule(payload),
    onSuccess: schedule => {
      showToast({
        type: 'success',
        message: `Schedule "${schedule.name}" created successfully!`
      });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create schedule'
      });
    }
  });
}

export function useUpdateSchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: ({ scheduleId, payload }: { scheduleId: string; payload: Partial<ScheduleInput> }) =>
      webscraperService.updateSchedule(scheduleId, payload),
    onSuccess: schedule => {
      showToast({
        type: 'success',
        message: `Schedule "${schedule.name}" updated successfully!`
      });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', schedule.id] });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to update schedule'
      });
    }
  });
}

export function useDeleteSchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (scheduleId: string) => webscraperService.deleteSchedule(scheduleId),
    onSuccess: () => {
      showToast({ type: 'success', message: 'Schedule deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete schedule'
      });
    }
  });
}

export function useToggleSchedule() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (scheduleId: string) => webscraperService.toggleSchedule(scheduleId),
    onSuccess: schedule => {
      showToast({
        type: 'info',
        message: `Schedule "${schedule.name}" ${schedule.enabled ? 'enabled' : 'disabled'}`
      });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['schedules', schedule.id] });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to toggle schedule'
      });
    }
  });
}

export function useScheduleHistory(
  scheduleId: string | undefined,
  filters?: JobFilters
) {
  return useQuery<PaginatedResponse<Job>>({
    enabled: Boolean(scheduleId),
    queryKey: ['schedules', scheduleId, 'history', filters],
    queryFn: () => webscraperService.getScheduleHistory(scheduleId as string, filters),
    staleTime: 30_000
  });
}

export function useExports(filters?: ExportFilters) {
  return useQuery<PaginatedResponse<ExportJob>>({
    queryKey: ['exports', filters],
    queryFn: () => webscraperService.getExports(filters),
    keepPreviousData: true,
    refetchInterval: data => {
      const pending = data?.items?.some(exp =>
        ['pending', 'processing'].includes(exp.status)
      );
      return pending ? 5_000 : false;
    }
  });
}

export function useExport(id: string | undefined) {
  return useQuery<ExportJob>({
    enabled: Boolean(id),
    queryKey: ['exports', id],
    queryFn: () => webscraperService.getExport(id as string),
    staleTime: 30_000
  });
}

export function useCreateExport() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (payload: ExportInput) => webscraperService.createExport(payload),
    onSuccess: exportJob => {
      showToast({
        type: 'info',
        message: `Export "${exportJob.name}" started. Check export history for status.`
      });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to create export'
      });
    }
  });
}

export function useDeleteExport() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: (exportId: string) => webscraperService.deleteExport(exportId),
    onSuccess: () => {
      showToast({ type: 'success', message: 'Export deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['exports'] });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete export'
      });
    }
  });
}

export function useDownloadExport() {
  const { showToast } = useToastStore.getState();
  return useMutation({
    mutationFn: ({ exportId, format }: { exportId: string; format: ExportFormat | 'zip' }) =>
      webscraperService.downloadExport(exportId, format),
    onSuccess: (blob, variables) => {
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.download = `export-${variables.exportId}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast({ type: 'success', message: 'Export download started' });
    },
    onError: error => {
      showToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to download export'
      });
    }
  });
}
