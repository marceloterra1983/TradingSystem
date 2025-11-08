/**
 * TP Capital API Helper
 *
 * Provides authenticated fetch wrapper for TP Capital API calls
 * Automatically includes X-API-Key header
 */

import { getApiUrl } from "../config/api";

/**
 * Get TP Capital API Key from environment
 */
const getApiKey = (): string | undefined => {
  return import.meta.env.VITE_TP_CAPITAL_API_KEY;
};

/**
 * Authenticated fetch for TP Capital API
 *
 * @param endpoint - API endpoint (e.g., '/signals', '/sync-messages')
 * @param options - Fetch options
 * @returns Fetch response
 */
export async function tpCapitalFetch(
  endpoint: string,
  options: RequestInit = {},
): Promise<Response> {
  const baseUrl = getApiUrl("tpCapital");
  const apiKey = getApiKey();

  // Prepare headers
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");

  // Add API Key if available
  if (apiKey) {
    headers.set("X-API-Key", apiKey);
  } else {
    console.warn(
      "[TP Capital] VITE_TP_CAPITAL_API_KEY not configured - requests may fail on protected endpoints",
    );
  }

  // Build full URL
  const url = `${baseUrl}${endpoint}`;

  // Execute fetch with auth headers
  const response = await fetch(url, {
    ...options,
    headers,
  });

  return response;
}

/**
 * Convenience methods for common HTTP verbs
 */
export const tpCapitalApi = {
  /**
   * GET request
   */
  get: async (endpoint: string, options: RequestInit = {}) => {
    return tpCapitalFetch(endpoint, {
      ...options,
      method: "GET",
    });
  },

  /**
   * POST request
   */
  post: async (endpoint: string, body?: unknown, options: RequestInit = {}) => {
    return tpCapitalFetch(endpoint, {
      ...options,
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * PUT request
   */
  put: async (endpoint: string, body?: unknown, options: RequestInit = {}) => {
    return tpCapitalFetch(endpoint, {
      ...options,
      method: "PUT",
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  /**
   * DELETE request
   */
  delete: async (
    endpoint: string,
    body?: unknown,
    options: RequestInit = {},
  ) => {
    return tpCapitalFetch(endpoint, {
      ...options,
      method: "DELETE",
      body: body ? JSON.stringify(body) : undefined,
    });
  },
};

/**
 * Type-safe API methods for TP Capital
 */

// Signals
export interface Signal {
  id: number;
  ts: number;
  channel: string;
  signal_type: string;
  asset: string;
  buy_min: number;
  buy_max: number;
  target_1?: number;
  target_2?: number;
  target_final?: number;
  stop?: number;
  raw_message: string;
  source: string;
  ingested_at: string;
  created_at: string;
  updated_at: string;
}

export interface GetSignalsParams {
  limit?: number;
  channel?: string;
  type?: string;
  search?: string;
  from?: number | string;
  to?: number | string;
}

export async function getSignals(
  params: GetSignalsParams = {},
): Promise<Signal[]> {
  const queryParams = new URLSearchParams();

  if (params.limit) queryParams.set("limit", String(params.limit));
  if (params.channel) queryParams.set("channel", params.channel);
  if (params.type) queryParams.set("type", params.type);
  if (params.search) queryParams.set("search", params.search);
  if (params.from) queryParams.set("from", String(params.from));
  if (params.to) queryParams.set("to", String(params.to));

  const query = queryParams.toString();
  const endpoint = query ? `/signals?${query}` : "/signals";

  const response = await tpCapitalApi.get(endpoint);

  if (!response.ok) {
    throw new Error(`Failed to fetch signals: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function deleteSignal(ingestedAt: string): Promise<void> {
  const response = await tpCapitalApi.delete("/signals", { ingestedAt });

  if (!response.ok) {
    throw new Error(`Failed to delete signal: ${response.statusText}`);
  }
}

export async function syncMessages(): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await tpCapitalApi.post("/sync-messages");

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `Sync failed: ${response.statusText}`);
  }

  return response.json();
}

// Channels
export interface TelegramChannel {
  id: string;
  label: string;
  channel_id: string;
  channel_type: "source" | "destination";
  description?: string;
  status: "active" | "inactive" | "deleted";
  signal_count?: number;
  last_signal?: string;
  created_at: string;
  updated_at: string;
}

export async function getTelegramChannels(): Promise<TelegramChannel[]> {
  const response = await tpCapitalApi.get("/telegram-channels");

  if (!response.ok) {
    throw new Error(`Failed to fetch channels: ${response.statusText}`);
  }

  const data = await response.json();
  return data.data || [];
}

export async function createTelegramChannel(
  channel: Omit<TelegramChannel, "id" | "status" | "created_at" | "updated_at">,
): Promise<TelegramChannel> {
  const response = await tpCapitalApi.post("/telegram-channels", channel);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error || `Failed to create channel: ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.channel;
}

export async function updateTelegramChannel(
  id: string,
  updates: Partial<TelegramChannel>,
): Promise<void> {
  const response = await tpCapitalApi.put(`/telegram-channels/${id}`, updates);

  if (!response.ok) {
    throw new Error(`Failed to update channel: ${response.statusText}`);
  }
}

export async function deleteTelegramChannel(id: string): Promise<void> {
  const response = await tpCapitalApi.delete(`/telegram-channels/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to delete channel: ${response.statusText}`);
  }
}

export async function reloadChannels(): Promise<void> {
  const response = await tpCapitalApi.post("/reload-channels");

  if (!response.ok) {
    throw new Error(`Failed to reload channels: ${response.statusText}`);
  }
}
