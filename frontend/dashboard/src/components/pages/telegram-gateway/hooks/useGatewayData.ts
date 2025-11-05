/**
 * useGatewayData - Hook for fetching Telegram Gateway data
 * Extracted from TelegramGatewayFinal.tsx
 */

import { useState, useCallback } from 'react';
import type { GatewayData, Channel, TelegramMessage } from '../types';

const getGatewayToken = () => import.meta.env.VITE_GATEWAY_TOKEN || '';

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
  filterChannel = 'all',
  filterLimit = '50'
): UseGatewayDataReturn {
  const [data, setData] = useState<GatewayData | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<TelegramMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const GATEWAY_TOKEN = getGatewayToken();
      const headers = {
        'X-Gateway-Token': GATEWAY_TOKEN,
      };

      // Build messages URL with filters
      const limit = filterLimit === 'all' ? '10000' : (filterLimit || '50');
      let messagesUrl = `/api/messages?limit=${limit}&sort=desc`;
      if (filterChannel !== 'all') {
        messagesUrl = `/api/messages?channelId=${encodeURIComponent(filterChannel)}&limit=${limit}&sort=desc`;
      }

      const [overviewRes, channelsRes, messagesRes] = await Promise.all([
        fetch('/api/telegram-gateway/overview', { headers }),
        fetch('/api/channels', { headers }),
        fetch(messagesUrl, { headers }),
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
      const message = err instanceof Error ? err.message : 'Erro ao buscar dados';
      setError(message);
      console.error('Error fetching gateway data:', err);
    } finally {
      setLoading(false);
    }
  }, [filterChannel, filterLimit]);

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

