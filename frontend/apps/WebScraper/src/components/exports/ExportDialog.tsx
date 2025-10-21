import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, ChevronRight, ClipboardList, Database, DownloadCloud, Filter } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { ExportPreview } from './ExportPreview';
import { webscraperService } from '@/services/webscraperService';
import type {
  ExportFormat,
  ExportInput,
  ExportJob,
  ExportType,
  Job,
  JobFilters,
  JobSchedule,
  JobStatus,
  JobType,
  Template
} from '@/types';
import { formatFiltersSummary, getExportTypeLabel } from '@/utils/export';

const exportTypes: Array<{ id: ExportType; label: string; description: string; icon: React.ReactNode }> = [
  {
    id: 'jobs',
    label: 'Jobs',
    description: 'Historical scraping jobs with status, duration and links',
    icon: <DownloadCloud className="h-5 w-5" />
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Template metadata and usage counts',
    icon: <ClipboardList className="h-5 w-5" />
  },
  {
    id: 'schedules',
    label: 'Schedules',
    description: 'Schedule definitions and run statistics',
    icon: <Calendar className="h-5 w-5" />
  }
];

const formats: Array<{ id: ExportFormat; label: string; description: string }> = [
  { id: 'csv', label: 'CSV', description: 'Tabular format for spreadsheets' },
  { id: 'json', label: 'JSON', description: 'Full dataset with nested fields' },
  { id: 'parquet', label: 'Parquet', description: 'Columnar format for analytics' }
];

interface StepState {
  previewData: Array<Job | Template | JobSchedule>;
  estimatedRows: number;
  estimatedSize?: number;
}

function getDefaultFilters(filters?: JobFilters): JobFilters {
  return {
    status: filters?.status,
    type: filters?.type,
    templateId: filters?.templateId,
    url: filters?.url,
    dateFrom: filters?.dateFrom,
    dateTo: filters?.dateTo
  };
}

export interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: (payload: ExportInput) => void;
  isLoading?: boolean;
  defaultFilters?: JobFilters;
}

export function ExportDialog({
  open,
  onOpenChange,
  onExport,
  isLoading,
  defaultFilters
}: ExportDialogProps) {
  const [step, setStep] = useState(1);
  const [formState, setFormState] = useState<ExportInput>({
    name: 'Job export',
    description: '',
    exportType: 'jobs',
    formats: ['csv'],
    filters: getDefaultFilters(defaultFilters)
  });
  const [previewState, setPreviewState] = useState<StepState>({
    previewData: [],
    estimatedRows: 0
  });
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setPreviewState({ previewData: [], estimatedRows: 0 });
      setPreviewError(null);
      setPreviewLoading(false);
      setFormState(current => ({
        ...current,
        filters: getDefaultFilters(defaultFilters)
      }));
    }
  }, [open, defaultFilters]);

  const canProceedStep1 =
    formState.name.trim().length >= 3 && formState.formats.length > 0;

  const filtersSummary = useMemo(() => formatFiltersSummary(formState.filters), [formState.filters]);

  async function loadPreview() {
    setPreviewLoading(true);
    setPreviewError(null);
    try {
      if (formState.exportType === 'jobs') {
        const response = await webscraperService.getJobs({
          ...(formState.filters ?? {}),
          page: 1,
          pageSize: 10
        });
        setPreviewState({
          previewData: response.items,
          estimatedRows: response.total,
          estimatedSize: response.items.length * 500
        });
      } else if (formState.exportType === 'templates') {
        const templates = await webscraperService.getTemplates();
        setPreviewState({
          previewData: templates.slice(0, 10),
          estimatedRows: templates.length
        });
      } else if (formState.exportType === 'schedules') {
        const schedules = await webscraperService.getSchedules();
        setPreviewState({
          previewData: schedules.slice(0, 10),
          estimatedRows: schedules.length
        });
      } else {
        // Results export preview not implemented
        setPreviewState({
          previewData: [],
          estimatedRows: 0
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load preview';
      setPreviewError(message);
    } finally {
      setPreviewLoading(false);
    }
  }

  const goToStep = async (targetStep: number) => {
    if (targetStep === 2 && step === 1) {
      await loadPreview();
    }
    setStep(targetStep);
  };

  const handleFormatToggle = (format: ExportFormat) => {
    setFormState(current => {
      const hasFormat = current.formats.includes(format);
      if (hasFormat) {
        return { ...current, formats: current.formats.filter(item => item !== format) };
      }
      return { ...current, formats: [...current.formats, format] };
    });
  };

  const handleExport = () => {
    onExport(formState);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl overflow-hidden p-0">
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[260px_1fr]">
          <aside className="space-y-6 border-r border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <DialogHeader>
                <DialogTitle className="text-lg font-semibold">Create export</DialogTitle>
                <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
                  Export jobs, templates or schedules with filters and preview.
                </DialogDescription>
              </DialogHeader>
            </div>
            <ol className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
              {[1, 2, 3].map(item => (
                <li
                  key={item}
                  className={`flex items-center gap-2 ${step === item ? 'font-semibold text-slate-900 dark:text-slate-100' : ''}`}
                >
                  <CheckCircle2
                    className={`h-4 w-4 ${step > item ? 'text-emerald-500' : step === item ? 'text-slate-900 dark:text-slate-100' : 'text-slate-300 dark:text-slate-700'}`}
                  />
                  {item === 1 && 'Configure'}
                  {item === 2 && 'Preview'}
                  {item === 3 && 'Confirm'}
                </li>
              ))}
            </ol>
            <div className="rounded-lg border border-dashed border-slate-200 p-4 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <p className="font-medium text-slate-700 dark:text-slate-200">Filters</p>
              <p>{filtersSummary}</p>
            </div>
          </aside>

          <div className="p-6">
            {step === 1 && (
              <div className="space-y-8">
                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Basic details
                  </h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="export-name">Export name</Label>
                      <Input
                        id="export-name"
                        value={formState.name}
                        onChange={event => setFormState(current => ({ ...current, name: event.target.value }))}
                        placeholder="Monthly jobs export"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="export-type">Export type</Label>
                      <Select
                        value={formState.exportType}
                        onValueChange={value =>
                          setFormState(current => ({ ...current, exportType: value as ExportType }))
                        }
                      >
                        <SelectTrigger id="export-type">
                          <SelectValue placeholder="Choose export type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="jobs">Jobs</SelectItem>
                          <SelectItem value="templates">Templates</SelectItem>
                          <SelectItem value="schedules">Schedules</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label htmlFor="export-description">Description (optional)</Label>
                      <Textarea
                        id="export-description"
                        value={formState.description ?? ''}
                        onChange={event =>
                          setFormState(current => ({ ...current, description: event.target.value }))
                        }
                        placeholder="Explain what this export is for…"
                        rows={2}
                      />
                    </div>
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Formats
                  </h3>
                  <div className="grid gap-3 md:grid-cols-3">
                    {formats.map(format => {
                      const checked = formState.formats.includes(format.id);
                      return (
                        <label
                          key={format.id}
                          className={`flex cursor-pointer flex-col gap-2 rounded-lg border p-4 transition hover:border-slate-400 dark:border-slate-800 dark:hover:border-slate-700 ${checked ? 'border-slate-900 dark:border-slate-100' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => handleFormatToggle(format.id)}
                            />
                            <span className="font-medium">{format.label}</span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{format.description}</p>
                        </label>
                      );
                    })}
                  </div>
                </section>

                {formState.exportType === 'jobs' && (
                  <section className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                        Filters
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setFormState(current => ({
                            ...current,
                            filters: getDefaultFilters(defaultFilters)
                          }))
                        }
                      >
                        <Filter className="mr-2 h-4 w-4" />
                        Use current filters
                      </Button>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="filter-status">Status</Label>
                        <Select
                          value={formState.filters?.status ?? ''}
                          onValueChange={value => {
                            const nextStatus = (value || undefined) as JobStatus | undefined;
                            setFormState(current => ({
                              ...current,
                              filters: { ...(current.filters ?? {}), status: nextStatus }
                            }));
                          }}
                        >
                          <SelectTrigger id="filter-status">
                            <SelectValue placeholder="All statuses" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All statuses</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="running">Running</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-type">Type</Label>
                        <Select
                          value={formState.filters?.type ?? ''}
                          onValueChange={value => {
                            const nextType = (value || undefined) as JobType | undefined;
                            setFormState(current => ({
                              ...current,
                              filters: { ...(current.filters ?? {}), type: nextType }
                            }));
                          }}
                        >
                          <SelectTrigger id="filter-type">
                            <SelectValue placeholder="All types" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">All types</SelectItem>
                            <SelectItem value="scrape">Scrape</SelectItem>
                            <SelectItem value="crawl">Crawl</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-template">Template ID</Label>
                        <Input
                          id="filter-template"
                          placeholder="Optional template ID"
                          value={formState.filters?.templateId ?? ''}
                          onChange={event =>
                            setFormState(current => ({
                              ...current,
                              filters: {
                                ...(current.filters ?? {}),
                                templateId: event.target.value || undefined
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-url">URL contains</Label>
                        <Input
                          id="filter-url"
                          placeholder="https://example.com"
                          value={formState.filters?.url ?? ''}
                          onChange={event =>
                            setFormState(current => ({
                              ...current,
                              filters: {
                                ...(current.filters ?? {}),
                                url: event.target.value || undefined
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-date-from">Start date</Label>
                        <Input
                          id="filter-date-from"
                          type="date"
                          value={formState.filters?.dateFrom ?? ''}
                          onChange={event =>
                            setFormState(current => ({
                              ...current,
                              filters: {
                                ...(current.filters ?? {}),
                                dateFrom: event.target.value || undefined
                              }
                            }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="filter-date-to">End date</Label>
                        <Input
                          id="filter-date-to"
                          type="date"
                          value={formState.filters?.dateTo ?? ''}
                          onChange={event =>
                            setFormState(current => ({
                              ...current,
                              filters: {
                                ...(current.filters ?? {}),
                                dateTo: event.target.value || undefined
                              }
                            }))
                          }
                        />
                      </div>
                    </div>
                  </section>
                )}

                <div className="flex justify-end gap-2 border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => goToStep(2)} disabled={!canProceedStep1}>
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                      Preview data
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Review sample rows and estimated file sizes before exporting.
                    </p>
                  </div>
                  <Button variant="ghost" onClick={loadPreview} disabled={previewLoading}>
                    Refresh preview
                  </Button>
                </div>

                {previewLoading ? (
                  <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-slate-200 dark:border-slate-800">
                    <Spinner size="lg" />
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Loading preview data…
                    </p>
                  </div>
                ) : previewError ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {previewError}
                  </div>
                ) : (
                  <ExportPreview
                    exportConfig={formState}
                    previewData={previewState.previewData}
                    estimatedRows={previewState.estimatedRows}
                    estimatedSize={previewState.estimatedSize}
                  />
                )}

                <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button onClick={() => setStep(3)}>Continue</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <header className="space-y-2">
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    Confirm export
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Review the export summary and create the export job.
                  </p>
                </header>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-700 dark:bg-slate-900/50">
                  <dl className="grid gap-4 md:grid-cols-2">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Export type
                      </dt>
                      <dd className="text-sm text-slate-900 dark:text-slate-100">
                        {getExportTypeLabel(formState.exportType)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Formats
                      </dt>
                      <dd className="text-sm text-slate-900 dark:text-slate-100">
                        {formState.formats.join(', ').toUpperCase()}
                        {formState.formats.length > 1 ? ' + ZIP' : ''}
                      </dd>
                    </div>
                    <div className="md:col-span-2">
                      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Filters
                      </dt>
                      <dd className="text-sm text-slate-900 dark:text-slate-100">
                        {filtersSummary}
                      </dd>
                    </div>
                  </dl>
                </div>

                <ExportPreview
                  exportConfig={formState}
                  previewData={previewState.previewData}
                  estimatedRows={previewState.estimatedRows}
                  estimatedSize={previewState.estimatedSize}
                  compact
                />

                <div className="flex justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button onClick={handleExport} disabled={isLoading}>
                    Create export
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
