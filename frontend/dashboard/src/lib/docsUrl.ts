import { apiConfig } from "../config/api";

/**
 * Normalize a documentation base URL so it can be safely concatenated with paths.
 * - Trims whitespace
 * - Removes trailing slashes
 * - Falls back to apiConfig.docsUrl when no base is provided
 */
export function normalizeDocsBase(base?: string): string {
  const trimmed = typeof base === "string" ? base.trim() : "";
  const candidate = trimmed || apiConfig.docsUrl;
  if (!candidate) {
    return "";
  }
  return candidate.replace(/\/+$/, "");
}

/**
 * Join a documentation base URL with a relative path, ensuring we do not double up on `/docs`.
 * Accepts absolute or relative paths and gracefully handles empty input.
 */
export function buildDocsUrl(path = "", base?: string): string {
  const normalizedBase = normalizeDocsBase(base);
  if (!path) {
    return normalizedBase;
  }

  const sanitizedPath = path
    .replace(/^\/+/, "")
    .replace(/\.mdx?$/, "")
    .replace(/\.html?$/, "");
  if (!normalizedBase) {
    return `/${sanitizedPath}`;
  }

  if (sanitizedPath.length === 0) {
    return normalizedBase;
  }

  if (
    normalizedBase.toLowerCase().endsWith("/docs") &&
    sanitizedPath.toLowerCase().startsWith("docs/")
  ) {
    return `${normalizedBase}/${sanitizedPath.slice(5)}`;
  }

  return `${normalizedBase}/${sanitizedPath}`;
}
