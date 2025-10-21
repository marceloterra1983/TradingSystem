import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TBody, TD, THead, TH, TR } from '@/components/ui/table';
import type { ExportInput, Job, JobSchedule, Template } from '@/types';
import {
  estimateFileSize,
  formatFileSize,
  formatFiltersSummary,
  getExportTypeLabel
} from '@/utils/export';

type PreviewRow = Record<string, unknown>;

function getPreviewRows(data?: Array<Job | Template | JobSchedule> | null): PreviewRow[] {
  if (!data || !data.length) {
    return [];
  }
  return data.slice(0, 5).map(item => {
    const entries = Object.entries(item).filter(([key]) => !['options', 'results'].includes(key));
    return entries.reduce<PreviewRow>((acc, [key, value]) => {
      acc[key] =
        value instanceof Date
          ? value.toISOString()
          : typeof value === 'object' && value !== null
          ? JSON.stringify(value)
          : value;
      return acc;
    }, {});
  });
}

interface FormatPreviewProps {
  formats: ExportInput['formats'];
  estimatedRows?: number;
}

function FormatPreview({ formats, estimatedRows = 0 }: FormatPreviewProps) {
  const estimates = formats.map(format => ({
    format,
    sizeBytes: estimateFileSize(estimatedRows, format)
  }));
  return (
    <div className="flex flex-wrap gap-2">
      {estimates.map(item => (
        <Badge key={item.format} variant="outline">
          {item.format.toUpperCase()} • {formatFileSize(item.sizeBytes)}
        </Badge>
      ))}
      {formats.length > 1 && (
        <Badge variant="outline">ZIP • {formatFileSize(estimates.reduce((sum, e) => sum + e.sizeBytes, 0))}</Badge>
      )}
    </div>
  );
}

export interface ExportPreviewProps {
  exportConfig: ExportInput;
  previewData?: Array<Job | Template | JobSchedule> | null;
  estimatedRows?: number;
  estimatedSize?: number;
  compact?: boolean;
}

export function ExportPreview({
  exportConfig,
  previewData,
  estimatedRows = 0,
  estimatedSize,
  compact
}: ExportPreviewProps) {
  const rows = getPreviewRows(previewData);
  const columns = rows[0] ? Object.keys(rows[0]) : [];
  const wrapperClass = compact ? 'space-y-3 text-sm' : 'space-y-4';
  const titleClass = compact ? 'text-base' : 'text-lg';

  return (
    <div className={wrapperClass}>
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className={titleClass}>{exportConfig.name}</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Badge variant="outline">{getExportTypeLabel(exportConfig.exportType)}</Badge>
            <span>•</span>
            <span>{estimatedRows} row{estimatedRows === 1 ? '' : 's'} (estimated)</span>
            <span>•</span>
            <span>{formatFileSize(estimatedSize ?? estimateFileSize(estimatedRows, exportConfig.formats[0]))}</span>
          </div>
          {exportConfig.description ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{exportConfig.description}</p>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Formats
            </h4>
            <FormatPreview formats={exportConfig.formats} estimatedRows={estimatedRows} />
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Filters
            </h4>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {formatFiltersSummary(exportConfig.filters)}
            </p>
          </div>
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Data preview
            </h4>
            {rows.length ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-700">
                <Table>
                  <THead>
                    <TR>
                      {columns.map(column => (
                        <TH key={column}>{column}</TH>
                      ))}
                    </TR>
                  </THead>
                  <TBody>
                    {rows.map((row, index) => (
                      <TR key={index}>
                        {columns.map(column => (
                          <TD key={column}>
                            {typeof row[column] === 'string' && (row[column] as string).length > 120
                              ? `${(row[column] as string).slice(0, 120)}…`
                              : String(row[column] ?? '')}
                          </TD>
                        ))}
                      </TR>
                    ))}
                  </TBody>
                </Table>
                <p className="px-4 py-2 text-xs text-slate-400 dark:text-slate-500">
                  Showing first {rows.length} rows
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Preview unavailable. Adjust filters and retry or continue to create export.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
