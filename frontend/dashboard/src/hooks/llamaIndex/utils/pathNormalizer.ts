/**
 * Path Normalization Utilities
 *
 * Centralized functions for normalizing file paths, URLs, and collection names
 * across the LlamaIndex components.
 *
 * @module pathNormalizer
 */

/**
 * Sanitizes a URL by removing trailing slashes and validating format
 *
 * @param value - The URL string to sanitize
 * @param fallback - Default value if input is invalid
 * @returns Sanitized URL or fallback
 *
 * @example
 * sanitizeUrl('http://localhost:8202/', 'http://default')
 * // Returns: 'http://localhost:8202'
 *
 * sanitizeUrl('  ', 'http://default')
 * // Returns: 'http://default'
 */
export function sanitizeUrl(
  value: string | undefined,
  fallback: string,
): string {
  if (!value || typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return fallback;
  }

  // Remove trailing slashes
  return trimmed.replace(/\/+$/, '') || fallback;
}

/**
 * Normalizes a collection name to lowercase and trims whitespace
 *
 * @param collectionName - The collection name to normalize
 * @param defaultValue - Default value if input is empty (default: 'documentation')
 * @returns Normalized collection name
 *
 * @example
 * normalizeCollectionName('  DOCS_INDEX  ')
 * // Returns: 'docs_index'
 *
 * normalizeCollectionName(null)
 * // Returns: 'documentation'
 */
export function normalizeCollectionName(
  collectionName: string | null | undefined,
  defaultValue = 'documentation',
): string {
  if (!collectionName || typeof collectionName !== 'string') {
    return defaultValue;
  }

  const normalized = collectionName.trim().toLowerCase();
  return normalized || defaultValue;
}

/**
 * Normalizes an indexed file path by extracting the relative path
 * and validating the extension.
 *
 * Handles various path formats:
 * - Absolute paths with /docs/ in the middle
 * - Paths starting with /data/docs/
 * - Relative paths
 * - Windows-style paths (backslashes)
 *
 * @param value - The file path to normalize
 * @returns Normalized path or null if invalid
 *
 * @example
 * normalizeIndexedPath('/data/docs/content/api/overview.md')
 * // Returns: 'content/api/overview.md'
 *
 * normalizeIndexedPath('C:\\project\\docs\\content\\guide.mdx')
 * // Returns: 'content/guide.mdx'
 *
 * normalizeIndexedPath('/docs/README.txt')
 * // Returns: null (invalid extension)
 */
export function normalizeIndexedPath(
  value: string | null | undefined,
): string | null {
  if (!value || typeof value !== 'string') {
    return null;
  }

  // Normalize Windows backslashes to forward slashes
  let normalized = value.replace(/\\/g, '/');

  // Extract path after last occurrence of /docs/
  const docsPos = normalized.lastIndexOf('/docs/');
  if (docsPos >= 0) {
    normalized = normalized.slice(docsPos + '/docs/'.length);
  }
  // Remove /data/docs/ prefix if present
  else if (normalized.startsWith('/data/docs/')) {
    normalized = normalized.slice('/data/docs/'.length);
  }
  // Remove leading slash
  else if (normalized.startsWith('/')) {
    normalized = normalized.slice(1);
  }

  // Validate extension (.md or .mdx only)
  const validExtensions = /\.(md|mdx)$/i;
  return validExtensions.test(normalized) ? normalized : null;
}

/**
 * Infers the embedding model from a collection name based on naming conventions
 *
 * Supported patterns:
 * - *gemma* → embeddinggemma:latest
 * - *mxbai* → mxbai-embed-large
 * - *nomic* → nomic-embed-text
 * - *e5* → intfloat/multilingual-e5-large
 * - *mini*lm* → all-minilm-l6-v2
 *
 * @param collectionName - The collection name to analyze
 * @returns Inferred model name or null if no pattern matches
 *
 * @example
 * inferModelFromName('docs_index_mxbai')
 * // Returns: 'mxbai-embed-large'
 *
 * inferModelFromName('repository_gemma')
 * // Returns: 'embeddinggemma:latest'
 */
export function inferModelFromName(
  collectionName: string | null | undefined,
): string | null {
  if (!collectionName || typeof collectionName !== 'string') {
    return null;
  }

  const lower = collectionName.toLowerCase();

  if (lower.includes('gemma')) {
    return 'embeddinggemma:latest';
  }
  if (lower.includes('mxbai')) {
    return 'mxbai-embed-large';
  }
  if (lower.includes('nomic')) {
    return 'nomic-embed-text';
  }
  if (lower.includes('e5')) {
    return 'intfloat/multilingual-e5-large';
  }
  if (lower.includes('mini') && lower.includes('lm')) {
    return 'all-minilm-l6-v2';
  }

  return null;
}

/**
 * Formats a number for display, returning a localized string or a fallback
 *
 * @param value - The number to format (or null/undefined)
 * @param fallback - String to return if value is not a number (default: '–')
 * @returns Formatted string
 *
 * @example
 * formatNumber(1234567)
 * // Returns: '1,234,567' (en-US locale)
 *
 * formatNumber(null)
 * // Returns: '–'
 */
export function formatNumber(
  value: number | null | undefined,
  fallback = '–',
): string {
  return typeof value === 'number' ? value.toLocaleString() : fallback;
}

/**
 * Formats bytes into human-readable file size
 *
 * @param bytes - The number of bytes
 * @returns Formatted string (e.g., "1.5 MB")
 *
 * @example
 * formatFileSize(1536)
 * // Returns: '1.5 KB'
 *
 * formatFileSize(2097152)
 * // Returns: '2.0 MB'
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';

  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
