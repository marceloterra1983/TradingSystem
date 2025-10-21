import { useMemo } from 'react';
import { CheckCircle2, Clock3, Download, RefreshCcw, Trash2, XCircle } from 'lucide-react';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TBody,
  TD,
  THead,
  TH,
  TR
} from '@/components/ui/table';
import type { ExportFormat, ExportJob, ExportStatus } from '@/types';
import {
  formatExpiration,
  formatFileSize,
  formatFiltersSummary,
  getExportTypeLabel,
  isExpired
} from '@/utils/export';

export interface ExportHistoryProps {
  exports: ExportJob[];
  isLoading?: boolean;
  searchTerm: string;
  onDownload: (exportId: string, format: ExportFormat | 'zip') => void;
  onDelete: (exportId: string) => void;
  isDeleting?: boolean;
  isDownloading?: boolean;
  activeDownloadId?: string | null;
  activeDeleteId?: string | null;
}

const statusConfig: Record<
  ExportStatus,
  { label: string; icon: React.ReactNode; variant: BadgeVariant }
> = {
  pending: {
    label: 'Pending',
    icon: <Clock3 className="h-4 w-4" />,
    variant: 'info'
  },
  processing: {
    label: 'Processing',
    icon: <RefreshCcw className="h-4 w-4 animate-spin" />,
    variant: 'info'
  },
  completed: {
    label: 'Completed',
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
    variant: 'success'
  },
  failed: {
    label: 'Failed',
    icon: <XCircle className="h-4 w-4 text-red-500" />,
    variant: 'danger'
  }
};

function StatusBadge({ status }: { status: ExportStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      {config.icon}
      <span>{config.label}</span>
    </Badge>
  );
}

export function ExportHistory({
  exports,
  isLoading,
  searchTerm,
  onDownload,
  onDelete,
  isDeleting,
  isDownloading,
  activeDeleteId,
  activeDownloadId
}: ExportHistoryProps) {
  const filtered = useMemo(() => {
    if (!searchTerm) {
      return exports;
    }
    const term = searchTerm.toLowerCase();
    return exports.filter(exp => {
      return (
        exp.name.toLowerCase().includes(term) ||
        (exp.description ?? '').toLowerCase().includes(term)
      );
    });
  }, [exports, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading export history…</p>
      </div>
    );
  }

  if (!filtered.length) {
    return (
      <Card className="flex min-h-[180px] flex-col items-center justify-center gap-3 border-dashed">
        <Download className="h-8 w-8 text-slate-300 dark:text-slate-700" />
        <div className="text-center">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-200">No exports yet</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Generate an export to download job data in your preferred format.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Name</TH>
          <TH>Type</TH>
          <TH>Formats</TH>
          <TH>Status</TH>
          <TH>Rows</TH>
          <TH>Size</TH>
          <TH>Created</TH>
          <TH>Expires</TH>
          <TH>Actions</TH>
        </TR>
      </THead>
      <TBody>
        {filtered.map(exportJob => {
          const expired = isExpired(exportJob.expiresAt);
          const canDownload =
            exportJob.status === 'completed' && !expired && exportJob.filePaths;
          const downloadFormats: Array<ExportFormat | 'zip'> = [...exportJob.formats];
          if (exportJob.formats.length > 1) {
            downloadFormats.push('zip');
          }

          return (
            <TR key={exportJob.id}>
              <TD>
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {exportJob.name}
                  </span>
                  {exportJob.description ? (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {exportJob.description}
                    </span>
                  ) : null}
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {formatFiltersSummary(exportJob.filters)}
                  </span>
                </div>
              </TD>
              <TD>
                <Badge variant="outline">{getExportTypeLabel(exportJob.exportType)}</Badge>
              </TD>
              <TD>
                <div className="flex flex-wrap gap-1">
                  {exportJob.formats.map(format => (
                    <Badge key={format} variant="outline">
                      {format.toUpperCase()}
                    </Badge>
                  ))}
                  {exportJob.formats.length > 1 && (
                    <Badge variant="outline">ZIP</Badge>
                  )}
                </div>
              </TD>
              <TD>
                <StatusBadge status={exportJob.status} />
                {exportJob.error ? (
                  <p className="mt-1 text-xs text-red-500">{exportJob.error}</p>
                ) : null}
              </TD>
              <TD>{exportJob.rowCount ?? '—'}</TD>
              <TD>{formatFileSize(exportJob.fileSizeBytes)}</TD>
              <TD>{new Date(exportJob.createdAt).toLocaleString()}</TD>
              <TD className={expired ? 'text-red-500' : undefined}>
                {formatExpiration(exportJob.expiresAt)}
              </TD>
              <TD>
                <div className="flex flex-wrap items-center gap-2">
                  {canDownload
                    ? downloadFormats.map(format => (
                        <Button
                          key={format}
                          size="sm"
                          variant="outline"
                          onClick={() => onDownload(exportJob.id, format)}
                          disabled={isDownloading && activeDownloadId === exportJob.id}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          {format.toUpperCase()}
                        </Button>
                      ))
                    : (
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {expired ? 'Expired' : 'Not ready'}
                        </span>
                      )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
                    onClick={() => onDelete(exportJob.id)}
                    disabled={
                      isDeleting && activeDeleteId === exportJob.id
                    }
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              </TD>
            </TR>
          );
        })}
      </TBody>
    </Table>
  );
}
