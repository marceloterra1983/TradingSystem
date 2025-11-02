/**
 * Batch Ingestion Progress Modal
 *
 * Shows real-time progress of batch ingestion with ability to cancel
 */

import { useEffect, useState, useCallback } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  XCircle,
  Pause,
} from 'lucide-react';
import { Button } from '../../ui/button';

interface BatchIngestionJob {
  jobId: string;
  collectionName: string;
  status: 'running' | 'completed' | 'cancelled' | 'failed';
  totalFiles: number;
  processedFiles: number;
  failedFiles: number;
  progress: number;
  currentBatch: number;
  totalBatches: number;
  elapsedTimeMs: number;
  estimatedRemainingTimeMs: number;
  errors: string[];
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  jobId: string | null;
  collectionName: string;
}

const RAG_SERVICE_URL =
  import.meta.env.VITE_RAG_SERVICE_URL || 'http://localhost:3403';

export function BatchIngestionProgressModal({
  isOpen,
  onClose,
  jobId,
  collectionName,
}: Props) {
  const [job, setJob] = useState<BatchIngestionJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const fetchStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(
        `${RAG_SERVICE_URL}/api/v1/rag/ingestion/batch/${jobId}/status`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        setJob(data.data);
        setError(null);
      }
    } catch (err) {
      console.error('[BatchIngestion] Failed to fetch status:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    }
  }, [jobId]);

  useEffect(() => {
    if (!isOpen || !jobId) return;

    // Initial fetch
    fetchStatus();

    // Poll every 2 seconds while running
    const interval = setInterval(() => {
      if (job?.status === 'running') {
        fetchStatus();
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen, jobId, job?.status, fetchStatus]);

  const handleCancel = async () => {
    if (!jobId || cancelling) return;

    setCancelling(true);
    try {
      const response = await fetch(
        `${RAG_SERVICE_URL}/api/v1/rag/ingestion/batch/${jobId}/cancel`,
        { method: 'POST' },
      );

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      // Refresh status
      await fetchStatus();
    } catch (err) {
      console.error('[BatchIngestion] Failed to cancel:', err);
      setError(err instanceof Error ? err.message : 'Failed to cancel job');
    } finally {
      setCancelling(false);
    }
  };

  const handleClose = async () => {
    if (job?.status === 'running') {
      const confirmed = window.confirm(
        'A ingestão ainda está em andamento. Tem certeza que deseja fechar? (O processo continuará em background)',
      );
      if (!confirmed) return;
    }

    onClose();
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = () => {
    if (!job) return <Loader2 className="h-5 w-5 animate-spin" />;

    switch (job.status) {
      case 'running':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (!job) return 'Carregando...';

    switch (job.status) {
      case 'running':
        return 'Em andamento';
      case 'completed':
        return 'Concluído';
      case 'cancelled':
        return 'Cancelado';
      case 'failed':
        return 'Falhou';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-lg shadow-xl p-6 m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                Ingestão em Lote
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Coleção: {collectionName}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Status: {getStatusText()}
            </span>
            {job && (
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {job.progress}%
              </span>
            )}
          </div>

          {/* Progress Bar */}
          {job && (
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Details */}
        {job && (
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-600 dark:text-slate-400">
                  Arquivos Processados:
                </span>
                <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                  {job.processedFiles} / {job.totalFiles}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">
                  Lotes:
                </span>
                <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                  {job.currentBatch} / {job.totalBatches}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">
                  Falhas:
                </span>
                <span className="ml-2 font-medium text-red-600 dark:text-red-400">
                  {job.failedFiles}
                </span>
              </div>
              <div>
                <span className="text-slate-600 dark:text-slate-400">
                  Tempo Decorrido:
                </span>
                <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                  {formatTime(job.elapsedTimeMs)}
                </span>
              </div>
            </div>

            {job.status === 'running' && job.estimatedRemainingTimeMs > 0 && (
              <div className="text-sm">
                <span className="text-slate-600 dark:text-slate-400">
                  Tempo Estimado Restante:
                </span>
                <span className="ml-2 font-medium text-slate-900 dark:text-slate-100">
                  {formatTime(job.estimatedRemainingTimeMs)}
                </span>
              </div>
            )}

            {/* Errors */}
            {job.errors.length > 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  <span className="text-sm font-medium text-red-900 dark:text-red-100">
                    Erros Recentes:
                  </span>
                </div>
                <ul className="text-xs text-red-800 dark:text-red-200 space-y-1">
                  {job.errors.map((err, idx) => (
                    <li key={idx}>• {err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-900 dark:text-red-100">
                {error}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          {job?.status === 'running' && (
            <Button
              onClick={handleCancel}
              disabled={cancelling}
              variant="outline"
              className="flex items-center gap-2"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleClose}
            variant={job?.status === 'running' ? 'outline' : 'default'}
          >
            {job?.status === 'running' ? 'Minimizar' : 'Fechar'}
          </Button>
        </div>
      </div>
    </div>
  );
}
