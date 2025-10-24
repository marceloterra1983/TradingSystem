import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { webscraperTemplateService } from '../services/webscraperTemplates';
import type { Template, TemplateInput } from '../types/webscraper';
import { useToast } from './useToast';

export function useTemplates() {
  return useQuery<Template[]>({
    queryKey: ['webscraper-templates'],
    queryFn: () => webscraperTemplateService.list(),
    staleTime: 60_000,
  });
}

export function useCreateTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: TemplateInput) => webscraperTemplateService.create(payload),
    onSuccess: (template) => {
      toast.success(`Template "${template.name}" created successfully`);
      queryClient.invalidateQueries({ queryKey: ['webscraper-templates'] }).catch(() => {});
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create template');
    },
  });
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: TemplateInput }) =>
      webscraperTemplateService.update(id, payload),
    onSuccess: (template) => {
      toast.success(`Template "${template.name}" updated`);
      queryClient.invalidateQueries({ queryKey: ['webscraper-templates'] }).catch(() => {});
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update template');
    },
  });
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (id: string) => webscraperTemplateService.remove(id),
    onSuccess: () => {
      toast.success('Template deleted');
      queryClient.invalidateQueries({ queryKey: ['webscraper-templates'] }).catch(() => {});
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete template');
    },
  });
}

export function useImportTemplates() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (payload: TemplateInput[]) => webscraperTemplateService.importMany(payload),
    onSuccess: (templates) => {
      toast.success(`Imported ${templates.length} template${templates.length === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['webscraper-templates'] }).catch(() => {});
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to import templates');
    },
  });
}
