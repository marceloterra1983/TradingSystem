const API_BASE_URL = '/api/firecrawl';

export type ScrapeFormat =
  | 'markdown'
  | 'html'
  | 'rawHtml'
  | 'links'
  | 'screenshot'
  | 'screenshot@fullPage'
  | 'json';

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

export type CrawlJobStatus = 'scraping' | 'completed' | 'failed';

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
  status: 'ok' | 'error';
  error?: string;
}

async function parseJsonResponse<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch (error) {
    console.error('Failed to parse Firecrawl response JSON:', error);
    return null;
  }
}

function isBarePayload(payload: unknown): boolean {
  if (payload === null || typeof payload !== 'object') {
    return false;
  }

  const record = payload as Record<string, unknown>;
  return !('success' in record) && !('error' in record);
}

function resolveProxyUrlHint(): string | null {
  if (/^https?:\/\//i.test(API_BASE_URL)) {
    return API_BASE_URL.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location) {
    try {
      return new URL(API_BASE_URL, window.location.origin).toString().replace(/\/$/, '');
    } catch {
      return null;
    }
  }
  return null;
}

function formatProxyOfflineMessage(): string {
  const hint = resolveProxyUrlHint();
  if (hint) {
    return `Unable to reach the Firecrawl proxy at ${hint}. Start or verify the proxy service (default port 3600) before retrying.`;
  }
  return 'Unable to reach the configured Firecrawl proxy service. Ensure the proxy (default port 3600) is running and accessible.';
}

function normalizeFirecrawlError(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed')
  ) {
    return formatProxyOfflineMessage();
  }
  return message;
}

export const firecrawlService = {
  async scrape(options: ScrapeOptions): Promise<ScrapeResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<ScrapeResult>(response);
        const errorMessage = payload?.error || `HTTP error! status: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const payload = await parseJsonResponse<unknown>(response);
      if (!payload) {
        return { success: false, error: 'Invalid response from Firecrawl scrape endpoint' };
      }

      if (isBarePayload(payload)) {
        return {
          success: true,
          data: payload as ScrapeData
        };
      }

      const result = payload as ScrapeResult;

      return {
        success: result.success !== false,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('Error calling Firecrawl scrape endpoint:', error);
      const message = error instanceof Error ? error.message : 'Unknown scrape error';
      return { success: false, error: normalizeFirecrawlError(message) };
    }
  },

  async crawl(options: CrawlOptions): Promise<CrawlResult> {
    try {
      const response = await fetch(`${API_BASE_URL}/crawl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        const payload = await parseJsonResponse<CrawlResult>(response);
        const errorMessage = payload?.error || `HTTP error! status: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const payload = await parseJsonResponse<CrawlResult>(response);
      if (!payload) {
        return { success: false, error: 'Invalid response from Firecrawl crawl endpoint' };
      }

      return {
        success: payload.success !== false,
        data: payload.data,
        error: payload.error
      };
    } catch (error) {
      console.error('Error starting Firecrawl crawl job:', error);
      const message = error instanceof Error ? error.message : 'Unknown crawl error';
      return { success: false, error: normalizeFirecrawlError(message) };
    }
  },

  async getCrawlStatus(crawlId: string): Promise<CrawlStatus> {
    try {
      const response = await fetch(`${API_BASE_URL}/crawl/${encodeURIComponent(crawlId)}`);

      if (!response.ok) {
        const payload = await parseJsonResponse<CrawlStatus>(response);
        const errorMessage = payload?.error || `HTTP error! status: ${response.status}`;
        return { success: false, error: errorMessage };
      }

      const payload = await parseJsonResponse<unknown>(response);
      if (!payload) {
        return { success: false, error: 'Invalid response from Firecrawl crawl status endpoint' };
      }

      if (isBarePayload(payload)) {
        return {
          success: true,
          data: payload as CrawlStatusData
        };
      }

      const result = payload as CrawlStatus;

      return {
        success: result.success !== false,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('Error fetching Firecrawl crawl status:', error);
      const message = error instanceof Error ? error.message : 'Unknown crawl status error';
      return { success: false, error: normalizeFirecrawlError(message) };
    }
  },

  async healthCheck(): Promise<FirecrawlHealthResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (!response.ok) {
        return { status: 'error', error: `HTTP error! status: ${response.status}` };
      }
      return { status: 'ok' };
    } catch (error) {
      console.error('Error checking Firecrawl proxy health:', error);
      const message = error instanceof Error ? error.message : 'Unknown health check error';
      return { status: 'error', error: normalizeFirecrawlError(message) };
    }
  }
};
