/**
 * Types for Telegram Gateway components
 * Extracted from TelegramGatewayFinal.tsx
 */

export interface GatewayHealth {
  status: string;
  telegram: string;
  uptime: number;
}

export interface GatewayMessages {
  total: number;
  recent: TelegramMessage[];
}

export interface GatewaySession {
  exists: boolean;
  path?: string;
  hash?: string;
  sizeBytes?: number;
  updatedAt?: string;
  ageMs?: number;
}

export interface GatewayData {
  health?: GatewayHealth;
  messages?: GatewayMessages;
  session?: GatewaySession;
}

export interface Channel {
  id: string;
  channelId: string;
  label?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface TelegramMessage {
  id: string;
  channelId: string;
  text?: string;
  date: string;
  media?: {
    type: string;
    url?: string;
  };
  sender?: {
    id: string;
    username?: string;
    firstName?: string;
  };
}

export interface MessageFilters {
  channel: string;
  dateFrom: string;
  dateTo: string;
  limit: string;
  searchTerm: string;
}

export type GatewayStatus = 'healthy' | 'unhealthy' | 'unknown';

