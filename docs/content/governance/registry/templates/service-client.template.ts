/**
 * Service Client Template
 * 
 * Use this template to create standardized service clients
 * that comply with STD-020: HTTP Client Standard
 */

import { HttpClient } from '@/lib/http-client';
import { CircuitBreaker } from '@/lib/circuit-breaker';

export interface ServiceConfig {
  baseUrl: string;
  timeout?: number;
  maxRetries?: number;
}

export class ServiceClient {
  private client: HttpClient;
  private breaker: CircuitBreaker;

  constructor(config: ServiceConfig) {
    // Initialize HTTP client with circuit breaker
    this.client = new HttpClient({
      baseURL: config.baseUrl,
      timeout: config.timeout || 30000,
      maxRetries: config.maxRetries || 3,
    });

    this.breaker = new CircuitBreaker({
      failureThreshold: 5,
      resetTimeout: 60000,
    });
  }

  /**
   * Example GET request
   */
  async getData<T>(endpoint: string): Promise<T> {
    return this.breaker.execute(() =>
      this.client.get<T>(endpoint)
    );
  }

  /**
   * Example POST request
   */
  async postData<T>(endpoint: string, data: unknown): Promise<T> {
    return this.breaker.execute(() =>
      this.client.post<T>(endpoint, data)
    );
  }

  /**
   * Health check
   */
  async health(): Promise<{ status: string }> {
    return this.client.get<{ status: string }>('/health');
  }
}

// Usage example:
// const client = new ServiceClient({ baseUrl: '/api/workspace' });
// const data = await client.getData('/items');
