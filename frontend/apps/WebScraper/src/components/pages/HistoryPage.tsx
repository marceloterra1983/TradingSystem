import { useMemo, useState } from 'react';
import { Calendar, Download, Filter, RotateCcw, Trash2, RefreshCw } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Spinner } from '../ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Table, TBody, TD, TH, THead, TR } from '../ui/table';
import {
  useCreateExport,
  useDeleteJob,
  useJob,
  useJobs,
  useRerunJob,
  useTemplates
} from '../../hooks/useWebScraper';
import type { ExportInput, HistoryQuery, Job } from '../../types';
import { ExportDialog } from '../exports';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'completed', label: 'Completed' },
  { value: 'running', label: 'Running' },
  { value: 'pending', label: 'Pending' },
  { value: 'failed', label: 'Failed' }
];

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'scrape', label: 'Scrape' },
  { value: 'crawl', label: 'Crawl' }
];

function StatusIndicator({ status }: { status: Job['status'] }) {
  const variant = {
    completed: 'success',
    running: 'warning',
    pending: 'info',
    failed: 'danger'
  } as const;
  return <Badge variant={variant[status]}>{status}</Badge>;
}

export function HistoryPage() {
  const [filters, setFilters] = useState<HistoryQuery>({
    page: 1,
    pageSize: 20
  });
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const { data: templates } = useTemplates();

  const { data, isLoading, refetch, isFetching } = useJobs(filters);
  const deleteJob = useDeleteJob();
  const rerunJob = useRerunJob();
  const createExport = useCreateExport();
  const jobDetailsQuery = useJob(selectedJobId ?? undefined);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / data.pageSize));
  }, [data]);

  const handleFilterChange = (key: keyof HistoryQuery, value: string | number | undefined) => {
    setFilters(prev => ({
      ...prev,
      page: key === 'page' ? (value as number) : 1,
      [key]: value
    }));
  };

  const handleOpenDetails = (jobId: string) => {
    setSelectedJobId(jobId);
    setDetailsOpen(true);
  };

  const handleExportJobs = (payload: ExportInput) => {
    createExport.mutate(payload, {
      onSuccess: () => setExportDialogOpen(false)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Execution history
          </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Monitor past scrapes and crawls, inspect results and relaunch jobs.
            </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setExportDialogOpen(true)}>
            <Download className="mr-2 h-4 w-4" />
            Export jobs
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Combine filters to narrow down historical runs.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Status
              </span>
              <Select
                value={(filters.status as string) ?? ''}
                onValueChange={value => handleFilterChange('status', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Type
              </span>
              <Select
                value={(filters.type as string) ?? ''}
                onValueChange={value => handleFilterChange('type', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Template
              </span>
              <Select
                value={filters.templateId ?? ''}
                onValueChange={value => handleFilterChange('templateId', value || undefined)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any template</SelectItem>
                  {templates?.map(template => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                URL contains
              </span>
              <Input
                placeholder="https://..."
                value={filters.url ?? ''}
                onChange={event => handleFilterChange('url', event.target.value || undefined)}
              />
            </label>
            <label className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase text-slate-500">
                Date from
              </span>
              <div className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 dark:border-slate-800">
                <Calendar className="h-4 w-4 text-slate-400" />
                <input
                  type="date"
                  value={filters.dateFrom ?? ''}
                  onChange={event => handleFilterChange('dateFrom', event.target.value || undefined)}
                  className="w-full border-none bg-transparent text-sm focus:outline-none"
                />
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Job results</CardTitle>
            <CardDescription>
              Showing {(data?.items.length ?? 0).toLocaleString()} of {data?.total ?? 0} jobs
            </CardDescription>
          </div>
          <Badge variant="outline" className="flex items-center gap-1">
            <Filter className="h-4 w-4" /> {filters.status || 'All'}
          </Badge>
        </CardHeader>
        <CardContent>
          {isLoading || isFetching ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Spinner />
            </div>
          ) : !data?.items.length ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No jobs found for the applied filters.
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>URL</TH>
                  <TH>Type</TH>
                  <TH>Status</TH>
                  <TH>Template</TH>
                  <TH>Started</TH>
                  <TH className="text-right">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {data.items.map(job => (
                  <TR key={job.id}>
                    <TD className="font-mono text-xs">{job.id.slice(0, 8)}...</TD>
                    <TD className="max-w-xs truncate text-xs text-slate-600 dark:text-slate-300">
                      {job.url}
                    </TD>
                    <TD className="capitalize">{job.type}</TD>
                    <TD>
                      <StatusIndicator status={job.status} />
                    </TD>
                    <TD>{job.template?.name ?? '—'}</TD>
                    <TD>
                      {job.startedAt
                        ? new Date(job.startedAt).toLocaleString()
                        : new Date(job.createdAt).toLocaleString()}
                    </TD>
                    <TD className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenDetails(job.id)}
                      >
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => rerunJob.mutate(job.id)}
                        isLoading={rerunJob.isPending}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Rerun
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => deleteJob.mutate(job.id)}
                        isLoading={deleteJob.isPending}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
        <CardContent className="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
          <p className="text-xs text-slate-500">
            Page {filters.page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page <= 1}
              onClick={() => handleFilterChange('page', Math.max(1, (filters.page ?? 1) - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={filters.page >= totalPages}
              onClick={() => handleFilterChange('page', Math.min(totalPages, (filters.page ?? 1) + 1))}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogTitle>Job details</DialogTitle>
          <DialogDescription>Full payload persisted by WebScraper API.</DialogDescription>
          {jobDetailsQuery.isLoading ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Spinner />
            </div>
          ) : jobDetailsQuery.data ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase text-slate-500">Job ID</p>
                  <p className="font-mono text-sm">{jobDetailsQuery.data.id}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Type</p>
                  <p className="text-sm capitalize">{jobDetailsQuery.data.type}</p>
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Status</p>
                  <StatusIndicator status={jobDetailsQuery.data.status} />
                </div>
                <div>
                  <p className="text-xs uppercase text-slate-500">Template</p>
                  <p className="text-sm">
                    {jobDetailsQuery.data.template?.name ?? 'Not linked'}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-500">Target URL</p>
                <p className="break-words text-sm text-slate-700 dark:text-slate-200">
                  {jobDetailsQuery.data.url}
                </p>
              </div>
              <Tabs defaultValue="results">
                <TabsList>
                  <TabsTrigger value="results">Results</TabsTrigger>
                  <TabsTrigger value="options">Options</TabsTrigger>
                  <TabsTrigger value="raw">Raw JSON</TabsTrigger>
                </TabsList>
                <TabsContent value="results">
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(jobDetailsQuery.data.results, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="options">
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(jobDetailsQuery.data.options, null, 2)}
                  </pre>
                </TabsContent>
                <TabsContent value="raw">
                  <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(jobDetailsQuery.data, null, 2)}
                  </pre>
                </TabsContent>
              </Tabs>
              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                <span>
                  Started: {jobDetailsQuery.data.startedAt ? new Date(jobDetailsQuery.data.startedAt).toLocaleString() : '—'}
                </span>
                <span>
                  Duration:{' '}
                  {jobDetailsQuery.data.duration
                    ? `${jobDetailsQuery.data.duration}s`
                    : '—'}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-rose-500">Failed to load job details.</p>
          )}
        </DialogContent>
      </Dialog>
      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExportJobs}
        isLoading={createExport.isPending}
        defaultFilters={filters}
      />
    </div>
  );
}
