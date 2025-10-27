import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getApiUrl } from '../config/api';

const TELEGRAM_GATEWAY_API_BASE = getApiUrl('telegramGateway').replace(/\/$/, '');
const TELEGRAM_GATEWAY_SERVICE_BASE = `${TELEGRAM_GATEWAY_API_BASE}/api/telegram-gateway`;
const TELEGRAM_GATEWAY_MESSAGES_BASE = `${TELEGRAM_GATEWAY_API_BASE}/api/messages`;
const TELEGRAM_GATEWAY_CHANNELS_BASE = `${TELEGRAM_GATEWAY_API_BASE}/api/channels`;
const TELEGRAM_GATEWAY_TOKEN =
  (import.meta.env.VITE_TELEGRAM_GATEWAY_API_TOKEN as string | undefined)?.trim() ||
  (import.meta.env.VITE_API_SECRET_TOKEN as string | undefined)?.trim() ||
  '';

if (import.meta.env.DEV && TELEGRAM_GATEWAY_TOKEN.length === 0) {
  // eslint-disable-next-line no-console
  console.warn('[TelegramGateway] Nenhum token configurado; requisições podem falhar com 401');
}

export type GatewayHealthStatus = 'healthy' | 'unhealthy' | 'unknown';

export interface TelegramGatewayHealth {
  status: GatewayHealthStatus;
  telegram?: 'connected' | 'disconnected';
  uptime?: number;
  timestamp: string;
  error?: string;
}

export interface TelegramGatewayMetricSample {
  value: number;
  labels: Record<string, string>;
}

export interface TelegramGatewayMetricsSummary {
  connectionStatus: number | null;
  messagesReceivedTotal: number | null;
  messagesPublishedTotal: number | null;
  publishFailuresTotal: number | null;
  retryAttemptsTotal: number | null;
  failureQueueSize: number | null;
}

export interface TelegramGatewayMetrics {
  raw?: string;
  parsed?: Record<string, TelegramGatewayMetricSample[]>;
  summary?: TelegramGatewayMetricsSummary;
  error?: string;
}

export interface TelegramGatewayQueuePreviewEntry {
  channelId: string | null;
  messageId: string | number | null;
  textPreview: string | null;
  failedAt: string | null;
  queuedAt: string | null;
  createdAt: string | null;
  parseError?: string;
  raw?: string;
}

export interface TelegramGatewayQueueStatus {
  exists: boolean;
  path: string;
  sizeBytes?: number;
  updatedAt?: string;
  totalMessages: number;
  previewLimit?: number;
  previewCount?: number;
  preview: TelegramGatewayQueuePreviewEntry[];
  error?: string;
}

export interface TelegramGatewaySessionStatus {
  exists: boolean;
  path: string;
  sizeBytes?: number;
  updatedAt?: string;
  ageMs?: number;
  hash?: string;
  error?: string;
}

export interface TelegramGatewayMessage {
  id: string;
  channelId: string;
  messageId: string | number;
  threadId?: string | number | null;
  source?: string;
  messageType?: string;
  text?: string;
  caption?: string;
  mediaType?: string;
  mediaRefs?: unknown;
  status: string;
  receivedAt?: string;
  telegramDate?: string;
  publishedAt?: string;
  failedAt?: string;
  queuedAt?: string;
  reprocessRequestedAt?: string;
  reprocessedAt?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
}

export interface TelegramGatewayMessageSummary {
  total: number;
  byStatus: Array<{ status: string; total: number }>;
  recent: TelegramGatewayMessage[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
  error?: string;
}

export interface TelegramGatewayOverview {
  health?: TelegramGatewayHealth;
  metrics?: TelegramGatewayMetrics;
  queue?: TelegramGatewayQueueStatus;
  session?: TelegramGatewaySessionStatus;
  messages?: TelegramGatewayMessageSummary;
  timestamp: string;
  error?: string;
}

export interface TelegramGatewayMessagesResponse {
  data: TelegramGatewayMessage[];
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  } | null;
}

export interface TelegramGatewayChannel {
  id: string;
  channelId: string;
  label?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TelegramGatewayAuthLogEntry {
  level: string;
  message: string;
  timestamp: string;
}

export type TelegramGatewayAuthStatusValue =
  | 'idle'
  | 'starting'
  | 'waiting_code'
  | 'processing_code'
  | 'waiting_password'
  | 'processing_password'
  | 'completed'
  | 'cancelled'
  | 'error'
  | 'cancelling';

export interface TelegramGatewayAuthStatus {
  status: TelegramGatewayAuthStatusValue;
  running: boolean;
  startedAt?: string | null;
  finishedAt?: string | null;
  exitCode?: number | null;
  logs: TelegramGatewayAuthLogEntry[];
}

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

async function fetchJson<T>(url: string, options?: FetchOptions): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(TELEGRAM_GATEWAY_TOKEN
        ? { 'X-Gateway-Token': TELEGRAM_GATEWAY_TOKEN }
        : {}),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let details: unknown;

    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }

    const error = new Error(
      `Telegram Gateway API ${response.status}: ${
        typeof details === 'string'
          ? details
          : typeof details === 'object' && details
            ? JSON.stringify(details)
            : 'unknown error'
      }`,
    );
    (error as Error & { status?: number; details?: unknown }).status = response.status;
    (error as Error & { status?: number; details?: unknown }).details = details;
    throw error;
  }

  return response.json() as Promise<T>;
}

export function useTelegramGatewayOverview(pollingMs = 10000) {
  return useQuery<TelegramGatewayOverview>({
    queryKey: ['telegram-gateway', 'overview'],
    queryFn: async () => {
      const payload = await fetchJson<{ success: boolean; data: TelegramGatewayOverview }>(
        `${TELEGRAM_GATEWAY_SERVICE_BASE}/overview`,
      );
      return payload.data;
    },
    refetchInterval: pollingMs,
    staleTime: pollingMs / 2,
    retry: 1,
  });
}

export interface TelegramGatewayMessagesFilters {
  status?: string[];
  source?: string[];
  channelId?: string;
  messageId?: string | number;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
  includeDeleted?: boolean;
  sort?: 'asc' | 'desc';
}

export function useTelegramGatewayMessages(filters: TelegramGatewayMessagesFilters) {
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();

    if (filters.channelId) params.set('channelId', filters.channelId);
    if (filters.messageId) params.set('messageId', String(filters.messageId));
    if (filters.search) params.set('search', filters.search);
    if (filters.from) params.set('from', filters.from);
    if (filters.to) params.set('to', filters.to);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));
    if (filters.sort) params.set('sort', filters.sort);
    if (filters.includeDeleted) params.set('includeDeleted', 'true');

    if (filters.status && filters.status.length > 0) {
      filters.status.forEach((status) => params.append('status', status));
    }

    if (filters.source && filters.source.length > 0) {
      filters.source.forEach((source) => params.append('source', source));
    }

    return params;
  }, [filters]);

  return useQuery<TelegramGatewayMessagesResponse>({
    queryKey: ['telegram-gateway', 'messages', filters],
    queryFn: async () => {
      const payload = await fetchJson<TelegramGatewayMessagesResponse>(
        `${TELEGRAM_GATEWAY_MESSAGES_BASE}?${queryParams.toString()}`,
      );
      return payload;
    },
    placeholderData: (previousData) => previousData ?? undefined,
  });
}

export function useTelegramGatewayReload() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['telegram-gateway', 'reload'],
    mutationFn: async () => {
      await fetchJson<{ success: boolean; timestamp: string }>(
        `${TELEGRAM_GATEWAY_SERVICE_BASE}/actions/reload`,
        { method: 'POST' },
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway'] });
    },
  });
}

export function useTelegramGatewayReprocess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['telegram-gateway', 'reprocess'],
    mutationFn: async ({ id, requestedBy }: { id: string; requestedBy?: string }) => {
      const payload = await fetchJson<{ success: boolean; data: TelegramGatewayMessage }>(
        `${TELEGRAM_GATEWAY_MESSAGES_BASE}/${id}/reprocess`,
        {
          method: 'POST',
          body: JSON.stringify(
            requestedBy
              ? {
                  requestedBy,
                }
              : {},
          ),
        },
      );
      return payload.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'messages'] });
    },
  });
}

export function useTelegramGatewayDeleteMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['telegram-gateway', 'delete'],
    mutationFn: async ({ id, reason }: { id: string; reason?: string }) => {
      const payload = await fetchJson<{ success: boolean; data: TelegramGatewayMessage }>(
        `${TELEGRAM_GATEWAY_MESSAGES_BASE}/${id}`,
        {
          method: 'DELETE',
          body: JSON.stringify(reason ? { reason } : {}),
        },
      );
      return payload.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'messages'] });
    },
  });
}

export function useTelegramGatewayChannels() {
  return useQuery<TelegramGatewayChannel[]>({
    queryKey: ['telegram-gateway', 'channels'],
    queryFn: async () => {
      const payload = await fetchJson<{ success: boolean; data: TelegramGatewayChannel[] }>(
        `${TELEGRAM_GATEWAY_CHANNELS_BASE}`,
      );
      return payload.data ?? [];
    },
  });
}

export function useCreateTelegramGatewayChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      channelId: string | number;
      label?: string;
      description?: string;
      isActive?: boolean;
    }) => {
      const response = await fetchJson<{ success: boolean; data: TelegramGatewayChannel }>(
        `${TELEGRAM_GATEWAY_CHANNELS_BASE}`,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'channels'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway'] });
    },
  });
}

export function useUpdateTelegramGatewayChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      channelId?: string | number;
      label?: string;
      description?: string;
      isActive?: boolean;
    }) => {
      const response = await fetchJson<{ success: boolean; data: TelegramGatewayChannel }>(
        `${TELEGRAM_GATEWAY_CHANNELS_BASE}/${id}`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        },
      );
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'channels'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway'] });
    },
  });
}

export function useDeleteTelegramGatewayChannel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await fetchJson<{ success: boolean }>(`${TELEGRAM_GATEWAY_CHANNELS_BASE}/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'channels'] });
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway'] });
    },
  });
}

export function useTelegramGatewayAuthStatus(pollingMs = 2000) {
  return useQuery<TelegramGatewayAuthStatus>({
    queryKey: ['telegram-gateway', 'auth', 'status'],
    queryFn: async () => {
      const payload = await fetchJson<{ success: boolean; data: TelegramGatewayAuthStatus }>(
        `${TELEGRAM_GATEWAY_SERVICE_BASE}/auth/status`,
      );
      return payload.data;
    },
    refetchInterval: pollingMs,
  });
}

export function useTelegramGatewayAuthStart() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetchJson<{ success: boolean }>(`${TELEGRAM_GATEWAY_SERVICE_BASE}/auth/start`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'auth', 'status'] });
    },
  });
}

export function useTelegramGatewayAuthSubmit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: string) => {
      await fetchJson<{ success: boolean }>(`${TELEGRAM_GATEWAY_SERVICE_BASE}/auth/input`, {
        method: 'POST',
        body: JSON.stringify({ value }),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'auth', 'status'] });
    },
  });
}

export function useTelegramGatewayAuthCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetchJson<{ success: boolean }>(`${TELEGRAM_GATEWAY_SERVICE_BASE}/auth/cancel`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['telegram-gateway', 'auth', 'status'] });
    },
  });
}
