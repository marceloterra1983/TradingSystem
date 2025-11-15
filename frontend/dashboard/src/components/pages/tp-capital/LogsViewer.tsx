import { useEffect, useMemo, useState } from "react";
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
import {
  AlertCircle,
  RefreshCcw,
  Info,
  ChevronDown,
  ChevronRight,
} from "@/icons";
import { LIMIT_OPTIONS } from "./constants";
import { fetchLogs } from "./api";
import { formatTimestamp, formatContext, getLevelIcon } from "./utils";

export function LogsViewer() {
  const [limit, setLimit] = useState(100);
  const [levelFilter, setLevelFilter] = useState("all");
  const [usingFallbackData, setUsingFallbackData] = useState(false);
  const [lastErrorMessage, setLastErrorMessage] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  const toggleLogExpansion = (index: number) => {
    setExpandedLogs((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const logsQuery = useQuery({
    queryKey: ["tp-capital-logs", { limit, levelFilter }],
    queryFn: () =>
      fetchLogs({
        limit,
        level: levelFilter === "all" ? undefined : levelFilter,
      }),
    refetchInterval: (data) => {
      // Quick Win B4: Removed @ts-expect-error with proper type casting
      if (!data || (data as any).usingFallback) return false;
      return 30000; // 30 segundos (antes: 3s - causa rate limit)
    },
  });

  useEffect(() => {
    if (logsQuery.data) {
      setUsingFallbackData(logsQuery.data.usingFallback);
      setLastErrorMessage(logsQuery.data.errorMessage ?? null);
    } else if (logsQuery.error) {
      const message =
        logsQuery.error instanceof Error
          ? logsQuery.error.message
          : "Failed to fetch TP Capital logs";
      setUsingFallbackData(true);
      setLastErrorMessage(message);
    }
  }, [logsQuery.data, logsQuery.error]);

  const logs = useMemo(() => logsQuery.data?.rows ?? [], [logsQuery.data]);

  return (
    <CollapsibleCard cardId="tp-capital-logs">
      <CollapsibleCardHeader>
        <div>
          <CollapsibleCardTitle>Logs de Ingestão</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Logs do serviço de ingestão do Telegram em tempo real
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent className="space-y-4">
        {usingFallbackData && (
          <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-semibold">Logs indisponíveis</p>
                <p className="mt-1">
                  Mostrando logs de exemplo porque não foi possível acessar o
                  endpoint de ingestão. Reinicie o serviço TP-Capital para
                  recuperar os logs reais.
                </p>
                {lastErrorMessage && (
                  <p className="mt-1 text-xs opacity-80">
                    Erro original: {lastErrorMessage}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/30">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
            <div>
              <Select
                value={String(limit)}
                onValueChange={(value) => setLimit(Number(value))}
              >
                <SelectTrigger className="h-8 w-full min-w-[120px] text-sm">
                  <SelectValue placeholder="Limite" />
                </SelectTrigger>
                <SelectContent>
                  {LIMIT_OPTIONS.map((option) => (
                    <SelectItem key={option} value={String(option)}>
                      {option} itens
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="h-8 w-full min-w-[150px] text-sm">
                  <SelectValue placeholder="Nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os niveis</SelectItem>
                  <SelectItem value="error">Erros</SelectItem>
                  <SelectItem value="warn">Alertas</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="debug">Debug</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-start gap-1 sm:col-span-2 lg:col-span-1 lg:justify-end">
              <Button
                variant="ghost"
                size="sm"
                className="h-10 w-10 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => void logsQuery.refetch()}
                disabled={logsQuery.isFetching}
                title="Atualizar logs"
              >
                <RefreshCcw className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </Button>
            </div>
          </div>
        </div>

        <div className="text-sm text-slate-600 dark:text-slate-400">
          Exibindo {logs.length} registro(s)
        </div>

        <div className="space-y-1.5">
          {logs.map((log, idx) => {
            const isExpanded = expandedLogs.has(idx);
            const hasContext =
              log.context !== null && log.context !== undefined;
            const LevelIcon = getLevelIcon(log.level);
            const timestampInfo = formatTimestamp(log.timestamp);
            const timestampLabel =
              typeof timestampInfo === "string"
                ? timestampInfo
                : timestampInfo
                  ? `${timestampInfo.date} ${timestampInfo.time}`
                  : undefined;

            return (
              <div
                key={`${log.timestamp}-${idx}`}
                className="group relative rounded border border-slate-200 dark:border-slate-700/50 bg-white dark:bg-slate-950/30 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-start gap-2 px-3 py-2">
                  {/* Ícone + Badge compacto */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <LevelIcon
                      className={`h-4 w-4 ${
                        log.level === "error"
                          ? "text-red-500"
                          : log.level === "warn"
                            ? "text-amber-500"
                            : log.level === "debug"
                              ? "text-slate-400"
                              : "text-emerald-500"
                      }`}
                    />
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        log.level === "error"
                          ? "text-red-600 dark:text-red-400"
                          : log.level === "warn"
                            ? "text-amber-600 dark:text-amber-400"
                            : log.level === "debug"
                              ? "text-slate-500 dark:text-slate-400"
                              : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {log.level}
                    </span>
                  </div>

                  {/* Timestamp compacto */}
                  <span
                    className="text-[11px] text-slate-500 dark:text-slate-500 font-mono flex-shrink-0 mt-0.5"
                    title={timestampLabel}
                  >
                    {new Date(log.timestamp).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>

                  {/* Mensagem */}
                  <p className="text-sm text-slate-900 dark:text-slate-100 flex-1 min-w-0">
                    {log.message}
                  </p>

                  {/* Botão de contexto (se existir) */}
                  {hasContext && (
                    <button
                      onClick={() => toggleLogExpansion(idx)}
                      className="flex-shrink-0 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                      title={isExpanded ? "Ocultar contexto" : "Ver contexto"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-slate-600 dark:text-slate-400" />
                      )}
                    </button>
                  )}
                </div>

                {/* Contexto expandido */}
                {isExpanded && hasContext && (
                  <div className="px-3 pb-2 pt-1 border-t border-slate-200 dark:border-slate-700/50">
                    <pre className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300 font-mono overflow-x-auto bg-slate-50 dark:bg-slate-900/50 rounded p-2">
                      {formatContext(log.context) as string}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {logs.length === 0 && (
            <div className="rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-8 text-center">
              <Info className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Nenhum log encontrado
              </p>
            </div>
          )}
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
