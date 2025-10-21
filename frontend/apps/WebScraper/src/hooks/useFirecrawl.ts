import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { firecrawlService, type CrawlOptions, type ScrapeOptions } from '../services/firecrawlService';
import { webscraperService } from '../services/webscraperService';
import { useToastStore } from '../store/toastStore';

interface ScrapeMutationVariables {
  options: ScrapeOptions;
  templateId?: string;
  saveJob?: boolean;
}

interface CrawlMutationVariables {
  options: CrawlOptions;
  templateId?: string;
  saveJob?: boolean;
}

export function useScrape() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();

  return useMutation({
    mutationFn: async ({ options, templateId, saveJob = true }: ScrapeMutationVariables) => {
      const result = await firecrawlService.scrape(options);

      if (saveJob) {
        try {
          await webscraperService.createJob({
            type: 'scrape',
            url: options.url,
            status: result.success ? 'completed' : 'failed',
            templateId,
            options,
            results: result.data,
            error: result.error ?? null
          });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['statistics'] });
        } catch (error) {
          console.error('Failed to persist scrape job:', error);
        }
      }

      return result;
    },
    onSuccess: result => {
      if (result.success) {
        showToast({ type: 'success', message: 'Scrape completed successfully!' });
      } else {
        showToast({ type: 'warning', message: result.error ?? 'Scrape finished with warnings' });
      }
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Scrape failed' });
    }
  });
}

export function useCrawl() {
  const queryClient = useQueryClient();
  const { showToast } = useToastStore.getState();

  return useMutation({
    mutationFn: async ({ options, templateId, saveJob = true }: CrawlMutationVariables) => {
      const result = await firecrawlService.crawl(options);

      if (saveJob) {
        try {
          await webscraperService.createJob({
            type: 'crawl',
            url: options.url,
            status: result.success ? 'running' : 'failed',
            templateId,
            options,
            results: result.data,
            firecrawlJobId: result.data?.id
          });
          queryClient.invalidateQueries({ queryKey: ['jobs'] });
          queryClient.invalidateQueries({ queryKey: ['statistics'] });
        } catch (error) {
          console.error('Failed to persist crawl job:', error);
        }
      }

      return result;
    },
    onSuccess: result => {
      if (result.success) {
        showToast({ type: 'info', message: 'Crawl job started successfully!' });
      } else {
        showToast({ type: 'warning', message: result.error ?? 'Crawl finished with warnings' });
      }
    },
    onError: error => {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Crawl failed' });
    }
  });
}

export function useCrawlStatus(crawlId: string | undefined) {
  return useQuery({
    enabled: Boolean(crawlId),
    queryKey: ['crawl-status', crawlId],
    queryFn: () => firecrawlService.getCrawlStatus(crawlId as string),
    refetchInterval: 10_000,
    staleTime: 5_000
  });
}
