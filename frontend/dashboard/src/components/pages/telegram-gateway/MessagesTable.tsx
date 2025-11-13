import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Search,
  Trash2,
  Undo,
} from '@/icons';
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../ui/select";
import {
  TelegramGatewayMessage,
  TelegramGatewayMessagesFilters,
  TelegramGatewayMessagesResponse,
} from "../../../hooks/useTelegramGateway";
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from "../../ui/collapsible-card";
import { Badge } from "../../ui/badge";
import { cn } from "../../../lib/utils";
import { normalizeTimestamp } from "../../../utils/timestampUtils";
import { formatInTimeZone } from "date-fns-tz";

interface MessagesTableProps {
  data?: TelegramGatewayMessagesResponse;
  isLoading: boolean;
  error?: Error | null;
  filters: TelegramGatewayMessagesFilters;
  onFiltersChange: (filters: TelegramGatewayMessagesFilters) => void;
  onRefresh: () => void;
  onReprocess: (message: TelegramGatewayMessage) => Promise<void>;
  onDelete: (message: TelegramGatewayMessage) => Promise<void>;
  isReprocessing: boolean;
  isDeleting: boolean;
}

const STATUS_OPTIONS = [
  "received",
  "retrying",
  "published",
  "queued",
  "failed",
  "reprocess_pending",
  "reprocessed",
] as const;

const STATUS_BADGE_CLASSNAME: Record<string, string> = {
  received:
    "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300",
  retrying:
    "border-amber-400 text-amber-600 dark:border-amber-400/60 dark:text-amber-300",
  published:
    "border-emerald-400 text-emerald-600 dark:border-emerald-400/60 dark:text-emerald-300",
  queued:
    "border-cyan-400 text-cyan-600 dark:border-cyan-400/60 dark:text-cyan-300",
  failed:
    "border-red-400 text-red-600 dark:border-red-400/60 dark:text-red-300",
  reprocess_pending:
    "border-blue-400 text-blue-600 dark:border-blue-400/60 dark:text-blue-300",
  reprocessed:
    "border-violet-400 text-violet-600 dark:border-violet-400/60 dark:text-violet-300",
};

function formatDate(value?: string | number) {
  if (!value) return "—";

  const normalized = normalizeTimestamp(value);
  if (!normalized) return "—";

  try {
    const date = new Date(normalized);
    return formatInTimeZone(date, "America/Sao_Paulo", "dd/MM/yyyy, HH:mm:ss");
  } catch {
    return "—";
  }
}

function truncate(text?: string | null, length = 120) {
  if (!text) return "";
  return text.length > length ? `${text.slice(0, length)}…` : text;
}

export function MessagesTable({
  data,
  isLoading,
  error,
  filters,
  onFiltersChange,
  onRefresh,
  onReprocess,
  onDelete,
  isReprocessing,
  isDeleting,
}: MessagesTableProps) {
  const [search, setSearch] = useState(filters.search ?? "");
  const [highlightedMessages, setHighlightedMessages] = useState<Set<string>>(
    new Set(),
  );
  const previousMessageIdsRef = useRef<Set<string>>(new Set());

  const messages = data?.data ?? [];
  const pagination = data?.pagination;

  // Detectar novas mensagens e destacá-las
  useEffect(() => {
    if (!messages || messages.length === 0) return;

    const currentMessageIds = new Set(messages.map((msg) => msg.id));

    // Se é o primeiro carregamento (previousMessageIdsRef está vazio),
    // apenas inicializar sem destacar nada
    if (previousMessageIdsRef.current.size === 0) {
      previousMessageIdsRef.current = currentMessageIds;
      return;
    }

    const newMessageIds = new Set<string>();

    // Identificar mensagens que não estavam na lista anterior
    currentMessageIds.forEach((id) => {
      if (!previousMessageIdsRef.current.has(id)) {
        newMessageIds.add(id);
      }
    });

    // Atualizar as mensagens destacadas apenas se houver novas mensagens
    if (newMessageIds.size > 0) {
      setHighlightedMessages(newMessageIds);

      // Remover destaque após 1 minuto
      const timer = setTimeout(() => {
        setHighlightedMessages(new Set());
      }, 60000);

      // Atualizar referência dos IDs anteriores
      previousMessageIdsRef.current = currentMessageIds;

      return () => clearTimeout(timer);
    } else {
      // Atualizar referência dos IDs anteriores mesmo sem novas mensagens
      previousMessageIdsRef.current = currentMessageIds;
    }
  }, [messages]);

  const uniqueChannels = useMemo(() => {
    const set = new Set(messages.map((message) => message.channelId));
    return Array.from(set).sort();
  }, [messages]);

  const currentStatus = filters.status?.[0] ?? "all";
  const currentChannel = Array.isArray(filters.channelId)
    ? (filters.channelId[0] ?? "all")
    : (filters.channelId ?? "all");
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  const updateFilters = (patch: Partial<TelegramGatewayMessagesFilters>) => {
    onFiltersChange({
      ...filters,
      ...patch,
    });
  };

  const handleSearchSubmit = () => {
    updateFilters({
      search: search ? search.trim() : undefined,
      offset: 0,
    });
  };

  const handleStatusChange = (value: string) => {
    updateFilters({
      status: value === "all" ? undefined : [value],
      offset: 0,
    });
  };

  const handleChannelChange = (value: string) => {
    updateFilters({
      channelId: value === "all" ? undefined : value,
      offset: 0,
    });
  };

  const handleLimitChange = (value: number) => {
    updateFilters({
      limit: value,
      offset: 0,
    });
  };

  const handlePrev = () => {
    if (offset <= 0) return;
    updateFilters({
      offset: Math.max(offset - limit, 0),
    });
  };

  const handleNext = () => {
    if (!pagination?.hasMore) return;
    updateFilters({
      offset: offset + limit,
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    onFiltersChange({
      limit,
      sort: filters.sort ?? "desc",
    });
  };

  return (
    <CollapsibleCard cardId="telegram-gateway-messages">
      <CollapsibleCardHeader className="flex flex-col gap-1 border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CollapsibleCardTitle className="flex items-center gap-2 text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-cyan-500" />
              Mensagens persistidas
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Consulta direta ao TimescaleDB com filtros rápidos por status,
              canal e termo.
            </CollapsibleCardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void onRefresh()}
            disabled={isLoading}
            data-collapsible-ignore="true"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Atualizar
              </>
            )}
          </Button>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent className="space-y-4 pt-5">
        <div className="grid gap-3 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  handleSearchSubmit();
                }
              }}
              placeholder="Buscar por conteúdo, metadata ou ID"
              className="pl-9"
            />
          </div>
          <Select value={currentStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status (todos)</SelectItem>
              {STATUS_OPTIONS.map((statusOption) => (
                <SelectItem key={statusOption} value={statusOption}>
                  {statusOption}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={currentChannel} onValueChange={handleChannelChange}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Canal" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Canal (todos)</SelectItem>
              {uniqueChannels.map((channel) => (
                <SelectItem key={channel} value={channel}>
                  {channel}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(limit)}
            onValueChange={(value) => handleLimitChange(Number(value))}
          >
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Itens por página" />
            </SelectTrigger>
            <SelectContent>
              {[10, 25, 50, 100].map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} por página
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-end">
            <Button variant="ghost" size="sm" onClick={handleClearFilters}>
              Limpar filtros
            </Button>
          </div>
        </div>

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span>Erro ao carregar mensagens: {error.message}</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <th className="px-3 py-2">Canal</th>
                  <th className="px-3 py-2">Mensagem</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Recebida em</th>
                  <th className="px-3 py-2">Prévia</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                    >
                      Carregando mensagens...
                    </td>
                  </tr>
                ) : messages.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-3 py-6 text-center text-slate-500 dark:text-slate-400"
                    >
                      Nenhum registro corresponde aos filtros atuais.
                    </td>
                  </tr>
                ) : (
                  messages.map((message) => {
                    const isHighlighted = highlightedMessages.has(message.id);
                    return (
                      <tr
                        key={message.id}
                        className={cn(
                          "transition-colors duration-300",
                          isHighlighted
                            ? "bg-yellow-100/80 dark:bg-yellow-900/20"
                            : "bg-white dark:bg-slate-950/60",
                        )}
                      >
                        <td className="px-3 py-3 align-top font-mono text-xs text-slate-500 dark:text-slate-400">
                          {message.channelId}
                          {message.threadId && (
                            <span className="mt-1 block text-[10px] text-slate-400 dark:text-slate-500">
                              thread: {message.threadId}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                          <span className="font-mono text-[11px]">
                            #{message.messageId}
                          </span>
                          <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                            {message.source ?? "unknown"}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-semibold capitalize",
                              STATUS_BADGE_CLASSNAME[
                                message.status as keyof typeof STATUS_BADGE_CLASSNAME
                              ] ?? "text-slate-600 dark:text-slate-300",
                            )}
                          >
                            {message.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(message.receivedAt)}
                          {message.publishedAt && (
                            <span className="mt-1 block text-[10px] uppercase tracking-wide text-slate-400 dark:text-slate-500">
                              publicado {formatDate(message.publishedAt)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top max-w-xs text-sm text-slate-700 dark:text-slate-200">
                          {truncate(message.text || message.caption)}
                        </td>
                        <td className="px-3 py-3 align-top text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => void onReprocess(message)}
                              disabled={isReprocessing}
                              title="Solicitar reprocessamento"
                            >
                              {isReprocessing ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Undo className="h-3.5 w-3.5" />
                              )}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-9 w-9 p-0"
                              onClick={() => void onDelete(message)}
                              disabled={isDeleting}
                              title="Marcar como removida"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
          <div>
            Exibindo {messages.length} registros
            {pagination?.total ? ` de ${pagination.total}` : ""} • Página{" "}
            {Math.floor(offset / limit) + 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={offset <= 0}
            >
              Anterior
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={!pagination?.hasMore}
            >
              Próximo
            </Button>
          </div>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
