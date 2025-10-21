import { Badge } from '../../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { formatDate } from '../../../utils/dateUtils';
import type { Template, TemplateInput } from '../../../types/webscraper';
import type { ScrapeFormat } from '../../../services/firecrawlService';
import { CheckCircle, Info, XCircle } from 'lucide-react';

interface TemplatePreviewProps {
  template: Template | TemplateInput;
  compact?: boolean;
  validationErrors?: Record<string, string>;
  validationWarnings?: Record<string, string>;
  className?: string;
}

const FORMAT_COLORS: Record<ScrapeFormat, string> = {
  markdown: 'bg-emerald-100 text-emerald-800',
  html: 'bg-blue-100 text-blue-800',
  rawHtml: 'bg-violet-100 text-violet-800',
  links: 'bg-amber-100 text-amber-800',
  screenshot: 'bg-orange-100 text-orange-800',
  'screenshot@fullPage': 'bg-orange-200 text-orange-900',
  json: 'bg-slate-100 text-slate-800',
};

function isTemplate(entity: Template | TemplateInput): entity is Template {
  return 'id' in entity;
}

function formatTimeout(ms?: number): string {
  if (ms === undefined) return '0s';
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s` : `${ms}ms`;
}

function renderTags(tags?: string[]): string {
  if (!tags?.length) return 'None';
  return tags.join(', ');
}

export function TemplatePreview({
  template,
  compact = false,
  validationErrors,
  validationWarnings,
  className,
}: TemplatePreviewProps) {
  const hasErrors = Boolean(validationErrors && Object.keys(validationErrors).length);
  const hasWarnings = Boolean(validationWarnings && Object.keys(validationWarnings).length);

  const statusIcon = hasErrors
    ? <XCircle className="h-5 w-5 text-red-500" />
    : hasWarnings
      ? <Info className="h-5 w-5 text-amber-500" />
      : <CheckCircle className="h-5 w-5 text-emerald-500" />;

  return (
    <Card
      className={[
        compact ? 'text-sm' : '',
        hasErrors ? 'border-red-300 dark:border-red-700' : '',
        !hasErrors && hasWarnings ? 'border-amber-300 dark:border-amber-600' : '',
        className ?? '',
      ].join(' ')}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">{template.name}</CardTitle>
          {statusIcon}
        </div>
        {template.description && (
          <p className="text-sm text-slate-500 dark:text-slate-400">{template.description}</p>
        )}
        {isTemplate(template) && (
          <p className="text-xs text-slate-400">
            Created {formatDate(template.createdAt)}
            {template.usageCount ? ` • Used ${template.usageCount} times` : ''}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {template.urlPattern && (
          <div>
            <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">URL pattern</h4>
            <code className="mt-1 block rounded bg-slate-100 p-2 text-xs text-slate-700 dark:bg-slate-900 dark:text-slate-200">
              {template.urlPattern}
            </code>
          </div>
        )}

        <div>
          <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">Formats</h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {(template.options.formats ?? []).map((format: string) => (
              <Badge key={format} className={FORMAT_COLORS[format as ScrapeFormat] ?? 'bg-slate-100 text-slate-800'}>
                {format}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <span>Only main content</span>
            <span>{template.options.onlyMainContent ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <span>Wait for</span>
            <span>{formatTimeout(template.options.waitFor)}</span>
          </div>
          <div className="flex items-center justify-between rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900">
            <span>Timeout</span>
            <span>{formatTimeout(template.options.timeout)}</span>
          </div>
        </div>

        {(template.options.includeTags?.length || template.options.excludeTags?.length) && (
          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-900">
            <div>
              <span className="font-medium">Include:</span> {renderTags(template.options.includeTags)}
            </div>
            <div>
              <span className="font-medium">Exclude:</span> {renderTags(template.options.excludeTags)}
            </div>
          </div>
        )}

        {(hasErrors || hasWarnings) && (
          <div className="space-y-2">
            {validationErrors &&
              Object.entries(validationErrors).map(([field, message]) => (
                <div key={field} className="rounded bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/60 dark:text-red-200">
                  <span className="font-medium capitalize">{field}:</span> {message}
                </div>
              ))}
            {validationWarnings &&
              Object.entries(validationWarnings).map(([field, message]) => (
                <div key={field} className="rounded bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
                  <span className="font-medium capitalize">{field}:</span> {message}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
