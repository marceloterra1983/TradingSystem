import type { ExportFormat, ExportType, JobFilters } from '../types';

const SIZE_SUFFIXES = ['Bytes', 'KB', 'MB', 'GB', 'TB'] as const;

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) {
    return '0 Bytes';
  }
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    SIZE_SUFFIXES.length - 1
  );
  const value = bytes / Math.pow(1024, index);
  return `${value.toFixed(value < 10 && index > 0 ? 1 : 0)} ${SIZE_SUFFIXES[index]}`;
}

export function estimateFileSize(rowCount: number, format: ExportFormat): number {
  const bytesPerRow: Record<ExportFormat, number> = {
    csv: 500,
    json: 800,
    parquet: 200
  };
  return rowCount * (bytesPerRow[format] ?? 500);
}

export function formatExpiration(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return 'Expired';
  }

  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 60) {
    return `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remainder = minutes - hours * 60;
    return `Expires in ${hours}h ${remainder}m`;
  }
  const days = Math.floor(hours / 24);
  return `Expires in ${days} day${days === 1 ? '' : 's'}`;
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

export function formatFiltersSummary(filters?: JobFilters | null): string {
  if (!filters) {
    return 'No filters applied';
  }
  const parts: string[] = [];
  if (filters.status) {
    parts.push(`Status: ${filters.status}`);
  }
  if (filters.type) {
    parts.push(`Type: ${filters.type}`);
  }
  if (filters.templateId) {
    parts.push(`Template: ${filters.templateId}`);
  }
  if (filters.url) {
    parts.push(`URL contains "${filters.url}"`);
  }
  if (filters.dateFrom) {
    parts.push(`From ${new Date(filters.dateFrom).toLocaleDateString()}`);
  }
  if (filters.dateTo) {
    parts.push(`To ${new Date(filters.dateTo).toLocaleDateString()}`);
  }
  return parts.length ? parts.join(', ') : 'No filters applied';
}

export function getExportTypeLabel(type: ExportType): string {
  switch (type) {
    case 'templates':
      return 'Templates';
    case 'schedules':
      return 'Schedules';
    case 'results':
      return 'Results';
    case 'jobs':
    default:
      return 'Scraping Jobs';
  }
}

export function getFormatIcon(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'FileSpreadsheet';
    case 'json':
      return 'FileJson';
    case 'parquet':
    default:
      return 'Database';
  }
}
