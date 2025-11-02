/**
 * TP-Capital Service
 * Handles all HTTP requests to the TP-Capital API
 */

import { getApiUrl } from '../config/api';

const API_BASE_URL = getApiUrl('tpCapital');

export interface TPSignal {
  ts: string;
  channel: string;
  signal_type: string;
  asset: string;
  buy_min: number | null;
  buy_max: number | null;
  target_1: number | null;
  target_2: number | null;
  target_final: number | null;
  stop: number | null;
  raw_message: string;
  source: string;
  ingested_at: string;
}

export interface TelegramBot {
  id: string;
  username: string;
  token: string;
  bot_type: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface TelegramChannel {
  id: string;
  label: string;
  channel_id: number;
  channel_type: string;
  description: string;
  status: string;
  signal_count: number;
  last_signal: string;
  created_at: string;
  updated_at: string;
}

export const tpCapitalService = {
  /**
   * Get signals with optional filters
   */
  async getSignals(params?: {
    limit?: number;
    channel?: string;
    signalType?: string;
    fromTs?: number;
    toTs?: number;
  }): Promise<TPSignal[]> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) queryParams.append('limit', params.limit.toString());
      if (params?.channel) queryParams.append('channel', params.channel);
      if (params?.signalType) queryParams.append('type', params.signalType);
      if (params?.fromTs) queryParams.append('from', params.fromTs.toString());
      if (params?.toTs) queryParams.append('to', params.toTs.toString());

      const url = `${API_BASE_URL}/signals${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching TP Capital signals:', error);
      return [];
    }
  },

  /**
   * Get telegram bots from QuestDB
   */
  async getBots(): Promise<TelegramBot[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/bots`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching telegram bots:', error);
      return [];
    }
  },

  /**
   * Get telegram channels from QuestDB
   */
  async getChannels(): Promise<TelegramChannel[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/telegram/channels`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const json = await response.json();
      return json.data || [];
    } catch (error) {
      console.error('Error fetching telegram channels:', error);
      return [];
    }
  },

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; questdb: boolean }> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error checking TP Capital API health:', error);
      return { status: 'error', questdb: false };
    }
  },
};
