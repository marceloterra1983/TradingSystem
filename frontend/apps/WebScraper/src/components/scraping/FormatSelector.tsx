import { useMemo } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrapeFormat } from '@/types';

export interface FormatSelectorProps {
  selectedFormats: ScrapeFormat[];
  onToggleFormat: (format: ScrapeFormat) => void;
  error?: string;
  onClearError?: () => void;
}

const FORMAT_LABELS: Record<ScrapeFormat, string> = {
  markdown: 'Markdown',
  html: 'HTML',
  rawHtml: 'Raw HTML',
  links: 'Links',
  screenshot: 'Screenshot',
  'screenshot@fullPage': 'Full Page Screenshot',
  json: 'JSON'
} as const;

export function FormatSelector({ selectedFormats, onToggleFormat, error, onClearError }: FormatSelectorProps) {
  const formatOptions = useMemo(() => Object.entries(FORMAT_LABELS), []);

  return (
    <div className="space-y-4">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
        Output formats
      </label>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {formatOptions.map(([format, label]) => (
          <div
            key={format}
            className={`
              flex items-center justify-between rounded-lg border px-3 py-2
              ${selectedFormats.includes(format as ScrapeFormat) ?
                'border-primary-500 bg-primary-50/40 dark:bg-primary-900/20' :
                'border-gray-200 dark:border-gray-700'}
              hover:border-primary-300 hover:bg-primary-50/40 dark:hover:bg-primary-900/20
              transition-colors duration-200
            `}
          >
            <div className="flex items-center space-x-3">
              <Checkbox
                id={`format-${format}`}
                checked={selectedFormats.includes(format as ScrapeFormat)}
                onCheckedChange={() => {
                  onToggleFormat(format as ScrapeFormat);
                  onClearError?.();
                }}
                aria-label={`Select ${label} format`}
              />
              <label
                htmlFor={`format-${format}`}
                className="text-sm font-medium text-gray-900 dark:text-gray-100 cursor-pointer select-none"
              >
                {label}
              </label>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
