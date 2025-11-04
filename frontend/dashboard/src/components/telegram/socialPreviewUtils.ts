/**
 * Shared utilities for social media preview components
 * Eliminates duplication across TwitterPreview, YouTubePreview, InstagramPreview
 */

/**
 * Format large numbers with K/M suffix
 * @param value - Number to format
 * @returns Formatted string (e.g., "1.2K", "3.5M")
 */
export function formatMetric(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Format ISO date string to Brazilian format
 * @param isoString - ISO 8601 date string
 * @returns Formatted date string (DD/MM/YYYY, HH:MM)
 */
export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

/**
 * Generate fallback avatar URL for users without profile images
 * @param name - User name
 * @param backgroundColor - Hex color without #
 * @returns Avatar URL from ui-avatars.com
 */
export function generateFallbackAvatar(name: string, backgroundColor = '3b82f6'): string {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${backgroundColor}&color=fff&size=48`;
}

/**
 * Shared Tailwind classes for social media previews
 */
export const PREVIEW_CLASSES = {
  container: 'mt-4 border border-slate-700 rounded-lg overflow-hidden bg-slate-800/50 transition-colors',
  containerHover: (color: string) => `hover:border-${color}-500`,
  header: 'p-3 flex items-start gap-3',
  avatar: 'w-12 h-12 rounded-full flex-shrink-0',
  authorName: 'font-semibold text-white truncate',
  authorUsername: 'text-sm text-slate-400',
  content: 'px-3 pb-3',
  text: 'text-white whitespace-pre-wrap break-words',
  thumbnail: 'rounded-lg w-full max-h-96 object-cover',
  externalLink: 'text-slate-400 transition-colors flex-shrink-0',
  metrics: 'px-3 pb-3 flex gap-6 text-sm text-slate-400',
  metric: 'flex items-center gap-1 transition-colors',
  timestamp: 'px-3 pb-3 text-xs text-slate-500',
  fallbackImage: 'w-full h-48 object-cover',
  fallbackContainer: 'p-3',
  fallbackTitle: 'font-semibold text-white mb-1 line-clamp-2',
  fallbackDescription: 'text-sm text-slate-400 line-clamp-3'
};

/**
 * Common icon sizes
 */
export const ICON_SIZES = {
  small: 'w-4 h-4',
  medium: 'w-5 h-5',
  large: 'w-10 h-10',
  xlarge: 'w-16 h-16'
};

