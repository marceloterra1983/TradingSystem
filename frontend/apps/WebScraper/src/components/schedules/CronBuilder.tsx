import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { describeCron, formatDateTime, getNextExecutions, validateCron } from '@/utils/cron';

const CRON_PRESETS = [
  {
    label: 'Every hour',
    description: 'Runs at the start of every hour',
    value: '0 * * * *'
  },
  {
    label: 'Daily at 9AM',
    description: 'Runs once a day at 09:00',
    value: '0 9 * * *'
  },
  {
    label: 'Weekdays at 8AM',
    description: 'Runs Monday through Friday at 08:00',
    value: '0 8 * * 1-5'
  },
  {
    label: 'Weekly (Mon 6AM)',
    description: 'Runs every Monday at 06:00',
    value: '0 6 * * 1'
  },
  {
    label: 'Monthly (1st 7AM)',
    description: 'Runs on the first day of each month at 07:00',
    value: '0 7 1 * *'
  }
] as const;

const DEFAULT_CRON = '0 9 * * *';

type IntlWithSupportedValues = typeof Intl & {
  supportedValuesOf?: (key: string) => string[];
};

const FALLBACK_TIMEZONES: string[] = [
  'UTC',
  'America/Sao_Paulo',
  'America/New_York',
  'Europe/London'
];

const TIMEZONE_OPTIONS: string[] = (() => {
  const intl = Intl as IntlWithSupportedValues;
  if (typeof intl.supportedValuesOf === 'function') {
    try {
      const values = intl.supportedValuesOf('timeZone');
      if (Array.isArray(values) && values.length > 0) {
        return values;
      }
    } catch {
      // no-op, fallback used below
    }
  }
  return FALLBACK_TIMEZONES;
})();

export interface CronBuilderProps {
  value: string;
  onChange: (value: string) => void;
  timezone?: string;
  onTimezoneChange?: (value: string) => void;
  error?: string;
}

function getAdvancedParts(expression: string): [string, string, string, string, string] {
  const parts = expression.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 5) {
    return parts as [string, string, string, string, string];
  }
  return ['0', '9', '*', '*', '*'];
}

export function CronBuilder({
  value,
  onChange,
  timezone,
  onTimezoneChange,
  error
}: CronBuilderProps) {
  const [tab, setTab] = useState<'simple' | 'advanced' | 'manual'>(() => {
    if (!value) {
      return 'simple';
    }
    const presetMatch = CRON_PRESETS.some(preset => preset.value === value);
    return presetMatch ? 'simple' : 'manual';
  });
  const [manualValue, setManualValue] = useState(() => value || DEFAULT_CRON);
  const [advancedParts, setAdvancedParts] = useState(() => getAdvancedParts(value || DEFAULT_CRON));

  useEffect(() => {
    if (!value) {
      return;
    }
    setManualValue(value);
    setAdvancedParts(getAdvancedParts(value));
  }, [value]);

  const cronToValidate = tab === 'manual' ? manualValue : advancedParts.join(' ');
  const validation = useMemo(() => validateCron(cronToValidate), [cronToValidate]);

  const preview = useMemo(() => {
    if (!validation.isValid) {
      return { description: 'Invalid expression', executions: [] as string[] };
    }
    const description = describeCron(cronToValidate);
    const executions = getNextExecutions(cronToValidate, { timezone, count: 5 }).map(date =>
      formatDateTime(date, undefined, timezone)
    );
    return { description, executions };
  }, [cronToValidate, timezone, validation.isValid]);

  const handlePreset = (expression: string) => {
    onChange(expression);
    setManualValue(expression);
    setAdvancedParts(getAdvancedParts(expression));
    setTab('simple');
  };

  const handleAdvancedChange = (index: number, nextValue: string) => {
    setAdvancedParts(prev => {
      const copy = [...prev] as typeof prev;
      copy[index] = nextValue || '*';
      const expression = copy.join(' ');
      onChange(expression);
      setManualValue(expression);
      return copy;
    });
  };

  const handleManualBlur = () => {
    const normalized = manualValue.trim() || DEFAULT_CRON;
    setManualValue(normalized);
    onChange(normalized);
    setAdvancedParts(getAdvancedParts(normalized));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">Schedule pattern</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Define when the schedule executes. Supports standard 5-field cron syntax.
          </p>
        </div>
        {onTimezoneChange && (
          <div className="w-full max-w-xs">
            <Label className="text-xs font-medium text-slate-600 dark:text-slate-300">Timezone</Label>
            <select
              className="mt-1 w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-sm dark:border-slate-700 dark:bg-slate-950"
              value={timezone}
              onChange={event => onTimezoneChange(event.target.value)}
            >
              {TIMEZONE_OPTIONS.map((option: string) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <Tabs value={tab} onValueChange={value => setTab(value as typeof tab)} className="mt-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="simple">Simple</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
          <TabsTrigger value="manual">Manual</TabsTrigger>
        </TabsList>

        <TabsContent value="simple" className="mt-4 space-y-3">
          {CRON_PRESETS.map(preset => (
            <button
              key={preset.value}
              type="button"
              onClick={() => handlePreset(preset.value)}
              className="flex w-full items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-left transition hover:border-primary-300 hover:bg-primary-500/5 dark:border-slate-700 dark:hover:border-primary-500 dark:hover:bg-primary-500/10"
            >
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{preset.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{preset.description}</p>
              </div>
              <span className="rounded bg-slate-100 px-2 py-1 text-xs font-mono text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {preset.value}
              </span>
            </button>
          ))}
        </TabsContent>

        <TabsContent value="advanced" className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-5">
            {['Minute', 'Hour', 'Day (month)', 'Month', 'Day (week)'].map((label, index) => (
              <label key={label} className="space-y-1">
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{label}</span>
                <Input
                  value={advancedParts[index]}
                  onChange={event => handleAdvancedChange(index, event.target.value)}
                  placeholder="*"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Use cron syntax such as <code className="font-mono">*/30</code>, ranges (<code className="font-mono">1-5</code>), and lists (<code className="font-mono">1,15</code>).
          </p>
        </TabsContent>

        <TabsContent value="manual" className="mt-4 space-y-3">
          <Label className="text-xs font-medium text-slate-600 dark:text-slate-300" htmlFor="manual-cron">
            Cron expression
          </Label>
          <Input
            id="manual-cron"
            value={manualValue}
            onChange={event => setManualValue(event.target.value)}
            onBlur={handleManualBlur}
            placeholder="0 9 * * *"
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => {
              setManualValue(DEFAULT_CRON);
              onChange(DEFAULT_CRON);
              setAdvancedParts(getAdvancedParts(DEFAULT_CRON));
            }}
          >
            Reset to default
          </Button>
        </TabsContent>
      </Tabs>

      <div className="mt-4 rounded-md border border-slate-100 bg-slate-50 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/70">
        <p className="font-medium text-slate-700 dark:text-slate-200">Preview</p>
        {validation.isValid ? (
          <>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">{preview.description}</p>
            <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              {preview.executions.map(date => (
                <li key={date} className="font-mono">{date}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className="mt-1 text-xs text-rose-500">
            {validation.error ?? 'Invalid cron expression'}
          </p>
        )}
        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}
      </div>
    </div>
  );
}
