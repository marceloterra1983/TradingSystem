/**
 * RAG Proxy Service
 * Handles communication with upstream LlamaIndex query service
 *
 * @module backend/api/documentation-api/src/services/RagProxyService
 */

import fetch from 'node-fetch';
import { createBearer } from '../../../../shared/auth/jwt.js';
import {
  ServiceUnavailableError,
  ExternalServiceError,
  ValidationError
} from '../middleware/errorHandler.js';

/**
 * RAG Proxy Service
 * Manages queries and searches through the LlamaIndex service
 */
export class RagProxyService {
  constructor(config = {}) {
    this.queryBaseUrl = (config.queryBaseUrl || process.env.LLAMAINDEX_QUERY_URL || 'http://localhost:8202').replace(/\/+$/, '');
    this.jwtSecret = config.jwtSecret || process.env.JWT_SECRET_KEY || 'dev-secret';
    this.timeout = config.timeout || 30000; // 30 seconds default
  }

  /**
   * Create Bearer token for authentication
   * @private
   */
  _getBearerToken() {
    return createBearer({ sub: 'dashboard' }, this.jwtSecret);
  }

  /**
   * Make upstream request with authentication
   * @private
   */
  async _makeRequest(url, options = {}) {
    try {
      const headers = {
        ...options.headers,
        Authorization: this._getBearerToken(),
      };

      const response = await fetch(url, {
        ...options,
        headers,
        timeout: options.timeout || this.timeout,
      });

      const text = await response.text();

      return {
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') || 'application/json',
        body: text,
        data: text ? this._parseJson(text) : null,
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
        throw new ServiceUnavailableError('LlamaIndex query service', {
          reason: 'Request timeout',
          timeout: this.timeout,
        });
      }
      throw new ExternalServiceError('LlamaIndex query service', error);
    }
  }

  /**
   * Safely parse JSON
   * @private
   */
  _parseJson(text) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  /**
   * Validate query parameters
   * @private
   */
  _validateQuery(query) {
    if (!query || typeof query !== 'string') {
      throw new ValidationError('Query must be a non-empty string');
    }

    const trimmed = query.trim();
    if (trimmed.length === 0) {
      throw new ValidationError('Query cannot be empty');
    }

    if (trimmed.length > 10000) {
      throw new ValidationError('Query is too long (max 10000 characters)');
    }

    return trimmed;
  }

  /**
   * Validate and normalize max_results parameter
   * @private
   */
  _validateMaxResults(maxResults) {
    if (maxResults === null || maxResults === undefined) {
      return 5; // Default value
    }

    const num = Number(maxResults);

    if (isNaN(num) || !Number.isFinite(num)) {
      return 5;
    }

    if (num < 1) return 1;
    if (num > 100) return 100;

    return Math.floor(num);
  }

  /**
   * Perform semantic search
   */
  async search(query, maxResults = 5, collection = null) {
    // Validate inputs
    const validQuery = this._validateQuery(query);
    const validMaxResults = this._validateMaxResults(maxResults);

    // Build URL with query parameters
    const url = new URL(`${this.queryBaseUrl}/search`);
    url.searchParams.set('query', validQuery);
    url.searchParams.set('max_results', String(validMaxResults));

    if (collection && collection.trim().length > 0) {
      url.searchParams.set('collection', collection.trim());
    }

    // Make request
    const response = await this._makeRequest(url.toString(), {
      method: 'GET',
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        'LlamaIndex search',
        new Error(response.body || 'Search request failed'),
        { statusCode: response.status }
      );
    }

    return {
      success: true,
      results: response.data || [],
      metadata: {
        query: validQuery,
        maxResults: validMaxResults,
        collection: collection || null,
      },
    };
  }

  /**
   * Perform question answering with context
   */
  async query(queryText, maxResults = 5, collection = null) {
    // Validate inputs
    const validQuery = this._validateQuery(queryText);
    const validMaxResults = this._validateMaxResults(maxResults);

    // Build request payload
    const payload = {
      query: validQuery,
      max_results: validMaxResults,
    };

    if (collection && collection.trim().length > 0) {
      payload.collection = collection.trim();
    }

    // Make request
    const response = await this._makeRequest(`${this.queryBaseUrl}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        'LlamaIndex query',
        new Error(response.body || 'Query request failed'),
        { statusCode: response.status }
      );
    }

    return {
      success: true,
      answer: response.data?.answer || '',
      confidence: response.data?.confidence || 0,
      sources: response.data?.sources || [],
      metadata: response.data?.metadata || {},
    };
  }

  /**
   * Get GPU policy information
   */
  async getGpuPolicy() {
    const response = await this._makeRequest(`${this.queryBaseUrl}/gpu/policy`, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new ExternalServiceError(
        'LlamaIndex GPU policy',
        new Error(response.body || 'GPU policy request failed'),
        { statusCode: response.status }
      );
    }

    return {
      success: true,
      policy: response.data || {},
    };
  }

  /**
   * Check service health
   */
  async checkHealth() {
    try {
      const response = await this._makeRequest(`${this.queryBaseUrl}/health`, {
        method: 'GET',
        timeout: 5000, // Shorter timeout for health checks
      });

      return {
        ok: response.ok,
        status: response.status,
        message: response.data?.message || response.data?.status || 'unknown',
        data: response.data,
      };
    } catch (error) {
      return {
        ok: false,
        status: 0,
        message: error.message,
        error: true,
      };
    }
  }

  /**
   * Get raw response (for passthrough scenarios)
   * Use this when you need to return the upstream response directly
   */
  async getRawResponse(endpoint, method = 'GET', payload = null) {
    const url = `${this.queryBaseUrl}${endpoint}`;
    const options = {
      method,
      headers: { Authorization: this._getBearerToken() },
    };

    if (payload && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(payload);
    }

    const response = await this._makeRequest(url, options);

    return {
      status: response.status,
      contentType: response.contentType,
      body: response.body,
    };
  }
}

export default RagProxyService;
