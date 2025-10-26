import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, RefreshCw, Search, Trash2, Undo } from 'lucide-react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { TelegramGatewayMessage, TelegramGatewayMessagesResponse, TelegramGatewayMessagesFilters } from '../../../hooks/useTelegramGateway';

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
  'received',
  'retrying',
  'published',
  'queued',
  'failed',
  'reprocess_pending',
  'reprocessed',
] as const;

function formatDate(value?: string) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  } catch {
    return value;
  }
}

function truncate(text?: string | null, length = 140) {
  if (!text) return '';
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
  const [search, setSearch] = useState(filters.search ?? '');

  const messages = data?.data ?? [];
  const pagination = data?.pagination;

  const uniqueChannels = useMemo(() => {
    const set = new Set(messages.map((message) => message.channelId));
    return Array.from(set).sort();
  }, [messages]);

  const currentStatus = filters.status?.[0] ?? 'all';
  const currentChannel = filters.channelId ?? 'all';
  const limit = filters.limit ?? 25;
  const offset = filters.offset ?? 0;

  const handleStatusChange = (value: string) => {
    onFiltersChange({
      ...filters,
      status: value === 'all' ? undefined : [value],
      offset: 0,
    });
  };

  const handleChannelChange = (value: string) => {
    onFiltersChange({
      ...filters,
      channelId: value === 'all' ? undefined : value,
      offset: 0,
    });
  };

  const handleLimitChange = (value: number) => {
    onFiltersChange({
      ...filters,
      limit: value,
      offset: 0,
    });
  };

  const handleSearchSubmit = () => {
    onFiltersChange({
      ...filters,
      search: search ? search.trim() : undefined,
      offset: 0,
    });
  };

  const handleClearFilters = () => {
    setSearch('');
    onFiltersChange({
      limit,
      sort: filters.sort ?? 'desc',
    });
  };

  const handlePrev = () => {
    if (offset <= 0) return;
    onFiltersChange({
      ...filters,
      offset: Math.max(offset - limit, 0),
    });
  };

  const handleNext = () => {
    if (!pagination?.hasMore) return;
    onFiltersChange({
      ...filters,
      offset: offset + limit,
    });
  };

  async function handleReprocess(message: TelegramGatewayMessage) {
    await onReprocess(message);
  }

  async function handleDelete(message: TelegramGatewayMessage) {
    await onDelete(message);
  }

  return (
    <CollapsibleCard cardId="telegram-gateway-messages">
      <CollapsibleCardHeader>
        <div className="flex w-full items-center justify-between">
          <div>
            <CollapsibleCardTitle>
              <CheckCircle2 className="mr-2 inline-block h-5 w-5 text-cyan-500" />
              Mensagens (TimescaleDB)
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Consulta ao banco operacional do gateway com filtros por status, canal e termos.
            </CollapsibleCardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void onRefresh()} disabled={isLoading}>
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
      <CollapsibleCardContent>
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-5">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSearchSubmit();
                  }
                }}
                placeholder="Buscar por texto ou metadata"
                className="pl-9"
              />
            </div>
            <select
              value={currentStatus}
              onChange={(event) => handleStatusChange(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">Status (todos)</option>
              {STATUS_OPTIONS.map((statusOption) => (
                <option key={statusOption} value={statusOption}>
                  {statusOption}
                </option>
              ))}
            </select>
            <select
              value={currentChannel}
              onChange={(event) => handleChannelChange(event.target.value)}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="all">Canal (todos)</option>
              {uniqueChannels.map((channelId) => (
                <option key={channelId} value={channelId}>
                  {channelId}
                </option>
              ))}
            </select>
            <select
              value={limit}
              onChange={(event) => handleLimitChange(Number(event.target.value))}
              className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              {[25, 50, 100, 200].map((value) => (
                <option key={value} value={value}>
                  {value} por página
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSearchSubmit}>
                Aplicar busca
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearFilters} className="hidden md:inline-flex">
                Limpar
              </Button>
            </div>
          </div>

          {error ? (
            <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
              <AlertTriangle className="h-5 w-5" />
              <span>Falha ao carregar mensagens: {error.message}</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <th className="px-3 py-2">Recebida em</th>
                    <th className="px-3 py-2">Canal</th>
                    <th className="px-3 py-2">Mensagem</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Fonte</th>
                    <th className="px-3 py-2">Última atualização</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                        <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                      </td>
                    </tr>
                  ) : messages.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-3 py-6 text-center text-slate-500 dark:text-slate-400">
                        Nenhuma mensagem encontrada para os filtros informados.
                      </td>
                    </tr>
                  ) : (
                    messages.map((message) => (
                      <tr key={message.id} className="bg-white dark:bg-slate-950/60">
                        <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(message.receivedAt || message.createdAt)}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                          <div className="font-medium text-slate-700 dark:text-slate-200">{message.channelId}</div>
                          <div className="text-[11px] text-slate-400 dark:text-slate-500">
                            ID: {message.messageId}
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-sm text-slate-700 dark:text-slate-200">
                          <p className="line-clamp-3">{truncate(message.text || message.caption)}</p>
                          {message.mediaType && (
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              Mídia: {message.mediaType}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                            {message.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                          {message.source ?? '—'}
                        </td>
                        <td className="px-3 py-3 align-top text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(message.updatedAt)}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => void handleReprocess(message)}
                              disabled={isReprocessing}
                              title="Solicitar reprocessamento"
                            >
                              {isReprocessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Undo className="mr-2 h-4 w-4" />
                                  Reprocessar
                                </>
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => void handleDelete(message)}
                              disabled={isDeleting}
                              title="Marcar mensagem como removida"
                            >
                              {isDeleting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Excluir
                                </>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {pagination && (
            <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <div>
                Exibindo {messages.length} de {pagination.total ?? messages.length}. Página{' '}
                {Math.floor(offset / limit) + 1}.
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handlePrev} disabled={offset === 0}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" onClick={handleNext} disabled={!pagination.hasMore}>
                  Próxima
                </Button>
              </div>
            </div>
          )}
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
