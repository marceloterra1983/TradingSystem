import { FormEvent } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useScrape, useCrawl } from '@/hooks/useFirecrawl';
import { useScrapingStore } from '@/store/scrapingStore';
import { validateScrapeOptions, validateCrawlOptions } from '@/utils/validation';
import { ScrapingForm, ResultsViewer } from '@/components/scraping';

export function ScrapingPage() {
  const store = useScrapingStore();
  const scrapeMutation = useScrape();
  const crawlMutation = useCrawl();

  const isSubmitting = scrapeMutation.isPending || crawlMutation.isPending;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    // Validate form based on scrape type
    const scrapeValidation = validateScrapeOptions(store.options);
    const crawlValidation = store.scrapeType === 'crawl' ? validateCrawlOptions(store.options) : null;

    const errors: Record<string, string> = {
      ...scrapeValidation.errors,
      ...(crawlValidation?.errors ?? {})
    };

    if (!store.url) {
      errors.url = 'URL is required';
    } else {
      try {
        new URL(store.url);
      } catch {
        errors.url = 'Invalid URL format';
      }
    }

    if (store.formats.length === 0) {
      errors.formats = 'At least one format must be selected';
    }

    // If there are errors, update store and stop
    if (Object.keys(errors).length > 0) {
      store.setErrors(errors);
      return;
    }

    // Clear any previous errors
    store.setErrors({});

    try {
      const scrapeOptions = {
        url: store.url,
        formats: store.formats,
        onlyMainContent: store.options.onlyMainContent,
        waitFor: store.options.waitFor,
        timeout: store.options.timeout,
        includeTags: store.options.includeTags,
        excludeTags: store.options.excludeTags
      };

      // Execute scrape or crawl based on type
      if (store.scrapeType === 'crawl') {
        const crawlOptions = {
          url: store.url,
          limit: store.options.limit,
          maxDepth: store.options.maxDepth,
          excludePaths: store.options.excludePaths,
          includePaths: store.options.includePaths,
          scrapeOptions: {
            formats: store.formats,
            onlyMainContent: store.options.onlyMainContent,
            waitFor: store.options.waitFor,
            timeout: store.options.timeout,
            includeTags: store.options.includeTags,
            excludeTags: store.options.excludeTags
          }
        };

        const result = await crawlMutation.mutateAsync({
          options: crawlOptions,
          templateId: store.selectedTemplate?.id
        });
        if (!result) {
          return;
        }
        store.setLastResult(result);
      } else {
        const result = await scrapeMutation.mutateAsync({
          options: scrapeOptions,
          templateId: store.selectedTemplate?.id
        });
        if (!result) {
          return;
        }
        store.setLastResult(result);
      }
    } catch (error) {
      console.error('Failed to execute scraping operation:', error);
      store.setErrors({ submit: 'Failed to execute scraping operation' });
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[3fr,2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Configure scraping job</CardTitle>
          <CardDescription>
            Configure single page scrapes or multi-page crawls routed through firecrawl-proxy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrapingForm
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Results & diagnostics</CardTitle>
          <CardDescription>
            View and download scraped content in your selected formats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResultsViewer
            result={store.lastResult}
            selectedFormats={store.formats}
          />
        </CardContent>
      </Card>
    </div>
  );
}
