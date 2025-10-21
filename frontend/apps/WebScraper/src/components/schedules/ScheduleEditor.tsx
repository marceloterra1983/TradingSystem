import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, ChevronRight, Clock, Map, PlayCircle, Repeat, Settings } from 'lucide-react';
import { CronBuilder } from './CronBuilder';
import { validateSchedule } from '@/utils/validation';
import type {
  JobSchedule,
  ScheduleInput,
  Template,
  TemplateOptions,
  ScrapeFormat
} from '@/types';
import { describeCron, formatIntervalSeconds } from '@/utils/cron';

type FormState = ScheduleInput & { options: TemplateOptions };

const SCRAPE_FORMATS: ScrapeFormat[] = [
  'markdown',
  'html',
  'rawHtml',
  'links',
  'screenshot',
  'screenshot@fullPage',
  'json'
];

const DEFAULT_OPTIONS: TemplateOptions = {
  url: '',
  formats: ['markdown'],
  onlyMainContent: true,
  waitFor: 0,
  timeout: 15000,
  includeTags: [],
  excludeTags: [],
  mode: 'scrape',
  jobType: 'scrape',
  crawl: false
};

const DEFAULT_FORM: FormState = {
  name: '',
  description: '',
  templateId: undefined,
  url: '',
  scheduleType: 'cron',
  cronExpression: '0 9 * * *',
  intervalSeconds: undefined,
  scheduledAt: undefined,
  enabled: true,
  options: { ...DEFAULT_OPTIONS }
};

function toDateTimeLocal(value: string | undefined | null) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string) {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }
  return parsed.toISOString();
}

function inferInterval(seconds?: number | null) {
  if (!seconds) {
    return { unit: 'minutes', value: 60 };
  }
  if (seconds % 86_400 === 0) {
    return { unit: 'days', value: seconds / 86_400 };
  }
  if (seconds % 3600 === 0) {
    return { unit: 'hours', value: seconds / 3600 };
  }
  if (seconds % 60 === 0) {
    return { unit: 'minutes', value: seconds / 60 };
  }
  return { unit: 'minutes', value: Math.max(1, Math.round(seconds / 60)) };
}

function convertInterval(value: number, unit: string) {
  if (Number.isNaN(value) || value <= 0) {
    return undefined;
  }
  if (unit === 'days') {
    return value * 86_400;
  }
  if (unit === 'hours') {
    return value * 3_600;
  }
  return value * 60;
}

export interface ScheduleEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: JobSchedule | null;
  templates: Template[];
  onCreate: (payload: ScheduleInput) => Promise<void> | void;
  onUpdate: (scheduleId: string, payload: Partial<ScheduleInput>) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function ScheduleEditor({
  open,
  onOpenChange,
  schedule,
  templates,
  onCreate,
  onUpdate,
  isSubmitting = false
}: ScheduleEditorProps) {
  const [formState, setFormState] = useState<FormState>(DEFAULT_FORM);
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours' | 'days'>('hours');
  const [intervalValue, setIntervalValue] = useState<number>(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<'options' | 'preview'>('options');

  const selectedTemplate = useMemo(
    () => templates.find(template => template.id === formState.templateId),
    [formState.templateId, templates]
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    if (schedule) {
      const intervalInfo = inferInterval(schedule.intervalSeconds);
      setFormState({
        name: schedule.name,
        description: schedule.description ?? '',
        templateId: schedule.templateId ?? undefined,
        url: schedule.url,
        scheduleType: schedule.scheduleType,
        cronExpression: schedule.cronExpression ?? '0 9 * * *',
        intervalSeconds: schedule.intervalSeconds ?? undefined,
        scheduledAt: schedule.scheduledAt ?? undefined,
        enabled: schedule.enabled,
        options: {
          ...DEFAULT_OPTIONS,
          ...schedule.options
        }
      });
      setIntervalUnit(intervalInfo.unit as typeof intervalUnit);
      setIntervalValue(intervalInfo.value);
    } else {
      setFormState(DEFAULT_FORM);
      setIntervalUnit('hours');
      setIntervalValue(24);
    }
    setErrors({});
    setWarnings({});
    setActiveTab('options');
  }, [open, schedule]);

  const applyTemplateOptions = useCallback(
    (template: Template | undefined) => {
      if (!template) {
        return;
      }
      setFormState(prev => ({
        ...prev,
        url: prev.url || template.options.url || '',
        options: {
          ...prev.options,
          ...template.options,
          url: undefined
        }
      }));
    },
    []
  );

  useEffect(() => {
    if (selectedTemplate && open) {
      applyTemplateOptions(selectedTemplate);
    }
  }, [selectedTemplate, open, applyTemplateOptions]);

  useEffect(() => {
    if (formState.scheduleType === 'interval') {
      const seconds = convertInterval(intervalValue, intervalUnit);
      setFormState(prev => ({ ...prev, intervalSeconds: seconds }));
    }
  }, [intervalUnit, intervalValue, formState.scheduleType]);

  const validation = useMemo(() => validateSchedule(formState), [formState]);

  useEffect(() => {
    setWarnings(validation.warnings ?? {});
  }, [validation.warnings]);

  const toggleFormat = (format: ScrapeFormat) => {
    setFormState(prev => {
      const current = (prev.options.formats ?? []) as ScrapeFormat[];
      const exists = current.includes(format);
      const nextFormats: ScrapeFormat[] = exists
        ? current.filter(item => item !== format)
        : [...current, format];
      return {
        ...prev,
        options: {
          ...prev.options,
          formats: nextFormats
        }
      };
    });
  };

  const handleSubmit = async () => {
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }
    setErrors({});

    const payload: ScheduleInput = {
      ...formState,
      cronExpression: formState.scheduleType === 'cron' ? formState.cronExpression : undefined,
      intervalSeconds: formState.scheduleType === 'interval' ? formState.intervalSeconds : undefined,
      scheduledAt: formState.scheduleType === 'one-time' ? formState.scheduledAt : undefined,
      options: {
        ...formState.options
      }
    };

    if (payload.options) {
      if (payload.options.formats?.length === 0) {
        payload.options.formats = ['markdown'];
      }
    }

    if (schedule) {
      await onUpdate(schedule.id, payload);
    } else {
      await onCreate(payload);
    }

    onOpenChange(false);
  };

  const cronPreview =
    formState.scheduleType === 'cron' && formState.cronExpression
      ? describeCron(formState.cronExpression)
      : null;

  const jobMode = formState.options.mode === 'crawl' || formState.options.crawl ? 'crawl' : 'scrape';

  const setJobMode = (mode: 'scrape' | 'crawl') => {
    setFormState(prev => ({
      ...prev,
      options: {
        ...prev.options,
        mode,
        jobType: mode,
        crawl: mode === 'crawl'
      }
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogTitle>{schedule ? 'Edit schedule' : 'Create schedule'}</DialogTitle>
        <DialogDescription>
          Automate scraping and crawling jobs. Configure timing, templates, and output formats.
        </DialogDescription>

        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as typeof activeTab)} className="mt-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="options">
              <Settings className="mr-2 h-4 w-4" /> Configuration
            </TabsTrigger>
            <TabsTrigger value="preview">
              <Map className="mr-2 h-4 w-4" /> Preview & summary
            </TabsTrigger>
          </TabsList>

          <TabsContent value="options" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[3fr,2fr]">
              <div className="space-y-4">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Name</span>
                  <Input
                    value={formState.name}
                    onChange={event => setFormState(prev => ({ ...prev, name: event.target.value }))}
                    placeholder="Morning docs sync"
                  />
                  {errors.name && <p className="text-xs text-rose-500">{errors.name}</p>}
                </label>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Description</span>
                  <Textarea
                    rows={3}
                    value={formState.description ?? ''}
                    onChange={event => setFormState(prev => ({ ...prev, description: event.target.value }))}
                    placeholder="Summarize the intent of this schedule..."
                  />
                </label>

                <div className="space-y-1">
                  <Label className="text-sm font-medium text-slate-800 dark:text-slate-100">Template</Label>
                  <Select
                    value={formState.templateId ?? ''}
                    onValueChange={value =>
                      setFormState(prev => ({ ...prev, templateId: value || undefined }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No template</SelectItem>
                      {templates.map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="space-y-1">
                  <span className="text-sm font-medium text-slate-800 dark:text-slate-100">Target URL</span>
                  <Input
                    value={formState.url}
                    onChange={event => setFormState(prev => ({ ...prev, url: event.target.value }))}
                    placeholder="https://docs.example.com/latest"
                  />
                  {errors.url && <p className="text-xs text-rose-500">{errors.url}</p>}
                </label>

                <div className="space-y-2">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Schedule type</p>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {(['cron', 'interval', 'one-time'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setFormState(prev => ({ ...prev, scheduleType: type }))}
                        className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                          formState.scheduleType === type
                            ? 'border-primary-400 bg-primary-500/10 text-primary-600 dark:border-primary-500 dark:bg-primary-500/20 dark:text-primary-100'
                            : 'border-slate-200 text-slate-600 hover:border-primary-200 hover:text-primary-600 dark:border-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span className="font-semibold capitalize">{type.replace('-', ' ')}</span>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {type === 'cron' && 'Flexible recurring schedule using cron syntax.'}
                          {type === 'interval' && 'Run based on a fixed interval (minutes, hours, days).'}
                          {type === 'one-time' && 'Trigger a single execution at the specified date/time.'}
                        </p>
                      </button>
                    ))}
                  </div>
                  {errors.scheduleType && <p className="text-xs text-rose-500">{errors.scheduleType}</p>}
                </div>

                {formState.scheduleType === 'cron' && (
                  <CronBuilder
                    value={formState.cronExpression ?? '0 9 * * *'}
                    onChange={value => setFormState(prev => ({ ...prev, cronExpression: value }))}
                    error={errors.cronExpression}
                  />
                )}

                {formState.scheduleType === 'interval' && (
                  <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                      <Repeat className="h-4 w-4" />
                      Interval configuration
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        type="number"
                        min={1}
                        value={intervalValue}
                        onChange={event => setIntervalValue(Number(event.target.value))}
                        className="sm:max-w-[160px]"
                      />
                      <select
                        value={intervalUnit}
                        onChange={event => setIntervalUnit(event.target.value as typeof intervalUnit)}
                        className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      >
                        <option value="minutes">Minutes</option>
                        <option value="hours">Hours</option>
                        <option value="days">Days</option>
                      </select>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {formState.intervalSeconds
                        ? formatIntervalSeconds(formState.intervalSeconds)
                        : 'Runs every selected interval.'}
                    </p>
                    {errors.intervalSeconds && (
                      <p className="text-xs text-rose-500">{errors.intervalSeconds}</p>
                    )}
                  </div>
                )}

                {formState.scheduleType === 'one-time' && (
                  <label className="space-y-1">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-800 dark:text-slate-100">
                      <Calendar className="h-4 w-4" /> Run at
                    </span>
                    <Input
                      type="datetime-local"
                      value={toDateTimeLocal(formState.scheduledAt)}
                      onChange={event =>
                        setFormState(prev => ({
                          ...prev,
                          scheduledAt: fromDateTimeLocal(event.target.value)
                        }))
                      }
                    />
                    {errors.scheduledAt && <p className="text-xs text-rose-500">{errors.scheduledAt}</p>}
                  </label>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Output formats</p>
                    {warnings.formats && <Badge variant="warning">{warnings.formats}</Badge>}
                  </div>
                  <div className="mt-3 grid gap-2">
                    {SCRAPE_FORMATS.map(format => (
                      <label key={format} className="flex cursor-pointer items-center gap-3 rounded-md border border-transparent px-2 py-1 text-sm text-slate-600 transition hover:border-primary-300 hover:bg-primary-500/10 dark:text-slate-300 dark:hover:border-primary-500 dark:hover:bg-primary-500/20">
                        <Checkbox
                          checked={formState.options.formats?.includes(format)}
                          onCheckedChange={() => toggleFormat(format)}
                        />
                        <span className="capitalize">{format.replace('@', ' @')}</span>
                      </label>
                    ))}
                  </div>
                  {errors.formats && <p className="mt-2 text-xs text-rose-500">{errors.formats}</p>}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Run options</p>
                    <Badge variant={jobMode === 'crawl' ? 'warning' : 'outline'}>
                      {jobMode === 'crawl' ? 'Crawl' : 'Scrape'}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={jobMode === 'scrape' ? 'secondary' : 'ghost'}
                      onClick={() => setJobMode('scrape')}
                    >
                      Scrape
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={jobMode === 'crawl' ? 'secondary' : 'ghost'}
                      onClick={() => setJobMode('crawl')}
                    >
                      Crawl
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {jobMode === 'crawl'
                      ? 'Crawl mode triggers multi-page traversal respecting crawl options.'
                      : 'Scrape mode fetches a single page using the configured formats and options.'}
                  </p>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
                      <span>Only main content</span>
                      <Checkbox
                        checked={formState.options.onlyMainContent ?? true}
                        onCheckedChange={value =>
                          setFormState(prev => ({
                            ...prev,
                            options: { ...prev.options, onlyMainContent: Boolean(value) }
                          }))
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Wait for (ms)</span>
                      <Input
                        type="number"
                        min={0}
                        value={formState.options.waitFor ?? 0}
                        onChange={event =>
                          setFormState(prev => ({
                            ...prev,
                            options: { ...prev.options, waitFor: Number(event.target.value) }
                          }))
                        }
                      />
                    </label>

                    <label className="space-y-1">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Timeout (ms)</span>
                      <Input
                        type="number"
                        min={1000}
                        value={formState.options.timeout ?? 15000}
                        onChange={event =>
                          setFormState(prev => ({
                            ...prev,
                            options: { ...prev.options, timeout: Number(event.target.value) }
                          }))
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <div>
                    <p className="font-medium text-slate-800 dark:text-slate-100">Enabled</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Disable to pause executions without deleting the schedule.
                    </p>
                  </div>
                  <Checkbox
                    checked={formState.enabled ?? true}
                    onCheckedChange={value =>
                      setFormState(prev => ({
                        ...prev,
                        enabled: Boolean(value)
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="mt-4 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-medium text-slate-800 dark:text-slate-100">Summary</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4" /> Status
                  </span>
                  <Badge variant={formState.enabled ? 'success' : 'outline'}>
                    {formState.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ChevronRight className="h-4 w-4" /> URL
                  </span>
                  <span className="truncate text-right font-mono text-xs">{formState.url || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Schedule
                  </span>
                  <span className="text-right text-xs">
                    {formState.scheduleType === 'cron' && cronPreview}
                    {formState.scheduleType === 'interval' &&
                      formatIntervalSeconds(formState.intervalSeconds)}
                    {formState.scheduleType === 'one-time' &&
                      (formState.scheduledAt
                        ? new Date(formState.scheduledAt).toLocaleString()
                        : 'Not scheduled')}
                  </span>
                </div>
              </div>
            </div>

            {warnings && Object.keys(warnings).length > 0 && (
              <div className="rounded-lg border border-amber-300 bg-amber-100/70 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-medium">Warnings</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {Object.entries(warnings).map(([key, message]) => (
                    <li key={key}>{message}</li>
                  ))}
                </ul>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {errors.submit && <p className="text-sm text-rose-500">{errors.submit}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            {schedule ? 'Save changes' : 'Create schedule'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
