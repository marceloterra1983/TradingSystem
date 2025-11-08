import { apiConfig } from "../config/api";

interface DocsUrlOptions {
  absolute?: boolean;
  trailingSlash?: boolean;
}

const HTTP_REGEX = /^https?:\/\//i;

function pickFirstNonEmpty(
  ...values: Array<string | undefined>
): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim() !== "") {
      return value.trim();
    }
  }
  return undefined;
}

function ensureLeadingSlash(value: string): string {
  if (!value.startsWith("/")) {
    return `/${value}`;
  }
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") && value.length > 1
    ? value.replace(/\/+$/, "")
    : value;
}

function resolveRawBase(): string {
  const raw = pickFirstNonEmpty(
    import.meta.env.VITE_DOCS_BASE_URL as string | undefined,
    import.meta.env.VITE_DOCUSAURUS_PROXY_TARGET as string | undefined,
    import.meta.env.VITE_DOCUSAURUS_URL as string | undefined,
    apiConfig.docsUrl,
  );
  if (!raw) {
    return "/docs";
  }
  return raw;
}

export function resolveDocsBase(options: DocsUrlOptions = {}): string {
  const rawBase = resolveRawBase();
  if (HTTP_REGEX.test(rawBase)) {
    return trimTrailingSlash(rawBase);
  }
  const normalized = trimTrailingSlash(ensureLeadingSlash(rawBase));
  if (options.absolute && typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/+$/, "")}${normalized}`;
  }
  return normalized;
}

export function buildDocsUrl(path = "/", options: DocsUrlOptions = {}): string {
  const base = resolveDocsBase({ absolute: options.absolute });
  const normalizedPath = path ? (path.startsWith("/") ? path : `/${path}`) : "";
  const isVersionedPath =
    /^\/(next|current|version-[^/]+|\d+\.\d+\.\d+)(\/|$)/.test(normalizedPath);

  let result: string;
  if (isVersionedPath) {
    if (options.absolute && typeof window !== "undefined") {
      const origin = window.location.origin.replace(/\/+$/, "");
      result = `${origin}${normalizedPath}`;
    } else {
      result = normalizedPath;
    }
  } else if (HTTP_REGEX.test(base)) {
    result = `${trimTrailingSlash(base)}${normalizedPath}`;
  } else if (options.absolute && typeof window !== "undefined") {
    const origin = window.location.origin.replace(/\/+$/, "");
    result = `${origin}${trimTrailingSlash(base)}${normalizedPath}`;
  } else {
    result = `${trimTrailingSlash(base)}${normalizedPath}`;
  }

  if (options.trailingSlash && !result.endsWith("/")) {
    return `${result}/`;
  }
  return result;
}

export function resolveDocsVersionRoot(
  version = "next",
  options: DocsUrlOptions = {},
): string {
  const normalizedVersion = version.replace(/^\/+|\/+$/g, "");
  return buildDocsUrl(`/${normalizedVersion}`, {
    ...options,
    trailingSlash: options.trailingSlash ?? true,
  });
}

export function normalizeDocsApiPath(rawUrl: string, version = "next"): string {
  if (!rawUrl) {
    return `/${version}`;
  }

  const cleaned = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  if (cleaned.startsWith(`/${version}`)) {
    return cleaned;
  }
  if (cleaned.startsWith("/docs/")) {
    return cleaned.replace(/^\/docs/, `/${version}`);
  }
  return cleaned;
}

export function resolveDocsPreviewUrl(
  rawUrl: string,
  version = "next",
  options: DocsUrlOptions = {},
): string {
  const normalizedPath = normalizeDocsApiPath(rawUrl, version);
  // Ensure trailing slash for Docusaurus URLs (except root)
  const pathWithSlash =
    normalizedPath !== `/${version}` && !normalizedPath.endsWith("/")
      ? `${normalizedPath}/`
      : normalizedPath;
  if (options.absolute && typeof window !== "undefined") {
    return `${window.location.origin.replace(/\/+$/, "")}${pathWithSlash}`;
  }
  return buildDocsUrl(pathWithSlash, {
    ...options,
    trailingSlash: options.trailingSlash ?? true,
  });
}
