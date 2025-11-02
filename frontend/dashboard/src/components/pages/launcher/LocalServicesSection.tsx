import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Server,
  XCircle,
  Rocket,
  Play,
} from 'lucide-react';
import { getApiUrl } from '../../../config/api';
import { formatTimestampShort } from '../../../utils/dateUtils';

const SERVICE_LAUNCHER_BASE_URL = getApiUrl('serviceLauncher');

type ServiceStatusValue = 'ok' | 'degraded' | 'down' | 'unknown';

interface ServiceStatusDetails extends Record<string, unknown> {
  message?: string;
  reason?: string;
  lastError?: string;
}

export interface ServiceStatusEntry {
  id?: string;
  name: string;
  description?: string;
  category?: string;
  port?: number;
  status: ServiceStatusValue;
  latencyMs?: number;
  updatedAt?: string;
  details?: ServiceStatusDetails | null;
}

export interface ServiceStatusSummary {
  overallStatus: ServiceStatusValue;
  totalServices: number;
  degradedCount: number;
  downCount: number;
  averageLatencyMs: number | null;
  lastCheckAt: string | null;
  services: ServiceStatusEntry[];
}

interface RawServiceEntry {
  id?: unknown;
  name?: unknown;
  description?: unknown;
  category?: unknown;
  port?: unknown;
  status?: unknown;
  latencyMs?: unknown;
  updatedAt?: unknown;
  details?: unknown;
}

const FALLBACK_SUMMARY: ServiceStatusSummary = {
  overallStatus: 'unknown',
  totalServices: 0,
  degradedCount: 0,
  downCount: 0,
  averageLatencyMs: null,
  lastCheckAt: null,
  services: [],
};

function resolveServiceStatus(value?: string | null): ServiceStatusValue {
  switch (value) {
    case 'ok':
    case 'degraded':
    case 'down':
      return value;
    default:
      return 'unknown';
  }
}

const SERVICE_STATUS_META = {
  ok: {
    label: 'Online',
    dotClass: 'bg-emerald-500',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Degraded',
    dotClass: 'bg-amber-500',
    textClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  down: {
    label: 'Offline',
    dotClass: 'bg-red-500',
    textClass: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
  unknown: {
    label: 'Unknown',
    dotClass: 'bg-gray-400',
    textClass: 'text-gray-500 dark:text-gray-400',
    icon: Activity,
  },
};

const OVERALL_STATUS_META = {
  ok: {
    label: 'Todos os serviços operacionais',
    helper: 'Sistema funcionando normalmente',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Sistema degradado',
    helper: 'Alguns serviços apresentam problemas',
    textClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  down: {
    label: 'Sistema offline',
    helper: 'Serviços críticos não estão respondendo',
    textClass: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
  unknown: {
    label: 'Status desconhecido',
    helper: null,
    textClass: 'text-gray-500 dark:text-gray-400',
    icon: Activity,
  },
};

async function fetchServiceLauncherStatus(): Promise<ServiceStatusSummary> {
  const url = `${SERVICE_LAUNCHER_BASE_URL}/api/status`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Service Launcher API returned ${response.status}`);
  }

  const data = await response.json();

  return {
    overallStatus: resolveServiceStatus(data.overallStatus),
    totalServices:
      typeof data.totalServices === 'number' ? data.totalServices : 0,
    degradedCount:
      typeof data.degradedCount === 'number' ? data.degradedCount : 0,
    downCount: typeof data.downCount === 'number' ? data.downCount : 0,
    averageLatencyMs:
      typeof data.averageLatencyMs === 'number' ? data.averageLatencyMs : null,
    lastCheckAt: typeof data.lastCheckAt === 'string' ? data.lastCheckAt : null,
    services: Array.isArray(data.services)
      ? data.services.map((raw: RawServiceEntry) => {
          const details =
            raw.details && typeof raw.details === 'object'
              ? (raw.details as ServiceStatusDetails)
              : undefined;
          return {
            id: typeof raw.id === 'string' ? raw.id : undefined,
            name:
              typeof raw.name === 'string' && raw.name.trim().length > 0
                ? raw.name
                : 'Unknown',
            description:
              typeof raw.description === 'string' ? raw.description : undefined,
            category:
              typeof raw.category === 'string' ? raw.category : undefined,
            port: typeof raw.port === 'number' ? raw.port : undefined,
            status: resolveServiceStatus(
              typeof raw.status === 'string' ? raw.status : undefined,
            ),
            latencyMs:
              typeof raw.latencyMs === 'number' ? raw.latencyMs : undefined,
            updatedAt:
              typeof raw.updatedAt === 'string' ? raw.updatedAt : undefined,
            details,
          } satisfies ServiceStatusEntry;
        })
      : [],
  };
}

function buildServiceUrl(port?: number): string | null {
  if (typeof port !== 'number') return null;
  return `http://localhost:${port}`;
}

function summarizeServiceDetail(
  details?: ServiceStatusDetails | null,
): string | null {
  if (!details || typeof details !== 'object') return null;

  const keys = ['message', 'reason', 'lastError'] as const;
  for (const key of keys) {
    const value = details[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export function LocalServicesSection() {
  const queryClient = useQueryClient();

  const {
    data = FALLBACK_SUMMARY,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery<ServiceStatusSummary>({
    queryKey: ['service-launcher-status'],
    queryFn: fetchServiceLauncherStatus,
    refetchInterval: 15000,
    staleTime: 10000,
    placeholderData: FALLBACK_SUMMARY,
  });

  const startServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await fetch(
        `${SERVICE_LAUNCHER_BASE_URL}/api/auto-start/${serviceId}`,
        { method: 'POST' },
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-launcher-status'] });
    },
  });

  const overallStatus = resolveServiceStatus(data?.overallStatus);
  const overallMeta = OVERALL_STATUS_META[overallStatus];
  const services = data?.services ?? [];
  const lastCheckLabel = data?.lastCheckAt
    ? formatTimestampShort(data.lastCheckAt)
    : null;
  const isRefreshing = isFetching && !isLoading;
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Não foi possível obter o status dos serviços.';

  return (
    <CollapsibleCard cardId="launcher-local-services">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <CollapsibleCardTitle>Local Services</CollapsibleCardTitle>
          </div>
          <CollapsibleCardDescription>
            Node.js/Express APIs and frontend applications
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
          aria-label="Atualizar status dos serviços"
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
        ) : isError ? (
          <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-700 dark:border-amber-500/60 dark:bg-amber-500/10 dark:text-amber-200">
            <p className="font-semibold">Service Launcher API não respondeu.</p>
            <p>{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void refetch();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <overallMeta.icon
                  className={`h-5 w-5 ${overallMeta.textClass}`}
                />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {overallMeta.label}
                  </p>
                  {overallMeta.helper ? (
                    <p className={`text-xs ${overallMeta.textClass}`}>
                      {overallMeta.helper}
                    </p>
                  ) : null}
                  {lastCheckLabel ? (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Última verificação: {lastCheckLabel}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs text-gray-600 dark:text-gray-300 md:grid-cols-4">
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    Serviços
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {data?.totalServices ?? services.length}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    Degradados
                  </p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {data?.degradedCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    Offline
                  </p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {data?.downCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    Latência média
                  </p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {typeof data?.averageLatencyMs === 'number'
                      ? `${data.averageLatencyMs} ms`
                      : '–'}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              {services.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Nenhum serviço monitorado pela API até o momento.
                </p>
              ) : (
                services.map((service) => {
                  const status = resolveServiceStatus(service.status);
                  const meta = SERVICE_STATUS_META[status];
                  const detail = summarizeServiceDetail(service.details);
                  const updatedLabel = service.updatedAt
                    ? formatTimestampShort(service.updatedAt)
                    : null;
                  const serviceUrl = buildServiceUrl(service.port);

                  return (
                    <div
                      key={service.id || service.name}
                      className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 md:flex-row md:items-center"
                    >
                      <div className="flex items-start gap-3">
                        <Server className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              {service.name}
                            </p>
                            {serviceUrl && status === 'ok' ? (
                              <a
                                href={serviceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                                title={`Abrir ${service.name}`}
                              >
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : null}
                          </div>
                          {service.description ? (
                            <p className="text-xs text-gray-600 dark:text-gray-400 italic mb-1">
                              {service.description}
                            </p>
                          ) : null}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {service.category || '—'}
                            {typeof service.port === 'number' &&
                            serviceUrl &&
                            status === 'ok' ? (
                              <>
                                {' · '}
                                <a
                                  href={serviceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-700 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                                  title={`Abrir porta ${service.port}`}
                                >
                                  Porta {service.port}
                                </a>
                              </>
                            ) : typeof service.port === 'number' ? (
                              ` · Porta ${service.port}`
                            ) : null}
                          </p>
                          {updatedLabel ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Verificado: {updatedLabel}
                            </p>
                          ) : null}
                          {typeof service.latencyMs === 'number' ? (
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              Latência: {service.latencyMs} ms
                            </p>
                          ) : null}
                          {detail ? (
                            <p className="text-xs text-amber-600 dark:text-amber-400">
                              {detail}
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`}
                        />
                        <span
                          className={`text-xs font-semibold ${meta.textClass}`}
                        >
                          {meta.label}
                        </span>
                        {status === 'down' && service.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              if (service.id) {
                                startServiceMutation.mutate(service.id);
                              }
                            }}
                            disabled={startServiceMutation.isPending}
                            className="ml-2 h-7 px-2"
                            title={`Iniciar ${service.name}`}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Iniciar
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
