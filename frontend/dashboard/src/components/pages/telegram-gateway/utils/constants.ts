/**
 * Constants for Telegram Gateway components
 * Extracted from TelegramGatewayFinal.tsx
 */

// CSS Classes
export const surfaceCardClass =
  "rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/60";

export const statusLabelClass =
  "text-sm font-medium text-slate-600 dark:text-slate-300";

export const statusValueClass =
  "text-2xl font-bold text-slate-900 dark:text-slate-100";

export const statusMutedTextClass =
  "text-xs text-slate-500 dark:text-slate-400";

// API Configuration
export const DEFAULT_POLLING_INTERVAL = 10000; // 10 seconds
export const DEFAULT_MESSAGE_LIMIT = 50;
export const DEFAULT_FILTER_CHANNEL = "all";

// API endpoints shared with hooks
export {
  TELEGRAM_GATEWAY_SERVICE_BASE,
  TELEGRAM_GATEWAY_MESSAGES_BASE as TELEGRAM_GATEWAY_MESSAGES_API_URL,
  TELEGRAM_GATEWAY_CHANNELS_BASE as TELEGRAM_GATEWAY_CHANNELS_API_URL,
} from "@/hooks/useTelegramGateway";

// Gateway Token (from environment)
export const getGatewayToken = () => {
  return import.meta.env.VITE_GATEWAY_TOKEN || "";
};
