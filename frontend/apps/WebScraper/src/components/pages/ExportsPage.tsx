import { useMemo, useState } from 'react';
import { Download, Plus, Search } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ExportDialog, ExportHistory } from '@/components/exports';
import {
  useCreateExport,
  useDeleteExport,
  useDownloadExport,
  useExports
} from '@/hooks/useWebScraper';
import type { ExportFilters, ExportFormat, ExportInput } from '@/types';

export function ExportsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<ExportFilters>({ page: 1, pageSize: 20 });
  const [activeDownloadId, setActiveDownloadId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);

  const { data, isLoading } = useExports(filters);
  const createExport = useCreateExport();
  const deleteExport = useDeleteExport();
  const downloadExport = useDownloadExport();

  const exports = data?.items ?? [];

  const pagination = useMemo(() => {
    if (!data) {
      return { page: 1, pages: 1, total: 0 };
    }
    const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
    return { page: data.page, pages, total: data.total };
  }, [data]);

  const handleCreate = () => {
    setDialogOpen(true);
  };

  const handleExportSubmit = (payload: ExportInput) => {
    createExport.mutate(payload, {
      onSuccess: () => setDialogOpen(false)
    });
  };

  const handleDownload = (exportId: string, format: ExportFormat | 'zip') => {
    setActiveDownloadId(exportId);
    downloadExport.mutate(
      { exportId, format },
      {
        onSettled: () => setActiveDownloadId(null)
      }
    );
  };

  const handleDelete = (exportId: string) => {
    setActiveDeleteId(exportId);
    deleteExport.mutate(exportId, {
      onSettled: () => setActiveDeleteId(null)
    });
  };

  const handlePageChange = (page: number) => {
    setFilters(current => ({ ...current, page }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
            Export management
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Download jobs, templates, or schedules in CSV, JSON, or Parquet formats.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New export
        </Button>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <Search className="h-4 w-4 text-slate-400" />
        <Input
          className="border-none bg-transparent p-0 focus-visible:ring-0"
          placeholder="Search exports by name or description..."
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Export history</CardTitle>
            <CardDescription>
              {pagination.total
                ? `${pagination.total} exports available.`
                : 'No exports created yet.'}
            </CardDescription>
          </div>
          {pagination.pages > 1 && (
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, (pagination.page ?? 1) - 1))}
                disabled={(pagination.page ?? 1) <= 1}
              >
                Previous
              </Button>
              <span>
                Page {pagination.page} of {pagination.pages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  handlePageChange(
                    Math.min(pagination.pages, (pagination.page ?? 1) + 1)
                  )
                }
                disabled={(pagination.page ?? 1) >= pagination.pages}
              >
                Next
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ExportHistory
            exports={exports}
            isLoading={isLoading}
            searchTerm={searchTerm}
            onDownload={handleDownload}
            onDelete={handleDelete}
            isDeleting={deleteExport.isPending}
            isDownloading={downloadExport.isPending}
            activeDeleteId={activeDeleteId}
            activeDownloadId={activeDownloadId}
          />
        </CardContent>
      </Card>

      <ExportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onExport={handleExportSubmit}
        isLoading={createExport.isPending}
      />
    </div>
  );
}
