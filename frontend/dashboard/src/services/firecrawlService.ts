import { getApiUrl } from "../config/api";

const API_BASE_URL = getApiUrl("firecrawlProxy").replace(/\/$/, "");
const API_V1_BASE_URL = `${API_BASE_URL}/api/v1`;

export type ScrapeFormat =
  | "markdown"
  | "html"
  | "rawHtml"
  | "links"
  | "screenshot"
  | "screenshot@fullPage"
  | "json";

export interface ScrapeOptions {
  url: string;
  formats?: ScrapeFormat[];
  onlyMainContent?: boolean;
  waitFor?: number;
  timeout?: number;
  includeTags?: string[];
  excludeTags?: string[];
}

export interface ScrapeData {
  markdown?: string;
  html?: string;
  rawHtml?: string;
  links?: string[];
  screenshot?: string;
  metadata?: Record<string, unknown>;
}

export interface ScrapeResult {
  success: boolean;
  data?: ScrapeData;
  error?: string;
}

export interface CrawlOptions {
  url: string;
  limit?: number;
  maxDepth?: number;
  excludePaths?: string[];
  includePaths?: string[];
  scrapeOptions?: Partial<ScrapeOptions>;
  allowBackwardLinks?: boolean;
  allowExternalLinks?: boolean;
}

export interface CrawlResultData {
  id: string;
  url: string;
}

export interface CrawlResult {
  success: boolean;
  data?: CrawlResultData;
  error?: string;
}

export type CrawlJobStatus = "scraping" | "completed" | "failed";

export interface CrawlStatusItem {
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  rawHtml?: string;
  metadata?: Record<string, unknown>;
}

export interface CrawlStatusData {
  status: CrawlJobStatus;
  total?: number;
  completed?: number;
  creditsUsed?: number;
  expiresAt?: string;
  data?: CrawlStatusItem[];
  next?: string;
}

export interface CrawlStatus {
  success: boolean;
  data?: CrawlStatusData;
  error?: string;
}

export interface FirecrawlHealthResponse {
  status: "ok" | "error";
  error?: string;
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    console.error("Failed to parse Firecrawl response JSON:", error);
    return null;
  }
}

function isBarePayload(payload: unknown): boolean {
  if (payload === null || typeof payload !== "object") {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return !("success" in record) && !("error" in record);
}

function formatProxyOfflineMessage(): string {
  try {
    const url = new URL(API_BASE_URL);
    const hint = `${url.origin}${url.pathname === "/" ? "" : url.pathname}`;
    return `Unable to reach the Firecrawl proxy at ${hint}. Start or verify the proxy service (default port 3600) before retrying.`;
  } catch {
    return "Unable to reach the configured Firecrawl proxy service. Ensure the proxy (default port 3600) is running and accessible.";
  }
}

function normalizeFirecrawlError(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes("failed to fetch") ||
    normalized.includes("networkerror") ||
    normalized.includes("network request failed") ||
    normalized.includes("load failed")
  ) {
    return formatProxyOfflineMessage();
  }
  return message;
}

/**
 * High-level client for interacting with the Firecrawl proxy.
 *
 * Provides helpers to start scrape/crawl jobs, query their status and run
 * health checks. Every method normaliza mensagens de erro para o dashboard.
 */
export const firecrawlService = {
  /**
   * Executa uma operação de scrape de página única.
   *
   * @param options - Configurações do scrape (URL, formatos, filtros, timeouts).
   * @returns Resultado padronizado contendo dados ou mensagem de erro.
   */
  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${API_V1_BASE_URL}/scrape`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: options.url,
          formats: options.formats,
          onlyMainContent: options.onlyMainContent,
          waitFor: options.waitFor,
          timeout: options.timeout,
          includeTags: options.includeTags,
          excludeTags: options.excludeTags,
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<ScrapeResult>(response);
        const errorMessage =
          payload?.error || `HTTP error! status: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const payload = await parseJsonResponse<unknown>(response);
      if (!payload) {
        return {
          success: false,
          error: "Invalid response from Firecrawl scrape endpoint",
        };
      }

      if (isBarePayload(payload)) {
        return {
          success: true,
          data: payload as ScrapeData,
        };
      }

      const result = payload as ScrapeResult;

      return {
        success: result.success !== false,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error("Error calling Firecrawl scrape endpoint:", error);
      const message =
        error instanceof Error ? error.message : "Unknown scrape error";
      return { success: false, error: normalizeFirecrawlError(message) };
    }
  },

  /**
   * Inicia um job de crawl multi-páginas no Firecrawl.
   *
   * @param options - Configurações do crawl (limites, profundidade, filtros).
   * @returns Resultado com ID do job ou mensagem de erro.
   */
  async crawl(options: CrawlOptions): Promise<CrawlResult> {
    try {
      const response = await fetch(`${API_V1_BASE_URL}/crawl`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: options.url,
          limit: options.limit,
          maxDepth: options.maxDepth,
          excludePaths: options.excludePaths,
          includePaths: options.includePaths,
          scrapeOptions: options.scrapeOptions,
          allowBackwardLinks: options.allowBackwardLinks,
          allowExternalLinks: options.allowExternalLinks,
        }),
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<CrawlResult>(response);
        const errorMessage =
          payload?.error || `HTTP error! status: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const payload = await parseJsonResponse<CrawlResult>(response);
      if (!payload) {
        return {
          success: false,
          error: "Invalid response from Firecrawl crawl endpoint",
        };
      }

      return {
        success: payload.success !== false,
        data: payload.data,
        error: payload.error,
      };
    } catch (error) {
      console.error("Error starting Firecrawl crawl job:", error);
      const message =
        error instanceof Error ? error.message : "Unknown crawl error";
      return { success: false, error: normalizeFirecrawlError(message) };
    }
  },

  /**
   * Consulta o status atual de um job de crawl.
   *
   * @param crawlId - Identificador retornado por {@link crawl}.
   * @returns Status detalhado contendo progresso e dados coletados.
   */
  async getCrawlStatus(crawlId: string): Promise<CrawlStatus> {
    try {
      const response = await fetch(
        `${API_V1_BASE_URL}/crawl/${encodeURIComponent(crawlId)}`,
      );

      if (!response.ok) {
        const payload = await parseJsonResponse<CrawlStatus>(response);
        const errorMessage =
          payload?.error || `HTTP error! status: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const payload = await parseJsonResponse<unknown>(response);
      if (!payload) {
        return {
          success: false,
          error: "Invalid response from Firecrawl crawl status endpoint",
        };
      }

      if (isBarePayload(payload)) {
        return {
          success: true,
          data: payload as CrawlStatusData,
        };
      }

      const result = payload as CrawlStatus;

      return {
        success: result.success !== false,
        data: result.data,
        error: result.error,
      };
    } catch (error) {
      console.error("Error fetching Firecrawl crawl status:", error);
      const message =
        error instanceof Error ? error.message : "Unknown crawl status error";
      return { success: false, error: normalizeFirecrawlError(message) };
    }
  },

  /**
   * Verifica a saúde do proxy Firecrawl configurado.
   *
   * @returns Resposta simplificada (`ok` ou detalhes do erro).
   */
  async healthCheck(): Promise<FirecrawlHealthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        return {
          status: "error",
          error: `HTTP error! status: ${response.status}`,
        };
      }
      return { status: "ok" };
    } catch (error) {
      console.error("Error checking Firecrawl proxy health:", error);
      const message =
        error instanceof Error ? error.message : "Unknown health check error";
      return { status: "error", error: normalizeFirecrawlError(message) };
    }
  },
};
