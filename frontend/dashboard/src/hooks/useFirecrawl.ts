import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  firecrawlService,
  ScrapeOptions,
  ScrapeResult,
  CrawlOptions,
  CrawlResult,
  CrawlStatus,
  FirecrawlHealthResponse,
} from '../services/firecrawlService';
import { useToast } from './useToast';
import { resolveErrorMessage } from '../utils/errors';

export function useScrape() {
  const toast = useToast();

  return useMutation<ScrapeResult, unknown, ScrapeOptions>({
    mutationFn: (options) => firecrawlService.scrape(options),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Page scraped successfully');
      } else {
        toast.error(result.error || 'Failed to scrape page');
      }
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error, 'Failed to scrape page'));
    },
  });
}

export function useCrawl() {
  const toast = useToast();
  const queryClient = useQueryClient();

  return useMutation<CrawlResult, unknown, CrawlOptions>({
    mutationFn: (options) => firecrawlService.crawl(options),
    onSuccess: (result) => {
      if (result.success) {
        toast.success('Crawl job started successfully');
      } else {
        toast.error(result.error || 'Failed to start crawl job');
      }
      queryClient
        .invalidateQueries({ queryKey: ['crawl-jobs'] })
        .catch((error) => {
          console.warn('Failed to invalidate crawl jobs query', error);
        });
    },
    onError: (error) => {
      toast.error(resolveErrorMessage(error, 'Failed to start crawl job'));
    },
  });
}

interface UseCrawlStatusOptions {
  enabled?: boolean;
}

export function useCrawlStatus(
  crawlId: string | null,
  options?: UseCrawlStatusOptions,
) {
  return useQuery<CrawlStatus>({
    queryKey: ['crawl-status', crawlId],
    queryFn: () => {
      if (!crawlId) {
        return Promise.resolve({
          success: false,
          error: 'No crawl ID provided',
        });
      }
      return firecrawlService.getCrawlStatus(crawlId);
    },
    enabled: Boolean(crawlId) && (options?.enabled ?? true),
    staleTime: 0,
    retry: 3,
    refetchInterval: (query) => {
      const status = (query.state.data as CrawlStatus | undefined)?.data
        ?.status;
      return status === 'scraping' ? 5000 : false;
    },
  });
}

export function useFirecrawlHealth() {
  return useQuery<FirecrawlHealthResponse>({
    queryKey: ['firecrawl-health'],
    queryFn: () => firecrawlService.healthCheck(),
    refetchInterval: 30_000,
    staleTime: 20_000,
  });
}
