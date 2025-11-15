/**
 * Ingestion Logs Viewer Component
 *
 * Collapsible log viewer for RAG collection ingestion progress
 * Shows real-time logs with auto-refresh
 *
 * @module components/pages/collections/IngestionLogsViewer
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../../ui/collapsible-card";
import { Button } from "../../ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import { RefreshCcw, Loader2, ArrowUpDown, ArrowUp, ArrowDown } from "@/icons";
import { Badge } from "../../ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../ui/table";

/**
 * Log entry interface
 */
interface IngestionLogEntry {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
  collection?: string;
  details?: {
    filesProcessed?: number;
    chunksCreated?: number;
    currentFile?: string;
    progress?: number;
    duration?: number; // Duration in milliseconds
  };
}

/**
 * Sort configuration
 */
type SortField = "timestamp" | "level" | "message" | "collection" | "duration";
type SortDirection = "asc" | "desc" | null;

/**
 * Component props
 */
interface IngestionLogsViewerProps {
  /**
   * Filter logs by collection name
   */
  collectionFilter?: string;

  /**
   * Auto-refresh interval in ms (default: 5000)
   */
  refreshInterval?: number;

  /**
   * Maximum number of logs to display (default: 100)
   */
  maxLogs?: number;

  /**
   * CSS class name
   */
  className?: string;
}

/**
 * Fetch ingestion logs from API
 */
async function fetchIngestionLogs(params: {
  limit: number;
  collection?: string;
  level?: string;
}): Promise<IngestionLogEntry[]> {
  const url = new URL("/api/v1/rag/ingestion/logs", window.location.origin);
  url.searchParams.set("limit", params.limit.toString());

  if (params.collection && params.collection !== "all") {
    url.searchParams.set("collection", params.collection);
  }

  if (params.level && params.level !== "all") {
    url.searchParams.set("level", params.level);
  }

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`Failed to fetch logs: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data?.logs || [];
}

/**
 * Get icon for log level (compact)
 */
function getLevelIcon(level: string) {
  switch (level) {
    case "success":
      return "✓";
    case "error":
      return "✗";
    case "warn":
      return "⚠";
    case "info":
    default:
      return "ℹ";
  }
}

/**
 * Get color class for log level
 */
function getLevelColor(level: string): string {
  switch (level) {
    case "success":
      return "text-emerald-600 dark:text-emerald-400";
    case "error":
      return "text-red-600 dark:text-red-400";
    case "warn":
      return "text-amber-600 dark:text-amber-400";
    case "info":
    default:
      return "text-blue-600 dark:text-blue-400";
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);

  // Always show date and time
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/**
 * Format duration in milliseconds to human readable string
 */
function formatDuration(durationMs: number | undefined): string {
  if (!durationMs || durationMs < 0) return "-";

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  const seconds = Math.floor(durationMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0
      ? `${minutes}m ${remainingSeconds}s`
      : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Ingestion Logs Viewer Component
 */
export function IngestionLogsViewer({
  collectionFilter = "all",
  refreshInterval = 5000,
  maxLogs = 100,
  className,
}: IngestionLogsViewerProps): JSX.Element {
  const [limit, setLimit] = useState(maxLogs);
  const [levelFilter, setLevelFilter] = useState("all");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [sortField, setSortField] = useState<SortField>("timestamp");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const logsQuery = useQuery({
    queryKey: [
      "ingestion-logs",
      { limit, collection: collectionFilter, level: levelFilter },
    ],
    queryFn: () =>
      fetchIngestionLogs({
        limit,
        collection: collectionFilter,
        level: levelFilter === "all" ? undefined : levelFilter,
      }),
    refetchInterval: autoRefresh ? refreshInterval : false,
    retry: 2,
  });

  // Sort logs
  const sortedLogs = useMemo(() => {
    const data = logsQuery.data || [];

    if (!sortDirection) return data;

    return [...data].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "timestamp":
          comparison =
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
          break;
        case "level":
          const levelPriority = { error: 0, warn: 1, info: 2, success: 3 };
          comparison = levelPriority[a.level] - levelPriority[b.level];
          break;
        case "message":
          comparison = a.message.localeCompare(b.message);
          break;
        case "collection":
          comparison = (a.collection || "").localeCompare(b.collection || "");
          break;
        case "duration":
          comparison = (a.details?.duration || 0) - (b.details?.duration || 0);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [logsQuery.data, sortField, sortDirection]);

  const logs = sortedLogs;

  const logCounts = useMemo(() => {
    return {
      total: logs.length,
      info: logs.filter((log) => log.level === "info").length,
      success: logs.filter((log) => log.level === "success").length,
      warn: logs.filter((log) => log.level === "warn").length,
      error: logs.filter((log) => log.level === "error").length,
    };
  }, [logs]);

  const hasActiveIngestion = useMemo(() => {
    // Check if there are recent logs (within last 10 seconds) with "processing" or "indexing"
    const recentLogs = logs.filter((log) => {
      const age = Date.now() - new Date(log.timestamp).getTime();
      return age < 10000; // 10 seconds
    });

    return recentLogs.some(
      (log) =>
        log.message.toLowerCase().includes("processing") ||
        log.message.toLowerCase().includes("indexing") ||
        log.message.toLowerCase().includes("ingestion"),
    );
  }, [logs]);

  // Handle column sort
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction: desc -> asc -> null -> desc
      if (sortDirection === "desc") {
        setSortDirection("asc");
      } else if (sortDirection === "asc") {
        setSortDirection(null);
      } else {
        setSortDirection("desc");
      }
    } else {
      // New field, start with desc
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Get sort icon for column
  const getSortIcon = (field: SortField) => {
    if (sortField !== field || !sortDirection) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  return (
    <CollapsibleCard cardId="ingestion-logs" className={className}>
      <CollapsibleCardHeader>
        <div className="flex items-start justify-between w-full">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CollapsibleCardTitle>Logs de Indexação</CollapsibleCardTitle>
              {hasActiveIngestion && (
                <Badge variant="default" className="bg-blue-500">
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  Em execução
                </Badge>
              )}
            </div>
            <CollapsibleCardDescription>
              Acompanhe o progresso da indexação em tempo real
            </CollapsibleCardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Stats */}
            <div className="hidden md:flex items-center gap-2 text-xs">
              {logCounts.error > 0 && (
                <Badge variant="destructive">{logCounts.error} erros</Badge>
              )}
              {logCounts.warn > 0 && (
                <Badge variant="secondary">{logCounts.warn} avisos</Badge>
              )}
              {logCounts.success > 0 && (
                <Badge variant="default">{logCounts.success} sucesso</Badge>
              )}
            </div>
          </div>
        </div>
      </CollapsibleCardHeader>

      <CollapsibleCardContent className="space-y-2">
        {/* Filters - Compact */}
        <div className="flex items-center gap-2 text-xs">
          {/* Level Filter */}
          <Select value={levelFilter} onValueChange={setLevelFilter}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({logCounts.total})</SelectItem>
              <SelectItem value="info">ℹ Info ({logCounts.info})</SelectItem>
              <SelectItem value="success">
                ✓ OK ({logCounts.success})
              </SelectItem>
              <SelectItem value="warn">⚠ Warn ({logCounts.warn})</SelectItem>
              <SelectItem value="error">✗ Erro ({logCounts.error})</SelectItem>
            </SelectContent>
          </Select>

          {/* Limit */}
          <Select
            value={limit.toString()}
            onValueChange={(val) => setLimit(Number(val))}
          >
            <SelectTrigger className="h-7 w-24 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
              <SelectItem value="200">200</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2"
            onClick={() => logsQuery.refetch()}
            disabled={logsQuery.isFetching}
          >
            <RefreshCcw
              className={`h-3 w-3 ${logsQuery.isFetching ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Auto
              </>
            ) : (
              "Manual"
            )}
          </Button>

          <div className="flex-1 text-right text-xs text-gray-500">
            {logs.length} logs
          </div>
        </div>

        {/* Error State */}
        {logsQuery.error && (
          <div className="rounded border border-red-300 bg-red-50 p-2 dark:border-red-700 dark:bg-red-950">
            <p className="text-xs text-red-600 dark:text-red-400">
              ✗ Erro:{" "}
              {logsQuery.error instanceof Error
                ? logsQuery.error.message
                : "Erro ao carregar logs"}
            </p>
          </div>
        )}

        {/* Empty State */}
        {!logsQuery.error && logs.length === 0 && (
          <div className="rounded border border-dashed p-4 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Nenhum log de indexação disponível
            </p>
          </div>
        )}

        {/* Logs Table - Compact */}
        {logs.length > 0 && (
          <div className="rounded border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="max-h-80 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-white dark:bg-gray-800 z-10">
                  <TableRow className="h-8">
                    <TableHead
                      className="w-44 py-1 text-xs bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort("timestamp")}
                    >
                      <div className="flex items-center">
                        Data e Hora
                        {getSortIcon("timestamp")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-12 py-1 text-xs text-center bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort("level")}
                    >
                      <div className="flex items-center justify-center">
                        {getSortIcon("level")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="py-1 text-xs bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort("message")}
                    >
                      <div className="flex items-center">
                        Mensagem
                        {getSortIcon("message")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-32 py-1 text-xs text-center bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort("collection")}
                    >
                      <div className="flex items-center justify-center">
                        Coleção
                        {getSortIcon("collection")}
                      </div>
                    </TableHead>
                    <TableHead
                      className="w-24 py-1 text-xs text-center bg-white dark:bg-gray-800 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                      onClick={() => handleSort("duration")}
                    >
                      <div className="flex items-center justify-center">
                        Duração
                        {getSortIcon("duration")}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log, index) => (
                    <TableRow
                      key={`${log.timestamp}-${index}`}
                      className="h-8 border-0"
                    >
                      <TableCell className="py-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell className="py-1 text-center">
                        <span
                          className={`text-sm font-bold ${getLevelColor(log.level)}`}
                        >
                          {getLevelIcon(log.level)}
                        </span>
                      </TableCell>
                      <TableCell className="py-1 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="truncate" title={log.message}>
                            {log.message}
                          </span>
                          {log.details?.progress !== undefined && (
                            <span className="text-xs text-gray-500 flex-shrink-0">
                              ({log.details.progress}%)
                            </span>
                          )}
                        </div>
                        {log.details?.currentFile && (
                          <div
                            className="text-xs text-gray-500 dark:text-gray-400 truncate"
                            title={log.details.currentFile}
                          >
                            {log.details.currentFile.split("/").pop()}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-1 text-center text-xs">
                        {log.collection && (
                          <Badge
                            variant="outline"
                            className="text-xs px-1.5 py-0"
                          >
                            {log.collection}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-1 text-center text-xs text-gray-600 dark:text-gray-400">
                        {formatDuration(log.details?.duration)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Footer Info */}
        {autoRefresh && (
          <div className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Auto-refresh: {refreshInterval / 1000}s
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

export default IngestionLogsViewer;
