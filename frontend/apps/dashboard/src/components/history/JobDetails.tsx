import { useMemo } from 'react';
import { Download, Info, Repeat, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { ResultsViewer } from '../scraping/ResultsViewer';
import { useJob } from '../../hooks/useJobs';
import type { Job } from '../../types/jobs';
import type { ScrapeOptions, CrawlOptions } from '../../services/firecrawlService';
import { downloadFile } from '../../utils/download';
import { formatTimestamp, formatTimestampShort } from '../../utils/dateUtils';

interface JobDetailsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: Job | null;
  isLoading?: boolean;
  onDelete?: (job: Job) => void;
  onRerun?: (job: Job) => void;
}

function resolveFormats(job: Job | null): string[] {
  if (!job) {
    return [];
  }
  if (job.type === 'scrape') {
    const options = job.options as ScrapeOptions;
    return options.formats ?? [];
  }
  const crawlOptions = job.options as CrawlOptions;
  return crawlOptions.scrapeOptions?.formats ?? [];
}

function safeJSONStringify(payload: unknown): string {
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return 'Unable to render payload';
  }
}

export function JobDetails({ open, onOpenChange, job, isLoading: externalLoading, onDelete, onRerun }: JobDetailsProps) {
  const jobId = job?.id;
  const jobQuery = useJob(open ? jobId : null);
  const activeJob = jobQuery.data ?? job;
  const loading = externalLoading || jobQuery.isLoading;
  const formats = useMemo(() => resolveFormats(activeJob ?? null), [activeJob]);

  const resultPayload = activeJob?.results ? { data: activeJob.results } : null;

  const handleDownloadResults = () => {
    if (!activeJob?.results) {
      return;
    }
    downloadFile(
      `webscraper-job-${activeJob.id}-results.json`,
      'application/json',
      safeJSONStringify(activeJob.results)
    );
  };

  const handleDownloadJob = () => {
    if (!activeJob) {
      return;
    }
    downloadFile(
      `webscraper-job-${activeJob.id}.json`,
      'application/json',
      safeJSONStringify(activeJob)
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-full max-w-5xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
          <DialogDescription>
            Inspect job configuration, results, and metadata. Last updated{' '}
            {activeJob?.updatedAt ? formatTimestampShort(activeJob.updatedAt) : '—'}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex h-64 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Loading job details...
          </div>
        ) : !activeJob ? (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-sm text-gray-500 dark:text-gray-400">
            <Info className="h-5 w-5" />
            Unable to load job information. The job may have been removed.
          </div>
        ) : (
          <Tabs defaultValue="results" className="flex flex-col gap-4">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="options">Options</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
              <TabsTrigger value="raw">Raw JSON</TabsTrigger>
            </TabsList>

            <TabsContent value="results" className="space-y-4">
              {resultPayload ? (
                <ResultsViewer result={resultPayload} selectedFormats={formats} />
              ) : (
                <div className="rounded-md border border-dashed border-gray-300 p-6 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  This job has no stored results yet. If it is still running, check again later.
                </div>
              )}
            </TabsContent>

            <TabsContent value="options">
              <ScrollArea className="h-72 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <pre className="text-sm text-gray-700 dark:text-gray-300">
                  {safeJSONStringify(activeJob.options)}
                </pre>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="metadata">
              <ScrollArea className="h-72 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Job ID</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{activeJob.id}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Status</dt>
                    <dd className="capitalize text-gray-800 dark:text-gray-200">{activeJob.status}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Type</dt>
                    <dd className="capitalize text-gray-800 dark:text-gray-200">{activeJob.type}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">URL</dt>
                    <dd className="truncate text-gray-800 dark:text-gray-200" title={activeJob.url}>
                      {activeJob.url}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Started</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {formatTimestamp(activeJob.startedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Completed</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {activeJob.completedAt ? formatTimestamp(activeJob.completedAt) : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Duration</dt>
                    <dd className="text-gray-800 dark:text-gray-200">
                      {activeJob.duration != null ? `${activeJob.duration}s` : '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-gray-600 dark:text-gray-300">Template</dt>
                    <dd className="text-gray-800 dark:text-gray-200">{activeJob.template?.name ?? activeJob.templateId ?? '—'}</dd>
                  </div>
                </dl>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="raw">
              <ScrollArea className="h-72 rounded-md border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
                <pre className="text-sm text-gray-700 dark:text-gray-300">
                  {safeJSONStringify(activeJob)}
                </pre>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadResults}
              disabled={!activeJob?.results}
            >
              <Download className="mr-2 h-4 w-4" />
              Download results
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={handleDownloadJob} disabled={!activeJob}>
              <Download className="mr-2 h-4 w-4" />
              Export job JSON
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => activeJob && onRerun?.(activeJob)}
              disabled={!activeJob}
            >
              <Repeat className="mr-2 h-4 w-4" />
              Rerun job
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              onClick={() => activeJob && onDelete?.(activeJob)}
              disabled={!activeJob}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete job
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
