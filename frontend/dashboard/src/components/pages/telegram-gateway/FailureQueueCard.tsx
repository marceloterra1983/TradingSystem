import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { ScrollArea } from '../../ui/scroll-area';
import { TelegramGatewayQueueStatus } from '../../../hooks/useTelegramGateway';
import { AlertTriangle, List, RefreshCw } from 'lucide-react';
import { Button } from '../../ui/button';

interface FailureQueueCardProps {
  queue?: TelegramGatewayQueueStatus;
  isLoading: boolean;
  onRefresh: () => void;
}

function formatBytes(size?: number) {
  if (typeof size !== 'number' || Number.isNaN(size)) return '—';
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  return `${(size / 1024 ** exponent).toFixed(1)} ${units[exponent]}`;
}

function formatTimestamp(timestamp?: string | null) {
  if (!timestamp) return '—';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(new Date(timestamp));
  } catch {
    return timestamp;
  }
}

export function FailureQueueCard({ queue, isLoading, onRefresh }: FailureQueueCardProps) {
  const hasPreview = (queue?.preview?.length ?? 0) > 0;

  return (
    <CollapsibleCard cardId="telegram-gateway-failure-queue">
      <CollapsibleCardHeader>
        <div className="flex w-full items-center justify-between">
          <div>
            <CollapsibleCardTitle>
              <List className="mr-2 inline-block h-5 w-5 text-amber-500" />
              Fila de falhas (JSONL)
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Mensagens persistidas após exceder todas as tentativas de publicação.
            </CollapsibleCardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => void onRefresh()} disabled={isLoading}>
            {isLoading ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
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
        {queue?.error ? (
          <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle className="h-5 w-5" />
            <span>Não foi possível ler a fila: {queue.error}</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs text-slate-500 dark:text-slate-400">Total de mensagens</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {queue?.totalMessages ?? 0}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs text-slate-500 dark:text-slate-400">Tamanho do arquivo</div>
                <div className="mt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {formatBytes(queue?.sizeBytes)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs text-slate-500 dark:text-slate-400">Última atualização</div>
                <div className="mt-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                  {formatTimestamp(queue?.updatedAt)}
                </div>
              </div>
              <div className="rounded-md border border-slate-200 bg-white p-3 text-sm dark:border-slate-800 dark:bg-slate-950">
                <div className="text-xs text-slate-500 dark:text-slate-400">Arquivo</div>
                <div className="mt-1 break-all text-sm text-slate-900 dark:text-slate-100">
                  {queue?.path ?? '—'}
                </div>
              </div>
            </div>
            {hasPreview ? (
              <div className="rounded-lg border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                  <span>Visualização (mais recentes)</span>
                  <span>
                    Exibindo {queue?.previewCount ?? 0} de {queue?.totalMessages ?? 0}
                  </span>
                </div>
                <ScrollArea className="max-h-64">
                  <ul className="divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    {queue?.preview?.map((entry, index) => (
                      <li key={`queue-entry-${index}`} className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span>
                            Canal: <strong>{entry.channelId ?? 'N/D'}</strong>
                          </span>
                          <span>
                            Mensagem: <strong>{entry.messageId ?? 'N/D'}</strong>
                          </span>
                          <span>Falhou em {formatTimestamp(entry.failedAt)}</span>
                          {entry.queuedAt && <span>Enfileirada em {formatTimestamp(entry.queuedAt)}</span>}
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm text-slate-700 dark:text-slate-200">
                          {entry.textPreview || '(sem mensagem)'}
                        </p>
                        {entry.parseError && (
                          <p className="mt-2 text-xs text-red-500 dark:text-red-400">
                            Erro ao interpretar linha: {entry.parseError}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                Nenhuma mensagem na fila de falhas no momento.
              </div>
            )}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
