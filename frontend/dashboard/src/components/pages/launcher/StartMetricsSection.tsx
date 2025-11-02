import { useQuery } from '@tanstack/react-query';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../../ui/collapsible-card';
import { Button } from '../../ui/button';
import {
  Activity,
  CheckCircle,
  XCircle,
  RefreshCw,
  TrendingUp,
  Clock,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { formatTimestampShort } from '../../../utils/dateUtils';
import { getApiUrl } from '../../../config/api';

const SERVICE_LAUNCHER_BASE_URL = getApiUrl('serviceLauncher');

interface ServiceMetric {
  name: string;
  startTimeSeconds: number;
  retryCount: number;
  status: 'success' | 'failed';
}

interface StartMetrics {
  timestamp: string;
  totalDurationSeconds: number;
  services: ServiceMetric[];
  failedServices: string[];
  summary: {
    totalServices: number;
    successfulServices: number;
    failedServices: number;
  };
}

async function fetchStartMetrics(): Promise<StartMetrics | null> {
  try {
    const response = await fetch(
      `${SERVICE_LAUNCHER_BASE_URL}/api/start-metrics`,
    );
    if (!response.ok) {
      if (response.status === 404) {
        return null; // No metrics available yet
      }
      throw new Error(`API returned ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Failed to fetch start metrics:', error);
    return null;
  }
}

export function StartMetricsSection() {
  const {
    data: metrics,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<StartMetrics | null>({
    queryKey: ['start-metrics'],
    queryFn: fetchStartMetrics,
    refetchInterval: 30000, // Refresh every 30s
    staleTime: 20000,
  });

  const isRefreshing = isFetching && !isLoading;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <CollapsibleCard cardId="launcher-start-metrics">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <CollapsibleCardTitle>Start Metrics</CollapsibleCardTitle>
          </div>
          <CollapsibleCardDescription>
            Métricas da última inicialização do sistema
          </CollapsibleCardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => {
            void refetch();
          }}
          disabled={isRefreshing}
          aria-label="Atualizar métricas"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
          />
        </Button>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ) : isError || !metrics ? (
          <div className="space-y-3 rounded-lg border border-gray-300 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <p className="font-semibold">Nenhuma métrica disponível</p>
            </div>
            <p className="text-xs">
              Execute{' '}
              <code className="rounded bg-gray-200 px-1 py-0.5 dark:bg-gray-700">
                bash scripts/universal/start.sh
              </code>{' '}
              para gerar métricas de inicialização.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900">
                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>Tempo Total</span>
                </div>
                <p className="mt-1 text-lg font-bold text-gray-900 dark:text-gray-100">
                  {formatDuration(metrics.totalDurationSeconds)}
                </p>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400">
                  <CheckCircle className="h-3 w-3" />
                  <span>Sucesso</span>
                </div>
                <p className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {metrics.summary.successfulServices}/
                  {metrics.summary.totalServices}
                </p>
              </div>

              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950">
                <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                  <XCircle className="h-3 w-3" />
                  <span>Falhas</span>
                </div>
                <p className="mt-1 text-lg font-bold text-red-700 dark:text-red-400">
                  {metrics.summary.failedServices}
                </p>
              </div>

              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950">
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                  <RotateCcw className="h-3 w-3" />
                  <span>Retries</span>
                </div>
                <p className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400">
                  {metrics.services.reduce((sum, s) => sum + s.retryCount, 0)}
                </p>
              </div>
            </div>

            {/* Timestamp */}
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Última inicialização: {formatTimestampShort(metrics.timestamp)}
            </div>

            {/* Services List */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Serviços Iniciados
              </h4>
              {metrics.services.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhum serviço registrado
                </p>
              ) : (
                metrics.services.map((service) => (
                  <div
                    key={service.name}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
                  >
                    <div className="flex items-center gap-3">
                      {service.status === 'success' ? (
                        <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {service.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {service.status === 'success' ? 'Iniciado' : 'Falhou'}{' '}
                          em {formatDuration(service.startTimeSeconds)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {service.retryCount > 0 && (
                        <div className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 dark:bg-amber-900">
                          <RotateCcw className="h-3 w-3 text-amber-700 dark:text-amber-300" />
                          <span className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                            {service.retryCount}
                          </span>
                        </div>
                      )}
                      {service.status === 'success' &&
                        service.retryCount === 0 && (
                          <div className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 dark:bg-emerald-900">
                            <Zap className="h-3 w-3 text-emerald-700 dark:text-emerald-300" />
                            <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                              1st try
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
