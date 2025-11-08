import { getApiUrl } from "../config/api";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");
const trimLeadingSlash = (value: string) => value.replace(/^\/+/, "");

const sanitizeCandidate = (raw?: string | null): string | null => {
  if (!raw) {
    return null;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  // Remove trailing segments that point directly to resources (e.g., /items)
  const withoutResource = trimmed.replace(/\/(items|categories)(\/)?$/i, "");
  return withoutResource || null;
};

const buildFallbackCandidates = (): Array<string | null> => {
  const baseFromEnv = import.meta.env.VITE_WORKSPACE_API_URL;
  const proxyTarget = import.meta.env.VITE_WORKSPACE_PROXY_TARGET;
  const apiBase = import.meta.env.VITE_API_BASE_URL
    ? `${trimTrailingSlash(import.meta.env.VITE_API_BASE_URL)}/api/workspace`
    : null;

  return [
    // Prefer relative paths (use Vite proxy) over absolute URLs
    baseFromEnv && baseFromEnv.startsWith("/") ? baseFromEnv : null,
    proxyTarget && proxyTarget.startsWith("/") ? proxyTarget : null,
    "/api/workspace", // Default: use Vite proxy
    getApiUrl("library"),
    apiBase,
    // Only use absolute URLs as last resort
    baseFromEnv && !baseFromEnv.startsWith("/") ? baseFromEnv : null,
    proxyTarget && !proxyTarget.startsWith("/") ? proxyTarget : null,
  ];
};

const resolvedWorkspaceBase =
  buildFallbackCandidates()
    .map(sanitizeCandidate)
    .find((candidate): candidate is string => Boolean(candidate)) ||
  "/api/workspace";

const joinUrl = (base: string, path?: string) => {
  if (!path) {
    return trimTrailingSlash(base);
  }

  if (path.startsWith("?")) {
    return `${trimTrailingSlash(base)}${path}`;
  }

  const normalizedBase = trimTrailingSlash(base);
  const normalizedPath = trimLeadingSlash(path);
  return normalizedPath
    ? `${normalizedBase}/${normalizedPath}`
    : normalizedBase;
};

const createResourceBuilder = (resource: string) => {
  const resourceBase = joinUrl(resolvedWorkspaceBase, resource);
  return (suffix = "") => joinUrl(resourceBase, suffix);
};

export const WORKSPACE_API_BASE_URL = resolvedWorkspaceBase;
export const workspaceItemsEndpoint = createResourceBuilder("items");
export const workspaceCategoriesEndpoint = createResourceBuilder("categories");
