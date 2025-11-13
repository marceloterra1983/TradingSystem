/**
 * useGatewayData - Hook for fetching Telegram Gateway data
 * Extracted from TelegramGatewayFinal.tsx
 */

import { useState, useCallback } from "react";
import { TELEGRAM_GATEWAY_TOKEN } from "@/hooks/useTelegramGateway";
import {
  TELEGRAM_GATEWAY_SERVICE_BASE,
  TELEGRAM_GATEWAY_MESSAGES_API_URL,
  TELEGRAM_GATEWAY_CHANNELS_API_URL,
} from "../utils/constants";
import type { GatewayData, Channel, TelegramMessage } from "../types";

export interface UseGatewayDataReturn {
  data: GatewayData | null;
  channels: Channel[];
  messages: TelegramMessage[];
  loading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
  refetch: () => Promise<void>;
}

export function useGatewayData(
  filterChannel = "all",
  filterLimit = "50",
): UseGatewayDataReturn {
  const gatewayToken = TELEGRAM_GATEWAY_TOKEN;
  const [data, setData] = useState<GatewayData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const authHeaders = gatewayToken
        ? { "X-Gateway-Token": gatewayToken }
        : undefined;

      // Build messages URL with filters
      const limit = filterLimit === "all" ? "10000" : filterLimit || "50";
      const cacheBuster = Date.now();

      let messagesUrl = `${TELEGRAM_GATEWAY_MESSAGES_API_URL}?limit=${limit}&sort=desc&_=${cacheBuster}`;
      if (filterChannel !== "all") {
        messagesUrl = `${TELEGRAM_GATEWAY_MESSAGES_API_URL}?channelId=${encodeURIComponent(
          filterChannel,
        )}&limit=${limit}&sort=desc&_=${cacheBuster}`;
      }

      const fetchOptions = {
        headers: authHeaders,
        cache: "no-store" as RequestCache,
      };

      const [overviewRes, channelsRes, messagesRes] = await Promise.all([
        fetch(
          `${TELEGRAM_GATEWAY_SERVICE_BASE}/overview?_=${cacheBuster}`,
          fetchOptions,
        ),
        fetch(
          `${TELEGRAM_GATEWAY_CHANNELS_API_URL}?_=${cacheBuster}`,
          fetchOptions,
        ),
        fetch(messagesUrl, fetchOptions),
      ]);

      if (overviewRes.ok) {
        const json = await overviewRes.json();
        setData(json.data);
      }

      if (channelsRes.ok) {
        const json = await channelsRes.json();
        setChannels(json.data || []);
      }

      if (messagesRes.ok) {
        const json = await messagesRes.json();
        setMessages(json.data || []);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Erro ao buscar dados";
      setError(message);
      console.error("Error fetching gateway data:", err);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterLimit, gatewayToken]);

  return {
    data,
    channels,
    messages,
    loading,
    error,
    fetchData,
    refetch: fetchData,
  };
}
