import { getApiUrl } from '../../../config/api';
import { SignalRow } from './types';
import { XCircle, AlertTriangle, Info, Bug } from 'lucide-react';

function resolveTpCapitalBase(): string {
  const API_BASE_URL = getApiUrl('tpCapital');
  const candidate = API_BASE_URL && API_BASE_URL.trim().length > 0 ? API_BASE_URL : '/api/tp-capital';
  if (/^https?:\/\//i.test(candidate)) {
    return candidate.replace(/\/$/, '');
  }
  return candidate.replace(/\/$/, '');
}

export function buildQuery(params: { limit: number; channel?: string; signalType?: string; search?: string }) {
  const base = resolveTpCapitalBase();
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(params.limit));
  if (params.channel && params.channel !== "all") {
    queryParams.set("channel", params.channel);
  }
  if (params.signalType && params.signalType !== "all") {
    queryParams.set("type", params.signalType);
  }
  if (params.search) {
    queryParams.set("search", params.search);
  }
  return `${base}/signals?${queryParams.toString()}`;
}

export function buildLogsQuery(limit: number, level?: string) {
  const base = resolveTpCapitalBase();
  const queryParams = new URLSearchParams();
  queryParams.set("limit", String(limit));
  if (level && level !== "all") {
    queryParams.set("level", level);
  }
  return `${base}/logs?${queryParams.toString()}`;
}

export function formatNumber(value: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "?";
  }
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTimestamp(ts: string) {
  if (!ts) return "?";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  return date.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatRelativeTime(ts: string): string {
  if (!ts) return "?";
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) {
    return ts;
  }
  
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSeconds < 10) return "agora mesmo";
  if (diffSeconds < 60) return `há ${diffSeconds}s`;
  if (diffMinutes < 60) return `há ${diffMinutes}min`;
  if (diffHours < 24) return `há ${diffHours}h`;
  if (diffDays === 1) return "ontem";
  if (diffDays < 7) return `há ${diffDays} dias`;
  
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function formatContext(context: unknown) {
  if (context === null || context === undefined) {
    return "-";
  }
  try {
    return JSON.stringify(context, null, 2);
  } catch (error) {
    return String(context);
  }
}

export function levelBadgeClass(level: string) {
  switch (level) {
    case "error":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300";
    case "warn":
      return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300";
    case "debug":
      return "bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300";
    default:
      return "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-300";
  }
}

export function getLevelIcon(level: string) {
  switch (level) {
    case "error":
      return XCircle;
    case "warn":
      return AlertTriangle;
    case "debug":
      return Bug;
    default:
      return Info;
  }
}

export function getLevelColor(level: string): string {
  switch (level) {
    case "error":
      return "bg-red-500 dark:bg-red-400";
    case "warn":
      return "bg-amber-500 dark:bg-amber-400";
    case "debug":
      return "bg-slate-400 dark:bg-slate-500";
    default:
      return "bg-emerald-500 dark:bg-emerald-400";
  }
}

export function downloadFile(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function toCsv(rows: SignalRow[]) {
  const headers = [
    "DATA",
    "CANAL",
    "TIPO",
    "ATIVO",
    "COMPRA_MIN",
    "COMPRA_MAX",
    "ALVO_1",
    "ALVO_2",
    "ALVO_FINAL",
    "STOP",
  ];
  const csvRows = rows.map((row) => [
    formatTimestamp(row.ts),
    row.channel,
    row.signal_type,
    row.asset,
    formatNumber(row.buy_min),
    formatNumber(row.buy_max),
    formatNumber(row.target_1),
    formatNumber(row.target_2),
    formatNumber(row.target_final),
    formatNumber(row.stop),
  ].join(";"));
  return [headers.join(";"), ...csvRows].join("\n");
}

