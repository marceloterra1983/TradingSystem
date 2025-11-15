/**
 * Standardized HTTP Client
 *
 * Provides a centralized HTTP client with resilience patterns:
 * - Automatic retry with exponential backoff
 * - Circuit breaker for fail-fast behavior
 * - Request queuing to prevent connection exhaustion
 * - Operation-based timeout configuration
 * - Error normalization for user-friendly messages
 * - Structured logging and metrics
 *
 * Related: STD-020, ADR-008
 *
 * @example
 * ```typescript
 * const client = new HttpClient({
 *   baseURL: 'http://localhost:9082/api/workspace',
 *   enableCircuitBreaker: true,
 *   enableRetry: true,
 *   enableLogging: true,
 * });
 *
 * const items = await client.get('/items', {
 *   operationType: OperationType.STANDARD_READ,
 * });
 * ```
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosError,
} from "axios";
import axiosRetry, { exponentialDelay } from "axios-retry";
import { CircuitBreaker, CircuitState } from "./circuit-breaker";

// Extend Axios types to include metadata
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime?: number;
    };
  }
}

/**
 * Operation types for timeout and retry configuration
 */
export enum OperationType {
  HEALTH_CHECK = "health_check", // 5s
  QUICK_READ = "quick_read", // 10s
  STANDARD_READ = "standard_read", // 15s
  WRITE = "write", // 30s
  LONG_OPERATION = "long_operation", // 2min
  FILE_UPLOAD = "file_upload", // 5min
}

/**
 * Timeout configuration by operation type (milliseconds)
 */
const TIMEOUT_CONFIG: Record<OperationType, number> = {
  [OperationType.HEALTH_CHECK]: 5000,
  [OperationType.QUICK_READ]: 10000,
  [OperationType.STANDARD_READ]: 15000,
  [OperationType.WRITE]: 30000,
  [OperationType.LONG_OPERATION]: 120000,
  [OperationType.FILE_UPLOAD]: 300000,
};

/**
 * Retry attempts by operation type
 */
const RETRY_CONFIG: Record<OperationType, number> = {
  [OperationType.HEALTH_CHECK]: 2,
  [OperationType.QUICK_READ]: 3,
  [OperationType.STANDARD_READ]: 3,
  [OperationType.WRITE]: 2,
  [OperationType.LONG_OPERATION]: 1,
  [OperationType.FILE_UPLOAD]: 1,
};

/**
 * HTTP Client configuration
 */
export interface HttpClientConfig {
  /**
   * Base URL for all requests (via Traefik gateway)
   * @example 'http://localhost:9082/api/workspace'
   */
  baseURL: string;

  /**
   * Default timeout in milliseconds
   * @default 15000
   */
  defaultTimeout?: number;

  /**
   * Enable circuit breaker pattern
   * @default false
   */
  enableCircuitBreaker?: boolean;

  /**
   * Enable automatic retry
   * @default true
   */
  enableRetry?: boolean;

  /**
   * Enable structured logging
   * @default false (recommended: import.meta.env.DEV)
   */
  enableLogging?: boolean;

  /**
   * Maximum concurrent requests
   * @default 10
   */
  maxConcurrentRequests?: number;
}

/**
 * Extended Axios config with operation type
 */
export interface HttpRequestConfig extends AxiosRequestConfig {
  /**
   * Operation type for timeout/retry configuration
   * @default OperationType.STANDARD_READ
   */
  operationType?: OperationType;
}

/**
 * Standardized HTTP Client
 */
export class HttpClient {
  private client: AxiosInstance;
  private circuitBreaker?: CircuitBreaker;
  private activeRequests = 0;
  private maxConcurrentRequests: number;

  constructor(config: HttpClientConfig) {
    this.maxConcurrentRequests = config.maxConcurrentRequests || 10;

    // Create Axios instance
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.defaultTimeout || 15000,
      headers: {
        "Content-Type": "application/json",
        "X-Service-Token": import.meta.env.VITE_INTER_SERVICE_SECRET || "",
      },
    });

    // Setup retry
    if (config.enableRetry !== false) {
      this.setupRetry();
    }

    // Setup circuit breaker
    if (config.enableCircuitBreaker) {
      this.circuitBreaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeout: 30000,
        monitoringPeriod: 10000,
      });
    }

    // Setup interceptors
    this.setupInterceptors(config.enableLogging);
  }

  /**
   * Configure automatic retry with exponential backoff
   */
  private setupRetry() {
    axiosRetry(this.client, {
      retries: 3,
      retryDelay: exponentialDelay,
      retryCondition: (error: AxiosError) => {
        // Retry on network errors
        if (!error.response) {
          return true;
        }

        const status = error.response.status;
        // Retry on 5xx and 429
        return status >= 500 || status === 429;
      },
      onRetry: (retryCount, error, requestConfig) => {
        console.warn(
          `[HttpClient] Retry ${retryCount} for ${requestConfig.url}`,
          error.message,
        );
      },
    });
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(enableLogging?: boolean) {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: any) => {
        config.metadata = { startTime: Date.now() };

        if (enableLogging) {
          console.log(
            `[HttpClient] → ${config.method?.toUpperCase()} ${config.url}`,
          );
        }

        return config;
      },
      (error) => {
        console.error("[HttpClient] Request error:", error);
        return Promise.reject(error);
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        const duration =
          Date.now() - (response.config.metadata?.startTime || 0);

        if (enableLogging) {
          console.log(
            `[HttpClient] ← ${response.status} ${response.config.url} (${duration}ms)`,
          );
        }

        this.recordMetrics({
          url: response.config.url,
          method: response.config.method,
          status: response.status,
          duration,
        });

        return response;
      },
      (error: AxiosError) => {
        const duration =
          Date.now() - ((error.config as any)?.metadata?.startTime || 0);

        console.error(
          `[HttpClient] ✗ ${error.config?.url} (${duration}ms)`,
          error.message,
        );

        return Promise.reject(this.normalizeError(error));
      },
    );
  }

  /**
   * Normalize errors into user-friendly messages
   */
  private normalizeError(error: AxiosError): Error {
    if (!error.response) {
      return new Error(
        error.code === "ECONNABORTED"
          ? "Tempo limite de conexão excedido. Tente novamente."
          : "Erro de conexão. Verifique sua internet e tente novamente.",
      );
    }

    const status = error.response.status;
    const data = error.response.data as any;

    if (status >= 500) {
      return new Error(
        data?.message ||
          "Erro no servidor. Tente novamente em alguns instantes.",
      );
    }

    if (status === 429) {
      return new Error(
        "Muitas requisições. Aguarde um momento e tente novamente.",
      );
    }

    if (status === 401 || status === 403) {
      return new Error("Não autorizado. Verifique suas credenciais.");
    }

    if (status === 404) {
      return new Error("Recurso não encontrado.");
    }

    return new Error(data?.message || "Erro desconhecido.");
  }

  /**
   * Record metrics (can be exported to Prometheus)
   */
  private recordMetrics(metrics: {
    url?: string;
    method?: string;
    status: number;
    duration: number;
  }) {
    if (metrics.duration > 1000) {
      console.warn(
        `[HttpClient] Slow request: ${metrics.url} (${metrics.duration}ms)`,
      );
    }
  }

  /**
   * Wait for available request slot
   */
  private async waitForSlot(): Promise<void> {
    while (this.activeRequests >= this.maxConcurrentRequests) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Make HTTP request with all resilience patterns
   */
  async request<T = any>(config: HttpRequestConfig): Promise<T> {
    const operationType = config.operationType || OperationType.STANDARD_READ;
    const timeout = TIMEOUT_CONFIG[operationType];
    const retries = RETRY_CONFIG[operationType];

    // Wait for available slot
    await this.waitForSlot();
    this.activeRequests++;

    try {
      // Circuit breaker check
      if (this.circuitBreaker && !this.circuitBreaker.canRequest()) {
        throw new Error(
          "Serviço temporariamente indisponível (circuit breaker aberto)",
        );
      }

      const response = await this.client.request<T>({
        ...config,
        timeout,
        "axios-retry": {
          retries,
        },
      } as any);

      // Record success
      this.circuitBreaker?.recordSuccess();

      return response.data;
    } catch (error) {
      // Record failure
      this.circuitBreaker?.recordFailure();
      throw error;
    } finally {
      this.activeRequests--;
    }
  }

  /**
   * HTTP GET request
   */
  async get<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "GET", url });
  }

  /**
   * HTTP POST request
   */
  async post<T = any>(
    url: string,
    data?: any,
    config?: HttpRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "POST", url, data });
  }

  /**
   * HTTP PUT request
   */
  async put<T = any>(
    url: string,
    data?: any,
    config?: HttpRequestConfig,
  ): Promise<T> {
    return this.request<T>({ ...config, method: "PUT", url, data });
  }

  /**
   * HTTP DELETE request
   */
  async delete<T = any>(url: string, config?: HttpRequestConfig): Promise<T> {
    return this.request<T>({ ...config, method: "DELETE", url });
  }

  /**
   * Health check endpoint
   */
  async healthCheck(url: string = "/health"): Promise<boolean> {
    try {
      await this.get(url, { operationType: OperationType.HEALTH_CHECK });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get current circuit breaker state
   */
  getCircuitState(): CircuitState | undefined {
    return this.circuitBreaker?.getState();
  }

  /**
   * Get active request count
   */
  getActiveRequests(): number {
    return this.activeRequests;
  }
}
