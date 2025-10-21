import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrapeFormat, Template, TemplateInput } from '@/types';
import { formatDate } from '@/utils/date';
import { CheckCircle, Info, XCircle } from 'lucide-react';
import { useMemo } from 'react';

export interface TemplatePreviewProps {
  template: TemplateInput | Template;
  compact?: boolean;
  validationErrors?: Record<string, string>;
  validationWarnings?: Record<string, string>;
  className?: string;
}

const FORMAT_COLORS: Record<ScrapeFormat, string> = {
  markdown: 'bg-green-100 text-green-800',
  html: 'bg-blue-100 text-blue-800',
  rawHtml: 'bg-violet-100 text-violet-800',
  links: 'bg-yellow-100 text-yellow-800',
  screenshot: 'bg-orange-100 text-orange-800',
  'screenshot@fullPage': 'bg-orange-200 text-orange-900',
  json: 'bg-slate-100 text-slate-800'
};

function formatTimeout(ms: number | undefined): string {
  if (!ms) return '0s';
  return ms >= 1000 ? `${ms / 1000}s` : `${ms}ms`;
}

function formatTags(tags: string[] | undefined): string {
  if (!tags?.length) return 'None';
  return tags.join(', ');
}

function isTemplate(input: Template | TemplateInput): input is Template {
  return 'id' in input;
}

export function TemplatePreview({ template, compact = false, validationErrors, validationWarnings, className = '' }: TemplatePreviewProps) {
  const hasValidationIssues = useMemo(() => {
    return !!(validationErrors && Object.keys(validationErrors).length > 0);
  }, [validationErrors]);

  const hasWarnings = useMemo(() => {
    return !!(validationWarnings && Object.keys(validationWarnings).length > 0);
  }, [validationWarnings]);

  const containerClasses = useMemo(() => {
    const baseClasses = [
      'transition-all duration-200',
      className
    ];

    if (hasValidationIssues) {
      baseClasses.push('border-red-300');
    } else if (hasWarnings) {
      baseClasses.push('border-yellow-300');
    }

    if (compact) {
      baseClasses.push('text-sm');
    }

    return baseClasses.join(' ');
  }, [hasValidationIssues, hasWarnings, compact, className]);

  const statusIcon = useMemo(() => {
    if (hasValidationIssues) {
      return <XCircle className="h-5 w-5 text-red-500" />;
    }
    if (hasWarnings) {
      return <Info className="h-5 w-5 text-yellow-500" />;
    }
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  }, [hasValidationIssues, hasWarnings]);

  return (
    <Card className={containerClasses}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {template.name}
          </CardTitle>
          {statusIcon}
        </div>
        {template.description && (
          <p className="text-sm text-gray-500">{template.description}</p>
        )}
        {isTemplate(template) && (
          <div className="text-xs text-gray-400">
            Created {formatDate(template.createdAt)}
            {template.usageCount > 0 && ` • Used ${template.usageCount} times`}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* URL Pattern */}
        {template.urlPattern && (
          <div>
            <h4 className="mb-1 font-medium">URL Pattern</h4>
            <code className="block rounded bg-gray-100 p-2 text-sm">
              {template.urlPattern}
            </code>
          </div>
        )}

        {/* Formats */}
        <div>
          <h4 className="mb-1 font-medium">Output Formats</h4>
          <div className="flex flex-wrap gap-2">
            {template.options.formats?.map(format => (
              <Badge key={format} className={FORMAT_COLORS[format]}>
                {format}
              </Badge>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <h4 className="mb-1 font-medium">Options</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center justify-between rounded bg-gray-50 p-2">
              <span>Only Main Content</span>
              <span>{template.options.onlyMainContent ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-2">
              <span>Wait For</span>
              <span>{formatTimeout(template.options.waitFor)}</span>
            </div>
            <div className="flex items-center justify-between rounded bg-gray-50 p-2">
              <span>Timeout</span>
              <span>{formatTimeout(template.options.timeout)}</span>
            </div>
          </div>
        </div>

        {/* Content Filters */}
        {(template.options.includeTags?.length || template.options.excludeTags?.length) && (
          <div>
            <h4 className="mb-1 font-medium">Content Filters</h4>
            <div className="space-y-2 rounded bg-gray-50 p-2 text-sm">
              <div>
                <span className="font-medium">Include:</span>{' '}
                {formatTags(template.options.includeTags)}
              </div>
              <div>
                <span className="font-medium">Exclude:</span>{' '}
                {formatTags(template.options.excludeTags)}
              </div>
            </div>
          </div>
        )}

        {/* Validation Issues */}
        {(hasValidationIssues || hasWarnings) && (
          <div className="space-y-2">
            {validationErrors && Object.entries(validationErrors).map(([field, error]) => (
              <div key={field} className="rounded bg-red-50 p-2 text-sm text-red-700">
                <span className="font-medium">{field}:</span> {error}
              </div>
            ))}
            {validationWarnings && Object.entries(validationWarnings).map(([field, warning]) => (
              <div key={field} className="rounded bg-yellow-50 p-2 text-sm text-yellow-700">
                <span className="font-medium">{field}:</span> {warning}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
