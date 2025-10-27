import { getApiUrl } from '../../config/api';

export interface ServiceLauncherService {
  id: string;
  name: string;
  status: string;
  latencyMs?: number;
  updatedAt?: string;
}

export interface ServiceLauncherStatusSummary {
  overallStatus: string;
  totalServices: number;
  degradedCount: number;
  downCount: number;
  averageLatencyMs: number;
  lastCheckAt?: string | null;
  services: ServiceLauncherService[];
}

const SERVICE_LAUNCHER_STATUS_URL = (() => {
  const base = getApiUrl('serviceLauncher').replace(/\/+$/, '');
  return `${base}/status`;
})();

const ensureNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
};

const toService = (value: unknown): ServiceLauncherService => {
  if (!value || typeof value !== 'object') {
    return {
      id: 'unknown',
      name: 'Unknown service',
      status: 'unknown',
    };
  }

  const payload = value as Partial<ServiceLauncherService> & { id?: string; name?: string };
  return {
    id: payload.id ?? payload.name ?? 'unknown',
    name: payload.name ?? payload.id ?? 'Unknown service',
    status: payload.status ?? 'unknown',
    latencyMs: payload.latencyMs,
    updatedAt: payload.updatedAt,
  };
};

const normalizeSummary = (value: unknown): ServiceLauncherStatusSummary => {
  if (!value || typeof value !== 'object') {
    return {
      overallStatus: 'unknown',
      totalServices: 0,
      degradedCount: 0,
      downCount: 0,
      averageLatencyMs: 0,
      lastCheckAt: null,
      services: [],
    };
  }

  const payload = value as Partial<ServiceLauncherStatusSummary>;
  return {
    overallStatus: payload.overallStatus ?? 'unknown',
    totalServices: ensureNumber(payload.totalServices),
    degradedCount: ensureNumber(payload.degradedCount),
    downCount: ensureNumber(payload.downCount),
    averageLatencyMs: ensureNumber(payload.averageLatencyMs),
    lastCheckAt: typeof payload.lastCheckAt === 'string' ? payload.lastCheckAt : null,
    services: Array.isArray(payload.services)
      ? payload.services.map((service) => toService(service))
      : [],
  };
};

export async function fetchServiceLauncherStatus(): Promise<ServiceLauncherStatusSummary> {
  const response = await fetch(SERVICE_LAUNCHER_STATUS_URL, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Service launcher status ${response.status}: ${details || response.statusText}`,
    );
  }

  const payload = await response.json();
  if (
    payload &&
    typeof payload === 'object' &&
    ('data' in payload || 'result' in payload)
  ) {
    const inner =
      ('data' in payload ? (payload as { data?: unknown }).data : undefined) ??
      ('result' in payload ? (payload as { result?: unknown }).result : undefined);
    return normalizeSummary(inner);
  }

  return normalizeSummary(payload);
}
