import { useEffect, useMemo, useRef, useState } from 'react';
import { useVirtualizer, type VirtualItem } from '@tanstack/react-virtual';
import { CalendarDays, Filter, RefreshCcw, Trash2, Repeat } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { useDebounce } from '../../hooks/useDebounce';
import { useJobs } from '../../hooks/useJobs';
import type { Job, JobFilters, JobStatus, JobType } from '../../types/jobs';
import type { Template } from '../../types/webscraper';
import { formatDate, formatShortDate, formatTime } from '../../utils/dateUtils';

const statusColors: Record<JobStatus, string> = {
  pending:
    'bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-900/40 dark:text-amber-200 dark:border-amber-800',
  running:
    'bg-cyan-100 text-cyan-800 border border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-200 dark:border-cyan-800',
  completed:
    'bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800',
  failed:
    'bg-rose-100 text-rose-800 border border-rose-200 dark:bg-rose-900/40 dark:text-rose-200 dark:border-rose-800'
};

interface JobHistoryProps {
  filters: JobFilters;
  onFiltersChange: (changes: Partial<JobFilters>) => void;
  onViewDetails: (job: Job) => void;
  onCompare: (jobs: Job[]) => void;
  onDelete: (job: Job) => void;
  onRerun: (job: Job) => void;
  templates?: Template[];
}

function resolveTemplateName(templateId: string | null | undefined, templates?: Template[]): string {
  if (!templateId || !templates) {
    return templateId ?? '—';
  }
  const match = templates.find((template) => template.id === templateId);
  return match?.name ?? templateId;
}

export function JobHistory({
  filters,
  onFiltersChange,
  onViewDetails,
  onCompare,
  onDelete,
  onRerun,
  templates
}: JobHistoryProps) {
  const [selectedJobIds, setSelectedJobIds] = useState<string[]>([]);
  const [urlQuery, setUrlQuery] = useState(filters.url ?? '');
  const debouncedUrlQuery = useDebounce(urlQuery, 300);

  const { data, isLoading, isFetching, error, refetch } = useJobs(filters);
  const jobs = useMemo(() => data?.items ?? [], [data]);
  const limit = filters.limit ?? 25;
  const total = data?.total ?? 0;
  const page = filters.page ?? 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  useEffect(() => {
    setSelectedJobIds((prev) => prev.filter((id) => jobs.some((job) => job.id === id)));
  }, [jobs]);

  useEffect(() => {
    onFiltersChange({ url: debouncedUrlQuery, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedUrlQuery]);

  useEffect(() => {
    setUrlQuery(filters.url ?? '');
  }, [filters.url]);

  const virtualParentRef = useRef<HTMLDivElement | null>(null);
  const rowVirtualizer = useVirtualizer({
    count: jobs.length,
    getScrollElement: () => virtualParentRef.current,
    estimateSize: () => 76,
    overscan: 8
  });

  const compareDisabled = selectedJobIds.length !== 2;
  const selectedJobs = useMemo(
    () => selectedJobIds.map((id) => jobs.find((job) => job.id === id)).filter((job): job is Job => Boolean(job)),
    [jobs, selectedJobIds]
  );

  const handleToggleSelection = (jobId: string) => {
    setSelectedJobIds((prev) => {
      if (prev.includes(jobId)) {
        return prev.filter((id) => id !== jobId);
      }
      if (prev.length >= 2) {
        const [, second] = prev;
        return [second, jobId];
      }
      return [...prev, jobId];
    });
  };

  const handleClearSelection = () => setSelectedJobIds([]);

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      status: value === 'all' ? undefined : (value as JobStatus),
      page: 1
    });
  };

  const handleTypeChange = (value: string) => {
    onFiltersChange({
      type: value === 'all' ? undefined : (value as JobType),
      page: 1
    });
  };

  const handleTemplateChange = (value: string) => {
    onFiltersChange({
      templateId: value === 'all' ? undefined : value,
      page: 1
    });
  };

  const handleLimitChange = (value: string) => {
    const parsed = Number(value);
    onFiltersChange({
      limit: Number.isNaN(parsed) ? limit : parsed,
      page: 1
    });
  };

  const handlePageChange = (nextPage: number) => {
    onFiltersChange({ page: Math.min(Math.max(1, nextPage), totalPages) });
  };

  const handleDateChange = (field: 'dateFrom' | 'dateTo', value: string) => {
    onFiltersChange({
      [field]: value || undefined,
      page: 1
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
            Filters
          </span>
        </div>
        <Select value={filters.status ?? 'all'} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="running">Running</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.type ?? 'all'} onValueChange={handleTypeChange}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="scrape">Scrape</SelectItem>
            <SelectItem value="crawl">Crawl</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filters.templateId ?? 'all'} onValueChange={handleTemplateChange}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Templates" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All templates</SelectItem>
            {(templates ?? []).map((template) => (
              <SelectItem key={template.id} value={template.id}>
                {template.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={urlQuery}
          onChange={(event) => setUrlQuery(event.target.value)}
          placeholder="Search URL"
          className="w-64"
        />
        <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <CalendarDays className="h-4 w-4" />
          <Input
            type="date"
            value={filters.dateFrom ?? ''}
            onChange={(event) => handleDateChange('dateFrom', event.target.value)}
            className="w-40"
          />
          <span>to</span>
          <Input
            type="date"
            value={filters.dateTo ?? ''}
            onChange={(event) => handleDateChange('dateTo', event.target.value)}
            className="w-40"
          />
        </div>
        <Select value={String(limit)} onValueChange={handleLimitChange}>
          <SelectTrigger className="w-28">
            <SelectValue placeholder="Page size" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="10">10 / page</SelectItem>
            <SelectItem value="25">25 / page</SelectItem>
            <SelectItem value="50">50 / page</SelectItem>
            <SelectItem value="100">100 / page</SelectItem>
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            void refetch();
          }}
          disabled={isFetching}
          className="ml-auto"
        >
          <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={compareDisabled}
            onClick={() => {
              onCompare(selectedJobs);
            }}
          >
            Compare Selected
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleClearSelection} disabled={selectedJobIds.length === 0}>
            Clear Selection
          </Button>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Select exactly two jobs to compare results
          </span>
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Showing {jobs.length} of {total} jobs
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-[40px,120px,100px,minmax(220px,1fr),160px,160px,140px,160px] items-center border-b border-gray-200 bg-gray-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-800 dark:bg-gray-800 dark:text-gray-300">
          <span />
          <span>Status</span>
          <span>Type</span>
          <span>URL</span>
          <span>Template</span>
          <span>Started</span>
          <span>Duration</span>
          <span className="text-right">Actions</span>
        </div>

        <div ref={virtualParentRef} className="max-h-[480px] overflow-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-gray-500 dark:text-gray-400">
              Loading jobs...
            </div>
          ) : error ? (
            <div className="space-y-3 p-6 text-sm text-red-500">
              <p className="font-medium">Failed to load job history</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  void refetch();
                }}
              >
                Retry
              </Button>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
              <p className="font-medium">No jobs found for the selected filters.</p>
              <p className="mt-1">Try adjusting the filters or run a new scrape/crawl job.</p>
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative'
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow: VirtualItem) => {
                const job = jobs[virtualRow.index];
                const isSelected = selectedJobIds.includes(job.id);

                return (
                  <div
                    key={job.id}
                    className={`grid grid-cols-[40px,120px,100px,minmax(220px,1fr),160px,160px,140px,160px] items-center border-b border-gray-100 px-4 py-3 text-sm dark:border-gray-800 ${isSelected ? 'bg-cyan-50/60 dark:bg-cyan-900/30' : 'bg-white dark:bg-gray-900'}`}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                  >
                    <Checkbox checked={isSelected} onCheckedChange={() => handleToggleSelection(job.id)} aria-label={`Select job ${job.id}`} />
                    <Badge className={statusColors[job.status]}>{job.status}</Badge>
                    <span className="capitalize text-gray-700 dark:text-gray-300">{job.type}</span>
                    <span className="truncate text-gray-700 dark:text-gray-300" title={job.url}>
                      {job.url}
                    </span>
                    <span className="truncate text-gray-600 dark:text-gray-400">
                      {resolveTemplateName(job.templateId ?? null, templates)}
                    </span>
                    <div className="flex flex-col text-xs text-gray-500 dark:text-gray-400">
                      <span>{formatDate(job.startedAt)}</span>
                      <span>{formatTime(job.startedAt)}</span>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {job.duration != null ? `${job.duration}s` : '—'}
                    </span>
                    <div className="flex justify-end gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => onViewDetails(job)}>
                        View
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          void onRerun(job);
                        }}
                      >
                        <Repeat className="mr-2 h-4 w-4" />
                        Rerun
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        onClick={() => {
                          void onDelete(job);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => handlePageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Date range:{' '}
          {filters.dateFrom ? formatShortDate(filters.dateFrom) : 'start'} →{' '}
          {filters.dateTo ? formatShortDate(filters.dateTo) : 'today'}
        </div>
      </div>
    </div>
  );
}
