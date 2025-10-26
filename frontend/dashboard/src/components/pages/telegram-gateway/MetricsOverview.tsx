import { Activity, BarChart3, Repeat, ShieldAlert, TrendingUp } from 'lucide-react';
import {
  CollapsibleCard,
  CollapsibleCardContent,
  CollapsibleCardDescription,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
} from '../../ui/collapsible-card';
import { TelegramGatewayMetricsSummary } from '../../../hooks/useTelegramGateway';

interface MetricsOverviewProps {
  metrics?: TelegramGatewayMetricsSummary;
  isLoading: boolean;
}

function formatNumber(value: number | null | undefined) {
  if (value === null || typeof value === 'undefined' || Number.isNaN(value)) return '—';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return Math.round(value).toString();
}

export function MetricsOverview({ metrics, isLoading }: MetricsOverviewProps) {
  const cards = [
    {
      label: 'Mensagens recebidas',
      value: formatNumber(metrics?.messagesReceivedTotal ?? null),
      icon: BarChart3,
      description: 'Total acumulado desde o boot do gateway',
      accent: 'text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Mensagens publicadas',
      value: formatNumber(metrics?.messagesPublishedTotal ?? null),
      icon: TrendingUp,
      description: 'Entregues com sucesso aos endpoints configurados',
      accent: 'text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Falhas de publicação',
      value: formatNumber(metrics?.publishFailuresTotal ?? null),
      icon: ShieldAlert,
      description: 'Tentativas que falharam após todos os retries',
      accent: 'text-red-600 dark:text-red-400',
    },
    {
      label: 'Tentativas de retry',
      value: formatNumber(metrics?.retryAttemptsTotal ?? null),
      icon: Repeat,
      description: 'Retries executados com backoff exponencial',
      accent: 'text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Fila de falhas (runtime)',
      value: formatNumber(metrics?.failureQueueSize ?? null),
      icon: Activity,
      description: 'Tamanho reportado via métrica Prometheus',
      accent: 'text-purple-600 dark:text-purple-400',
    },
  ];

  return (
    <CollapsibleCard cardId="telegram-gateway-metrics">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>
          <BarChart3 className="mr-2 inline-block h-5 w-5 text-blue-500" />
          Métricas operacionais
        </CollapsibleCardTitle>
        <CollapsibleCardDescription>
          Counters exportados pelo gateway e executados em tempo real via Prometheus.
        </CollapsibleCardDescription>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={`skeleton-card-${index}`}
                className="h-24 animate-pulse rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
              />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {cards.map(({ label, value, icon: Icon, description, accent }) => (
              <div
                key={label}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-5 w-5 ${accent}`} />
                  <div className="text-sm font-medium text-slate-600 dark:text-slate-300">
                    {label}
                  </div>
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">
                  {value}
                </div>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{description}</p>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
