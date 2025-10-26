import { AlertTriangle, CheckCircle, Loader2, RefreshCw, Zap } from 'lucide-react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { Button } from '../../ui/button';
import { TelegramGatewayOverview } from '../../../hooks/useTelegramGateway';

interface StatusSummaryProps {
  overview?: TelegramGatewayOverview;
  isLoading: boolean;
  error?: Error | null;
  onRefresh: () => void;
  onReloadCache: () => Promise<void> | void;
  isReloading: boolean;
  lastUpdated?: string;
}

const STATUS_META = {
  healthy: {
    icon: CheckCircle,
    label: 'Gateway conectado',
    className: 'text-emerald-600 dark:text-emerald-400',
  },
  unhealthy: {
    icon: AlertTriangle,
    label: 'Gateway desconectado',
    className: 'text-red-600 dark:text-red-400',
  },
  unknown: {
    icon: AlertTriangle,
    label: 'Status desconhecido',
    className: 'text-amber-600 dark:text-amber-400',
  },
} as const;

function formatDuration(seconds?: number) {
  if (!seconds || Number.isNaN(seconds)) return '—';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${Math.floor(seconds)}s`;
}

function formatTimestamp(timestamp?: string) {
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

export function StatusSummary({
  overview,
  isLoading,
  error,
  onRefresh,
  onReloadCache,
  isReloading,
  lastUpdated,
}: StatusSummaryProps) {
  const status = overview?.health?.status ?? 'unknown';
  const meta = STATUS_META[status] ?? STATUS_META.unknown;
  const Icon = meta.icon;
  const connectionOk = overview?.metrics?.summary?.connectionStatus === 1;

  const telegramLabel =
    overview?.health?.telegram === 'connected'
      ? 'Telegram conectado'
      : overview?.health?.telegram === 'disconnected'
        ? 'Telegram desconectado'
        : 'Telegram status desconhecido';

  const telegramClass =
    overview?.health?.telegram === 'connected'
      ? 'text-emerald-600 dark:text-emerald-400'
      : overview?.health?.telegram === 'disconnected'
        ? 'text-red-600 dark:text-red-400'
        : 'text-amber-600 dark:text-amber-400';

  return (
    <CollapsibleCard cardId="telegram-gateway-status">
      <CollapsibleCardHeader>
        <div className="flex w-full items-start justify-between gap-4">
          <div className="space-y-1">
            <CollapsibleCardTitle>
              <Zap className="mr-2 inline-block h-5 w-5 text-cyan-500" />
              Status do Telegram Gateway
            </CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Monitoramento em tempo real da conexão MTProto e do serviço HTTP.
            </CollapsibleCardDescription>
          </div>
          <div className="flex items-center gap-2">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void onReloadCache()}
              disabled={isReloading}
              title="Limpar cache das métricas no launcher"
            >
              {isReloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Limpar Cache
                </>
              )}
            </Button>
          </div>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
            Falha ao carregar status: {error.message}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Icon className={`h-5 w-5 ${meta.className}`} />
                <span className={`font-medium ${meta.className}`}>{meta.label}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Atualizado em {formatTimestamp(overview?.timestamp || lastUpdated)}
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Uptime: {formatDuration(overview?.health?.uptime)}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className={`flex h-5 w-5 items-center justify-center rounded-full ${telegramClass}`}>
                  <span className="text-xs font-bold">TG</span>
                </div>
                <span className={`font-medium ${telegramClass}`}>{telegramLabel}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Conexão MTProto {connectionOk ? 'ativa' : 'inativa'}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Mensagens Persistidas
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {overview?.messages?.total ?? '—'}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                TimescaleDB (última captura em{' '}
                {formatTimestamp(overview?.messages?.pagination?.hasMore ? undefined : overview?.timestamp)})
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                Fila de Falhas
              </div>
              <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                {overview?.queue?.totalMessages ?? 0}
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Arquivo: {overview?.queue?.path ?? '—'}
              </p>
            </div>
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
