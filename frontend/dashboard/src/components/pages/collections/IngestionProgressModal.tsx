/**
 * Ingestion Progress Modal
 *
 * Real-time progress visualization for ingestion jobs
 * Connects to SSE stream and displays:
 * - Progress bar with percentage
 * - Stats (files processed, chunks created)
 * - Live log stream
 * - Cancel button
 * - Estimated time remaining
 *
 * @module components/pages/collections/IngestionProgressModal
 */

import React, { useEffect, useMemo } from "react";
import {
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  FileText,
  Database,
  Clock,
  Zap,
} from "lucide-react";
import { Button } from "../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../../ui/dialog";
import { Progress } from "../../ui/progress";
import { ScrollArea } from "../../ui/scroll-area";
import { Badge } from "../../ui/badge";
import {
  useIngestionProgress,
  type IngestionLogEntry,
} from "../../../hooks/useIngestionProgress";

/**
 * Component Props
 */
interface IngestionProgressModalProps {
  open: boolean;
  onClose: () => void;
  jobId: string | null;
  collectionName: string;
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
}

/**
 * Format number with thousands separator
 */
function formatNumber(num: number): string {
  return num.toLocaleString("pt-BR");
}

/**
 * Get level icon and color
 */
function getLevelStyle(level: IngestionLogEntry["level"]): {
  icon: React.ReactNode;
  colorClass: string;
} {
  switch (level) {
    case "success":
      return {
        icon: <CheckCircle2 className="h-3 w-3" />,
        colorClass: "text-emerald-600 dark:text-emerald-400",
      };
    case "error":
      return {
        icon: <XCircle className="h-3 w-3" />,
        colorClass: "text-red-600 dark:text-red-400",
      };
    case "warn":
      return {
        icon: <AlertTriangle className="h-3 w-3" />,
        colorClass: "text-amber-600 dark:text-amber-400",
      };
    case "info":
      return {
        icon: <Zap className="h-3 w-3" />,
        colorClass: "text-blue-600 dark:text-blue-400",
      };
    case "debug":
      return {
        icon: <Loader2 className="h-3 w-3" />,
        colorClass: "text-slate-500 dark:text-slate-400",
      };
  }
}

/**
 * Log Entry Component
 */
const LogEntry: React.FC<{ log: IngestionLogEntry }> = ({ log }) => {
  const { icon, colorClass } = getLevelStyle(log.level);
  const time = new Date(log.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 text-xs hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded transition-colors">
      <span className={`shrink-0 mt-0.5 ${colorClass}`}>{icon}</span>
      <span className="text-slate-500 dark:text-slate-400 shrink-0 font-mono w-16">
        {time}
      </span>
      <span className="text-slate-700 dark:text-slate-300 flex-1 leading-relaxed">
        {log.message}
      </span>
      {log.progress !== undefined && log.progress > 0 && (
        <Badge variant="outline" className="font-mono text-xs shrink-0">
          {log.progress}%
        </Badge>
      )}
    </div>
  );
};

/**
 * Ingestion Progress Modal Component
 */
export const IngestionProgressModal: React.FC<IngestionProgressModalProps> = ({
  open,
  onClose,
  jobId,
  collectionName,
}) => {
  const {
    progress,
    logs,
    status,
    isConnected,
    isComplete,
    error,
    cancel,
    clearLogs,
  } = useIngestionProgress(jobId);

  const scrollAreaRef = React.useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = React.useState(true);
  const [startTime] = React.useState(Date.now());
  const [elapsedTime, setElapsedTime] = React.useState(0);

  // Update elapsed time every second
  useEffect(() => {
    if (!open || isComplete) return;

    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 1000);

    return () => clearInterval(interval);
  }, [open, isComplete, startTime]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [logs, autoScroll]);

  // Estimated time remaining
  const estimatedTimeRemaining = useMemo(() => {
    if (progress.progress === 0 || progress.progress === 100) return null;

    const elapsedMs = elapsedTime;
    const progressDecimal = progress.progress / 100;
    const estimatedTotalMs = elapsedMs / progressDecimal;
    const remainingMs = estimatedTotalMs - elapsedMs;

    return Math.max(0, remainingMs);
  }, [progress.progress, elapsedTime]);

  // Status badge
  const statusBadge = useMemo(() => {
    if (!status) return null;

    switch (status) {
      case "PENDING":
        return (
          <Badge variant="outline" className="text-blue-600">
            Aguardando
          </Badge>
        );
      case "PROCESSING":
        return <Badge className="bg-blue-600">Processando</Badge>;
      case "COMPLETED":
        return <Badge className="bg-emerald-600">Concluído</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Falhou</Badge>;
      case "CANCELLED":
        return (
          <Badge variant="outline" className="text-amber-600">
            Cancelado
          </Badge>
        );
    }
  }, [status]);

  // Connection indicator
  const connectionIndicator = useMemo(() => {
    if (isComplete) return null;

    return (
      <div className="flex items-center gap-1.5">
        <div
          className={`h-2 w-2 rounded-full ${isConnected ? "bg-emerald-500 animate-pulse" : "bg-slate-400"}`}
        />
        <span className="text-xs text-slate-500">
          {isConnected ? "Conectado" : "Desconectado"}
        </span>
      </div>
    );
  }, [isConnected, isComplete]);

  const handleClose = () => {
    if (
      isComplete ||
      confirm("A ingestão está em andamento. Deseja fechar mesmo assim?")
    ) {
      clearLogs();
      onClose();
    }
  };

  const handleCancel = async () => {
    if (confirm("Deseja realmente cancelar a ingestão em andamento?")) {
      await cancel();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Ingestão: {collectionName}
                {statusBadge}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Acompanhe o progresso da indexação em tempo real
              </DialogDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8 shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Section */}
        <div className="space-y-4 pb-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                Progresso
              </span>
              <span className="font-mono text-slate-600 dark:text-slate-400">
                {progress.progress}%
              </span>
            </div>
            <Progress value={progress.progress} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-500">Arquivos</span>
              </div>
              <div className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-200">
                {progress.filesProcessed}/{progress.filesTotal}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Database className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-500">Chunks</span>
              </div>
              <div className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-200">
                {formatNumber(progress.chunksCreated)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-500">Tempo</span>
              </div>
              <div className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-200">
                {formatDuration(elapsedTime)}
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-slate-500" />
                <span className="text-xs text-slate-500">Restante</span>
              </div>
              <div className="font-mono text-lg font-semibold text-slate-700 dark:text-slate-200">
                {estimatedTimeRemaining
                  ? formatDuration(estimatedTimeRemaining)
                  : "--"}
              </div>
            </div>
          </div>

          {/* Current File */}
          {progress.currentFile && (
            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3">
              <div className="text-xs text-blue-600 dark:text-blue-400 mb-1">
                Processando agora:
              </div>
              <div className="text-sm font-mono text-blue-700 dark:text-blue-300 truncate">
                {progress.currentFile}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-700 dark:text-red-300">
                  {error}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Logs Section */}
        <div className="flex-1 min-h-0 border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              Logs
              <Badge variant="outline" className="font-mono text-xs">
                {logs.length}
              </Badge>
            </h3>
            <div className="flex items-center gap-2">
              {connectionIndicator}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoScroll(!autoScroll)}
                className="h-7 text-xs"
              >
                {autoScroll ? "📌 Auto-scroll" : "📌 Manual"}
              </Button>
            </div>
          </div>

          <ScrollArea
            className="h-64 border border-slate-200 dark:border-slate-800 rounded-lg"
            ref={scrollAreaRef}
          >
            <div className="p-2">
              {logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-slate-500">
                  <Loader2 className="h-8 w-8 animate-spin mb-2" />
                  <p className="text-sm">Aguardando logs...</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {logs.map((log, index) => (
                    <LogEntry key={log.id || index} log={log} />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
          <div>
            {!isComplete && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={!isConnected}
              >
                <X className="h-4 w-4 mr-2" />
                Cancelar Ingestão
              </Button>
            )}
          </div>

          <Button
            variant={isComplete ? "default" : "outline"}
            size="sm"
            onClick={handleClose}
          >
            {isComplete ? "Fechar" : "Minimizar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IngestionProgressModal;
