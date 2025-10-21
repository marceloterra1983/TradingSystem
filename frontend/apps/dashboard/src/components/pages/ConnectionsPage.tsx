import { useQuery } from '@tanstack/react-query';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../ui/card';
import { formatTimestampShort } from '../../utils/dateUtils';
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { Button } from '../ui/button';
import { ConnectionStatus } from '../ConnectionStatus';
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Server,
  XCircle,
} from 'lucide-react';
import { getApiUrl } from '../../config/api';

const SERVICE_LAUNCHER_BASE_URL = getApiUrl('serviceLauncher');
const TELEGRAM_API_BASE_URL = getApiUrl('tpCapital');

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
  id?: string;
  name?: string;
  description?: string;
  category?: string;
  port?: unknown;
  status?: string;
  latencyMs?: unknown;
  updatedAt?: unknown;
  details?: unknown;
}

interface ServiceLauncherPayload {
  overallStatus?: string;
  totalServices?: number;
  degradedCount?: number;
  downCount?: number;
  averageLatencyMs?: number;
  lastCheckAt?: string;
  services?: RawServiceEntry[];
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

const DETAIL_FALLBACK_KEYS = ['message', 'reason', 'lastError'] as const;

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

const OVERALL_STATUS_META: Record<
  ServiceStatusValue,
  { label: string; helper?: string; textClass: string; icon: typeof CheckCircle }
> = {
  ok: {
    label: 'Todos os serviços operacionais',
    helper: 'Laucher reportou status saudável para todos os targets monitorados',
    textClass: 'text-green-600 dark:text-green-400',
    icon: CheckCircle,
  },
  degraded: {
    label: 'Serviços degradados detectados',
    helper: 'Verifique os serviços listados para sinais de latência ou falhas parciais',
    textClass: 'text-amber-600 dark:text-amber-400',
    icon: AlertTriangle,
  },
  down: {
    label: 'Serviços indisponíveis',
    helper: 'Ação imediata recomendada nos serviços marcados como offline',
    textClass: 'text-red-600 dark:text-red-400',
    icon: XCircle,
  },
  unknown: {
    label: 'Status desconhecido',
    helper: 'Não foi possível contatar o Laucher API',
    textClass: 'text-gray-600 dark:text-gray-400',
    icon: AlertTriangle,
  },
};

const SERVICE_STATUS_META: Record<
  ServiceStatusValue,
  { label: string; textClass: string; dotClass: string }
> = {
  ok: {
    label: 'Operacional',
    textClass: 'text-green-600 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
  degraded: {
    label: 'Degradado',
    textClass: 'text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  down: {
    label: 'Offline',
    textClass: 'text-red-600 dark:text-red-400',
    dotClass: 'bg-red-500',
  },
  unknown: {
    label: 'Desconhecido',
    textClass: 'text-gray-500 dark:text-gray-400',
    dotClass: 'bg-gray-400',
  },
};

function summarizeServiceDetail(details?: ServiceStatusDetails | null): string | null {
  if (!details) {
    return null;
  }

  for (const key of DETAIL_FALLBACK_KEYS) {
    const candidate = details[key];
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  return null;
}

function buildServiceUrl(port?: number): string | null {
  if (typeof port !== 'number' || port <= 0) {
    return null;
  }
  if (typeof window === 'undefined') {
    return `http://localhost:${port}`;
  }
  return `${window.location.protocol}//${window.location.hostname}:${port}`;
}

export async function fetchServiceLauncherStatus(): Promise<ServiceStatusSummary> {
  const endpoint = `${SERVICE_LAUNCHER_BASE_URL.replace(/\/$/, '')}/api/status`;
  const response = await fetch(endpoint, {
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Laucher status request failed with status ${response.status}`,
    );
  }

  const payload = (await response.json()) as ServiceLauncherPayload;
  const rawServices = Array.isArray(payload.services) ? payload.services : [];

  const services: ServiceStatusEntry[] = rawServices.map((service) => {
    const port = typeof service.port === 'number' && Number.isFinite(service.port)
      ? service.port
      : undefined;

    const latencyMs =
      typeof service.latencyMs === 'number' && Number.isFinite(service.latencyMs)
        ? service.latencyMs
        : undefined;

    const updatedAt = typeof service.updatedAt === 'string' ? service.updatedAt : undefined;

    const details =
      service.details && typeof service.details === 'object'
        ? (service.details as ServiceStatusDetails)
        : undefined;

    return {
      id: service.id ?? service.name,
      name: service.name ?? 'Serviço sem nome',
      description: service.description,
      category: service.category,
      port,
      status: resolveServiceStatus(service.status),
      latencyMs,
      updatedAt,
      details,
    };
  });

  return {
    overallStatus: resolveServiceStatus(payload.overallStatus),
    totalServices:
      typeof payload?.totalServices === 'number'
        ? payload.totalServices
        : services.length,
    degradedCount:
      typeof payload?.degradedCount === 'number' ? payload.degradedCount : 0,
    downCount: typeof payload?.downCount === 'number' ? payload.downCount : 0,
    averageLatencyMs:
      typeof payload?.averageLatencyMs === 'number'
        ? payload.averageLatencyMs
        : null,
    lastCheckAt:
      typeof payload?.lastCheckAt === 'string' ? payload.lastCheckAt : null,
    services,
  };
}

export function WebSocketStatusSection() {
  return (
    <CollapsibleCard cardId="connections-websocket">
      <CollapsibleCardHeader>
        <div className="flex-1 flex items-center justify-between">
          <div>
            <CollapsibleCardTitle>System Status</CollapsibleCardTitle>
            <CollapsibleCardDescription>
              Documentação e dashboards unificados
            </CollapsibleCardDescription>
          </div>
          <ConnectionStatus showDetails />
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Portal de documentação operacional (Docusaurus + Documentation API)</span>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

export function ProfitDLLStatusSection() {
  return (
    <CollapsibleCard cardId="connections-profitdll">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <CollapsibleCardTitle>ProfitDLL Status</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Trading system integration (roadmap)
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <Activity className="h-5 w-5" />
          <span>
            Serviços nativos Windows (Data Capture, Order Manager, Analytics) serão monitorados aqui.
          </span>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

export function ServiceHealthSection() {
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

  const overallStatus = resolveServiceStatus(data?.overallStatus);
  const overallMeta = OVERALL_STATUS_META[overallStatus];
  const services = data?.services ?? [];
  const lastCheckLabel = data?.lastCheckAt ? formatTimestampShort(data.lastCheckAt) : null;
  const isRefreshing = isFetching && !isLoading;
  const errorMessage =
    error instanceof Error
      ? error.message
      : 'Não foi possível obter o status dos serviços.';

  return (
    <CollapsibleCard cardId="connections-services">
      <CollapsibleCardHeader>
        <div className="flex-1">
          <CollapsibleCardTitle>Service Health</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Status agregado dos serviços monitorados via Laucher API
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
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            <p className="font-semibold">Laucher API não respondeu.</p>
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
                <overallMeta.icon className={`h-5 w-5 ${overallMeta.textClass}`} />
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {overallMeta.label}
                  </p>
                  {overallMeta.helper ? (
                    <p className={`text-xs ${overallMeta.textClass}`}>{overallMeta.helper}</p>
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
                  <p className="font-semibold text-gray-700 dark:text-gray-200">Serviços</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-50">
                    {data?.totalServices ?? services.length}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">Degradados</p>
                  <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                    {data?.degradedCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">Offline</p>
                  <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                    {data?.downCount ?? 0}
                  </p>
                </div>
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">Latência média</p>
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
                            {typeof service.port === 'number' && serviceUrl && status === 'ok' ? (
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
                        <span className={`h-2.5 w-2.5 rounded-full ${meta.dotClass}`} />
                        <span className={`text-xs font-semibold ${meta.textClass}`}>
                          {meta.label}
                        </span>
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

function TelegramBotTableCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bots Monitorados</CardTitle>
        <CardDescription>
          Registro local dos bots utilizados na ingestão e broadcast (TP-Capital)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Configure bots e tokens no backend TP-Capital (`{TELEGRAM_API_BASE_URL}`).
          Esta tabela exibirá metadados sincronizados quando o serviço estiver ativo.
        </p>
      </CardContent>
    </Card>
  );
}

function TelegramChannelTableCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Canais e Grupos</CardTitle>
        <CardDescription>
          Visão centralizada dos canais conectados ao pipeline de ingestão
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          As assinaturas de canais serão exibidas aqui após a sincronização com o serviço
          TP-Capital. Utilize o painel para validar permissões e última captura.
        </p>
      </CardContent>
    </Card>
  );
}

export function TelegramManagementSection() {
  return (
    <CollapsibleCard cardId="connections-telegram">
      <CollapsibleCardHeader>
        <div>
          <CollapsibleCardTitle>Telegram</CollapsibleCardTitle>
          <CollapsibleCardDescription>
            Gerencie bots e canais do Telegram com persistência local para revisão
          </CollapsibleCardDescription>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-6">
          <TelegramBotTableCard />
          <TelegramChannelTableCard />
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
