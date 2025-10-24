import { FormEvent, useCallback, useMemo, useState } from 'react';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
  CollapsibleCardFooter,
} from '../ui/collapsible-card';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  CrawlJobStatus,
  CrawlOptions,
  CrawlResult,
  ScrapeFormat,
  ScrapeOptions,
  ScrapeResult,
} from '../../services/firecrawlService';
import { useCrawl, useScrape } from '../../hooks/useFirecrawl';
import {
  isValidUrl,
  validateCrawlOptions,
  validateScrapeOptions,
} from '../../utils/validation';
import {
  safeDispatchEvent,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from '../../utils/browser';
import { resolveErrorMessage } from '../../utils/errors';
import { TemplateList, TemplateEditor, TemplateImport } from '../webscraper/templates';
import {
  useTemplates as useTemplateQuery,
  useCreateTemplate as useCreateTemplateMutation,
  useUpdateTemplate as useUpdateTemplateMutation,
  useDeleteTemplate as useDeleteTemplateMutation,
  useImportTemplates as useImportTemplatesMutation,
} from '../../hooks/useWebscraperTemplates';
import type { Template, TemplateInput } from '../../types/webscraper';
import { Search } from 'lucide-react';

const AVAILABLE_FORMATS: ScrapeFormat[] = [
  'markdown',
  'html',
  'rawHtml',
  'links',
  'screenshot',
  'screenshot@fullPage',
  'json',
];

export const FIRECRAWL_STORAGE_KEY = 'firecrawl-jobs';
export const FIRECRAWL_JOB_CREATED_EVENT = 'firecrawl-job-created';

type LastResult = ScrapeResult | CrawlResult | null;

export interface StoredCrawlJob {
  id: string;
  url: string;
  startedAt: string;
  status: CrawlJobStatus;
  lastStatusAt?: string;
  completedAt?: string;
}

export function loadStoredJobs(): StoredCrawlJob[] {
  const raw = safeLocalStorageGet(FIRECRAWL_STORAGE_KEY);
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as StoredCrawlJob[];
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn('[firecrawl] Failed to parse stored jobs', error);
    return [];
  }
}

function persistJob(job: StoredCrawlJob) {
  const jobs = loadStoredJobs();
  const exists = jobs.some((existing) => existing.id === job.id);
  const updatedJobs = exists ? jobs : [job, ...jobs];
  safeLocalStorageSet(FIRECRAWL_STORAGE_KEY, JSON.stringify(updatedJobs));
  safeDispatchEvent(FIRECRAWL_JOB_CREATED_EVENT, job);
}

function isCrawlResult(result: LastResult): result is CrawlResult {
  return Boolean(result && 'data' in result && result.data && 'id' in result.data);
}

function mapTemplateToInput(template: Template): TemplateInput {
  return {
    name: template.name,
    description: template.description ?? '',
    urlPattern: template.urlPattern ?? '',
    options: {
      url: template.options.url,
      formats: template.options.formats ?? ['markdown'],
      onlyMainContent: template.options.onlyMainContent ?? true,
      waitFor: template.options.waitFor,
      timeout: template.options.timeout,
      includeTags: template.options.includeTags ?? [],
      excludeTags: template.options.excludeTags ?? [],
    },
  };
}

export function WebScraperPanel() {
  const [url, setUrl] = useState<string>('');
  const [scrapeType, setScrapeType] = useState<'single' | 'crawl'>('single');
  const [formats, setFormats] = useState<ScrapeFormat[]>(['markdown']);
  const [limit, setLimit] = useState<number>(10);
  const [maxDepth, setMaxDepth] = useState<number>(2);
  const [onlyMainContent, setOnlyMainContent] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [lastResult, setLastResult] = useState<LastResult>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [templateSearchTerm, setTemplateSearchTerm] = useState('');
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);
  const [templateImportOpen, setTemplateImportOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const scrapeMutation = useScrape();
  const crawlMutation = useCrawl();
  const templatesQuery = useTemplateQuery();
  const createTemplateMutation = useCreateTemplateMutation();
  const updateTemplateMutation = useUpdateTemplateMutation();
  const deleteTemplateMutation = useDeleteTemplateMutation();
  const importTemplatesMutation = useImportTemplatesMutation();

  const templates = templatesQuery.data ?? [];
  const templatesLoading = templatesQuery.isLoading;

  const isSubmitting = scrapeMutation.isPending || crawlMutation.isPending;

  const handleToggleFormat = useCallback((format: ScrapeFormat) => {
    setSelectedTemplate(null);
    setFormats((prev) => {
      if (prev.includes(format)) {
        return prev.filter((item) => item !== format);
      }
      return [...prev, format];
    });
  }, []);

  const handleApplyTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    if (template.options.url) {
      setUrl(template.options.url);
    }
    if (template.options.formats?.length) {
      setFormats(template.options.formats);
    } else {
      setFormats(['markdown']);
    }
    setOnlyMainContent(template.options.onlyMainContent ?? true);
    setErrors({});
    setLastResult(null);
  }, []);

  const handleEditTemplate = useCallback((template: Template) => {
    setEditingTemplate(template);
    setTemplateEditorOpen(true);
  }, []);

  const handleSaveTemplate = useCallback((payload: TemplateInput) => {
    if (editingTemplate) {
      updateTemplateMutation.mutate(
        { id: editingTemplate.id, payload },
        {
          onSuccess: () => {
            setTemplateEditorOpen(false);
            setEditingTemplate(null);
          },
        },
      );
    } else {
      createTemplateMutation.mutate(payload, {
        onSuccess: () => {
          setTemplateEditorOpen(false);
        },
      });
    }
  }, [createTemplateMutation, editingTemplate, updateTemplateMutation]);

  const handleDuplicateTemplate = useCallback((template: Template) => {
    const payload: TemplateInput = {
      ...mapTemplateToInput(template),
      name: `${template.name} copy`,
    };
    createTemplateMutation.mutate(payload);
  }, [createTemplateMutation]);

  const handleDeleteTemplate = useCallback((templateId: string) => {
    deleteTemplateMutation.mutate(templateId, {
      onSuccess: () => {
        if (selectedTemplate?.id === templateId) {
          setSelectedTemplate(null);
        }
      },
    });
  }, [deleteTemplateMutation, selectedTemplate]);

  const handleImportTemplates = useCallback((items: TemplateInput[]) => {
    importTemplatesMutation.mutate(items, {
      onSuccess: () => setTemplateImportOpen(false),
    });
  }, [importTemplatesMutation]);

  const validateBeforeSubmit = useCallback(() => {
    if (scrapeType === 'single') {
      const validation = validateScrapeOptions({
        url,
        formats,
        onlyMainContent,
      });
      setErrors(validation.errors);
      return validation.isValid;
    }

    const validation = validateCrawlOptions({
      url,
      limit,
      maxDepth,
      scrapeOptions: {
        url,
        formats,
        onlyMainContent,
      },
    });
    setErrors(validation.errors);
    return validation.isValid;
  }, [formats, limit, maxDepth, onlyMainContent, scrapeType, url]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!validateBeforeSubmit()) {
        return;
      }

      if (scrapeType === 'single') {
        const payload: ScrapeOptions = {
          url,
          formats,
          onlyMainContent,
        };
        scrapeMutation.mutate(payload, {
          onSuccess: (result) => {
            setLastResult(result);
          },
        });
      } else {
        const payload: CrawlOptions = {
          url,
          limit,
          maxDepth,
          scrapeOptions: {
            url,
            formats,
            onlyMainContent,
          },
        };

        crawlMutation.mutate(payload, {
          onSuccess: (result) => {
            setLastResult(result);
            if (result.success && result.data) {
              const now = new Date().toISOString();
              const job: StoredCrawlJob = {
                id: result.data.id,
                url: result.data.url,
                startedAt: now,
                status: 'scraping',
                lastStatusAt: now,
              };
              persistJob(job);
            }
          },
        });
      }
    },
    [crawlMutation, formats, limit, maxDepth, onlyMainContent, scrapeMutation, scrapeType, url, validateBeforeSubmit]
  );

  const formatOptions = useMemo(
    () =>
      AVAILABLE_FORMATS.map((format) => (
        <label
          key={format}
          className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          <input
            type="checkbox"
            className="h-4 w-4 accent-cyan-500"
            checked={formats.includes(format)}
              onChange={() => {
                handleToggleFormat(format);
                if (errors.formats) {
                  setErrors((prev) => {
                    const { formats: _removed, ...rest } = prev;
                    return rest;
                  });
                }
              }}
          />
          <span>{format}</span>
        </label>
      )),
    [formats, handleToggleFormat, errors.formats]
  );

  const renderResult = () => {
    if (!lastResult) {
      return null;
    }

    if (lastResult.success === false) {
      return (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-200">
          <p className="font-semibold">Operation failed</p>
          <p>{lastResult.error || 'Unable to process the request. Please try again.'}</p>
        </div>
      );
    }

    if (isCrawlResult(lastResult)) {
      return (
        <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
          <p className="font-semibold">Crawl job started</p>
          <p>
            Job ID: <span className="font-mono">{lastResult.data?.id}</span>
          </p>
          <p>Firecrawl is now crawling the provided URL. Track progress in the Crawl History panel.</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200">
        <p className="font-semibold">Scrape completed successfully</p>
        {lastResult.data?.markdown && (
          <div>
            <p className="mb-2 font-medium text-emerald-900 dark:text-emerald-100">Markdown preview</p>
            <Textarea
              readOnly
              value={lastResult.data.markdown}
              className="h-48 resize-none bg-white font-mono text-xs dark:bg-gray-900"
            />
          </div>
        )}
        {!lastResult.data?.markdown && (
          <p className="text-emerald-900 dark:text-emerald-100">
            Content fetched successfully. Downloaded formats: {formats.join(', ')}.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <CollapsibleCard cardId="web-scraper" defaultCollapsed={false}>
        <CollapsibleCardHeader className="flex-col items-start gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CollapsibleCardTitle>Web Scraper</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Extract content from web pages using the Firecrawl Proxy API. Choose between single-page scraping or
              multi-page crawling.
            </CollapsibleCardDescription>
          </div>
          {selectedTemplate && (
            <Badge variant="outline" className="text-xs">
              Active template: <span className="ml-1 font-semibold">{selectedTemplate.name}</span>
            </Badge>
          )}
        </CollapsibleCardHeader>

        <CollapsibleCardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="firecrawl-url">
                URL to scrape
              </label>
              <Input
                id="firecrawl-url"
                placeholder="https://example.com"
                value={url}
                onChange={(event) => {
                  setSelectedTemplate(null);
                  setUrl(event.target.value);
                  if (errors.url) {
                    setErrors((prev) => {
                      const { url: _removed, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
                className={errors.url ? 'border-red-500 focus:ring-red-500' : undefined}
              />
              {errors.url && <p className="text-xs text-red-600">{errors.url}</p>}
              {url && !isValidUrl(url) && !errors.url && (
                <p className="text-xs text-amber-500">URL should start with http:// or https://</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="scrape-type">
                Operation
              </label>
              <select
                id="scrape-type"
                className="flex h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                value={scrapeType}
                onChange={(event) => {
                  const value = event.target.value === 'crawl' ? 'crawl' : 'single';
                  setScrapeType(value);
                  setErrors({});
                  setLastResult(null);
                  setSelectedTemplate(null);
                }}
              >
                <option value="single">Single Page Scrape</option>
                <option value="crawl">Multi-Page Crawl</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Content focus</label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-cyan-500"
                  checked={onlyMainContent}
                  onChange={(event) => {
                    setSelectedTemplate(null);
                    setOnlyMainContent(event.target.checked);
                  }}
                />
                Extract only main content (ignore nav bars, footers, ads)
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">Output formats</label>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{formatOptions}</div>
            {errors.formats && <p className="text-xs text-red-600">{errors.formats}</p>}
          </div>

          {scrapeType === 'crawl' && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="crawl-limit">
                  Maximum pages
                </label>
                <Input
                  id="crawl-limit"
                  type="number"
                  min={1}
                  max={1000}
                  value={limit}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    setSelectedTemplate(null);
                    setLimit(value === '' ? 10 : Number(value)); // Default to 10 if empty
                    if (errors.limit) {
                      setErrors((prev) => {
                        const { limit: _removed, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  className={errors.limit ? 'border-red-500 focus:ring-red-500' : undefined}
                />
                {errors.limit && <p className="text-xs text-red-600">{errors.limit}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="crawl-depth">
                  Maximum depth
                </label>
                <Input
                  id="crawl-depth"
                  type="number"
                  min={1}
                  max={10}
                  value={maxDepth}
                  onChange={(event) => {
                    const value = event.target.value.trim();
                    setSelectedTemplate(null);
                    setMaxDepth(value === '' ? 2 : Number(value)); // Default to 2 if empty
                    if (errors.maxDepth) {
                      setErrors((prev) => {
                        const { maxDepth: _removed, ...rest } = prev;
                        return rest;
                      });
                    }
                  }}
                  className={errors.maxDepth ? 'border-red-500 focus:ring-red-500' : undefined}
                />
                {errors.maxDepth && <p className="text-xs text-red-600">{errors.maxDepth}</p>}
              </div>
            </div>
          )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={isSubmitting || !url}>
                {scrapeType === 'single' ? 'Scrape Page' : 'Start Crawl'}
              </Button>
              {isSubmitting && <span className="text-sm text-gray-500">Processing request...</span>}
              {(scrapeMutation.isError || crawlMutation.isError) && (
                <span className="text-sm text-red-600">
                  {resolveErrorMessage(scrapeMutation.error || crawlMutation.error, 'Unable to process the request')}
                </span>
              )}
            </div>
          </form>
        </CollapsibleCardContent>

        <CollapsibleCardFooter>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Result</p>
              <div className="mt-2">{renderResult()}</div>
            </div>
          </div>
        </CollapsibleCardFooter>
      </CollapsibleCard>

      <CollapsibleCard cardId="web-scraper-templates" defaultCollapsed>
        <CollapsibleCardHeader className="flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CollapsibleCardTitle>Template library</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Store reusable scraping presets and apply them to future jobs.
            </CollapsibleCardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setTemplateImportOpen(true)}>
              Import JSON
            </Button>
            <Button variant="outline" onClick={() => window.open('/api/webscraper/templates/export', '_blank')}>
              Export JSON
            </Button>
            <Button onClick={() => { setEditingTemplate(null); setTemplateEditorOpen(true); }}>
              New template
            </Button>
          </div>
        </CollapsibleCardHeader>

        <CollapsibleCardContent className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
            <Search className="h-4 w-4 text-slate-400" />
            <Input
              value={templateSearchTerm}
              onChange={(event) => setTemplateSearchTerm(event.target.value)}
              placeholder="Search templates by name, description or pattern..."
              className="border-none bg-transparent p-0 focus-visible:ring-0"
            />
          </div>

          <TemplateList
            templates={templates}
            isLoading={templatesLoading}
            searchTerm={templateSearchTerm}
            onApply={handleApplyTemplate}
            onEdit={handleEditTemplate}
            onDuplicate={handleDuplicateTemplate}
            onDelete={handleDeleteTemplate}
            isDeleting={deleteTemplateMutation.isPending}
          />
        </CollapsibleCardContent>
      </CollapsibleCard>

      <TemplateEditor
        open={templateEditorOpen}
        onOpenChange={setTemplateEditorOpen}
        template={editingTemplate}
        onSave={handleSaveTemplate}
        isLoading={createTemplateMutation.isPending || updateTemplateMutation.isPending}
      />

      <TemplateImport
        open={templateImportOpen}
        onOpenChange={setTemplateImportOpen}
        onImport={handleImportTemplates}
        isLoading={importTemplatesMutation.isPending}
      />
    </div>
  );
}
