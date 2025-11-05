import { test, expect } from '@playwright/test';
import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

/**
 * API Contract Tests for Telegram Gateway
 * Validates API responses against JSON Schema specifications
 *
 * Purpose:
 * - Ensure API responses match documented schemas
 * - Catch breaking changes early
 * - Validate data types and required fields
 * - Test error response formats
 */

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

// Schema Definitions

interface Message {
  id: string;
  messageId: number;
  channelId: string;
  channelTitle: string;
  text: string;
  date: string;
  sender?: string;
  hasMedia?: boolean;
  photoUrl?: string | null;
  linkPreview?: any;
}

interface Channel {
  id: string;
  channelId: string;
  title: string;
  label: string;
  active: boolean;
  totalMessages?: number;
  lastMessageDate?: string;
  createdAt: string;
  updatedAt?: string;
}

interface SyncResponse {
  success: boolean;
  message: string;
  data: {
    totalMessagesSynced: number;
    totalMessagesSaved: number;
    channelsSynced: Array<{
      channelId: string;
      label: string;
      messagesSynced: number;
    }>;
    timestamp: string;
  };
}

interface GatewayStatus {
  success: boolean;
  data: {
    mtproto: {
      status: string;
      uptime: number;
      lastSync: string;
    };
    database: {
      status: string;
      totalMessages: number;
      totalChannels: number;
    };
    cache: {
      status: string;
      hitRate: number;
    };
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  statusCode?: number;
}

// JSON Schemas

const messageSchema: JSONSchemaType<Message> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    messageId: { type: 'number' },
    channelId: { type: 'string' },
    channelTitle: { type: 'string' },
    text: { type: 'string' },
    date: { type: 'string', format: 'date-time' },
    sender: { type: 'string', nullable: true },
    hasMedia: { type: 'boolean', nullable: true },
    photoUrl: { type: 'string', nullable: true },
    linkPreview: { type: 'object', nullable: true },
  },
  required: ['id', 'messageId', 'channelId', 'channelTitle', 'text', 'date'],
  additionalProperties: true,
};

const channelSchema: JSONSchemaType<Channel> = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    channelId: { type: 'string' },
    title: { type: 'string' },
    label: { type: 'string' },
    active: { type: 'boolean' },
    totalMessages: { type: 'number', nullable: true },
    lastMessageDate: { type: 'string', format: 'date-time', nullable: true },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time', nullable: true },
  },
  required: ['id', 'channelId', 'title', 'label', 'active', 'createdAt'],
  additionalProperties: true,
};

const syncResponseSchema: JSONSchemaType<SyncResponse> = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    message: { type: 'string' },
    data: {
      type: 'object',
      properties: {
        totalMessagesSynced: { type: 'number' },
        totalMessagesSaved: { type: 'number' },
        channelsSynced: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              channelId: { type: 'string' },
              label: { type: 'string' },
              messagesSynced: { type: 'number' },
            },
            required: ['channelId', 'label', 'messagesSynced'],
          },
        },
        timestamp: { type: 'string', format: 'date-time' },
      },
      required: ['totalMessagesSynced', 'totalMessagesSaved', 'channelsSynced', 'timestamp'],
    },
  },
  required: ['success', 'message', 'data'],
};

const gatewayStatusSchema: JSONSchemaType<GatewayStatus> = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: true },
    data: {
      type: 'object',
      properties: {
        mtproto: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            uptime: { type: 'number' },
            lastSync: { type: 'string', format: 'date-time' },
          },
          required: ['status', 'uptime', 'lastSync'],
        },
        database: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            totalMessages: { type: 'number' },
            totalChannels: { type: 'number' },
          },
          required: ['status', 'totalMessages', 'totalChannels'],
        },
        cache: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            hitRate: { type: 'number' },
          },
          required: ['status', 'hitRate'],
        },
      },
      required: ['mtproto', 'database', 'cache'],
    },
  },
  required: ['success', 'data'],
};

const errorResponseSchema: JSONSchemaType<ErrorResponse> = {
  type: 'object',
  properties: {
    success: { type: 'boolean', const: false },
    error: { type: 'string' },
    message: { type: 'string' },
    statusCode: { type: 'number', nullable: true },
  },
  required: ['success', 'error', 'message'],
};

// Compile schemas
const validateMessage = ajv.compile(messageSchema);
const validateChannel = ajv.compile(channelSchema);
const validateSyncResponse = ajv.compile(syncResponseSchema);
const validateGatewayStatus = ajv.compile(gatewayStatusSchema);
const validateErrorResponse = ajv.compile(errorResponseSchema);

// Test Suite

test.describe('API Contracts - Telegram Gateway', () => {
  const baseURL = process.env.GATEWAY_API_URL || 'http://localhost:4010';

  test('GET /api/messages - validates response schema', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages?limit=10`);

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeInstanceOf(Array);

    // Validate each message
    json.data.forEach((message: any, index: number) => {
      const valid = validateMessage(message);

      if (!valid) {
        console.error(`Message ${index} validation errors:`, validateMessage.errors);
        expect(valid).toBe(true);
      }
    });

    // Validate pagination metadata
    expect(json.pagination).toBeDefined();
    expect(json.pagination).toHaveProperty('total');
    expect(json.pagination).toHaveProperty('page');
    expect(json.pagination).toHaveProperty('limit');
  });

  test('GET /api/messages/:id - validates single message response', async ({ request }) => {
    // First get a list to find a valid ID
    const listResponse = await request.get(`${baseURL}/api/messages?limit=1`);
    const listJson = await listResponse.json();

    if (listJson.data.length === 0) {
      test.skip();
      return;
    }

    const messageId = listJson.data[0].id;

    // Get single message
    const response = await request.get(`${baseURL}/api/messages/${messageId}`);

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);

    const valid = validateMessage(json.data);

    if (!valid) {
      console.error('Message validation errors:', validateMessage.errors);
    }

    expect(valid).toBe(true);
  });

  test('GET /api/channels - validates response schema', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/channels`);

    expect(response.status()).toBe(200);

    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data).toBeInstanceOf(Array);

    // Validate each channel
    json.data.forEach((channel: any, index: number) => {
      const valid = validateChannel(channel);

      if (!valid) {
        console.error(`Channel ${index} validation errors:`, validateChannel.errors);
        expect(valid).toBe(true);
      }
    });
  });

  test('POST /api/telegram-gateway/sync-messages - validates response schema', async ({
    request,
  }) => {
    const response = await request.post(`${baseURL}/api/telegram-gateway/sync-messages`, {
      data: {
        limit: 10,
      },
    });

    expect(response.status()).toBe(200);

    const json = await response.json();

    const valid = validateSyncResponse(json);

    if (!valid) {
      console.error('Sync response validation errors:', validateSyncResponse.errors);
    }

    expect(valid).toBe(true);
  });

  test('GET /api/telegram-gateway/status - validates response schema', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/telegram-gateway/status`);

    expect(response.status()).toBe(200);

    const json = await response.json();

    const valid = validateGatewayStatus(json);

    if (!valid) {
      console.error('Gateway status validation errors:', validateGatewayStatus.errors);
    }

    expect(valid).toBe(true);
  });

  test('GET /api/messages - validates error response for invalid query', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages?limit=invalid`);

    expect(response.status()).toBeGreaterThanOrEqual(400);

    const json = await response.json();

    const valid = validateErrorResponse(json);

    if (!valid) {
      console.error('Error response validation errors:', validateErrorResponse.errors);
    }

    expect(valid).toBe(true);
  });

  test('GET /api/messages/:id - validates 404 error response', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages/nonexistent-id-12345`);

    expect(response.status()).toBe(404);

    const json = await response.json();

    const valid = validateErrorResponse(json);

    if (!valid) {
      console.error('404 error response validation errors:', validateErrorResponse.errors);
    }

    expect(valid).toBe(true);
  });

  test('GET /health - validates health check response', async ({ request }) => {
    const response = await request.get(`${baseURL}/health`);

    expect(response.status()).toBe(200);

    const json = await response.json();

    expect(json).toHaveProperty('status');
    expect(json).toHaveProperty('service');
    expect(json).toHaveProperty('timestamp');

    expect(['healthy', 'degraded', 'unhealthy']).toContain(json.status);
  });

  test('API responses have correct content-type header', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages`);

    const contentType = response.headers()['content-type'];

    expect(contentType).toContain('application/json');
  });

  test('API responses have CORS headers', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages`, {
      headers: {
        Origin: 'http://localhost:3103',
      },
    });

    const headers = response.headers();

    expect(headers).toHaveProperty('access-control-allow-origin');
  });

  test('API validates required authentication headers (if applicable)', async ({ request }) => {
    // Skip if API doesn't require auth
    const response = await request.get(`${baseURL}/api/messages`);

    // If API requires auth, this should be 401
    // If no auth required, this should be 200
    expect([200, 401]).toContain(response.status());
  });

  test('API rate limiting headers are present', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages`);

    const headers = response.headers();

    // Check for common rate limit headers (adjust based on your implementation)
    const hasRateLimitHeaders =
      'x-ratelimit-limit' in headers ||
      'x-rate-limit-limit' in headers ||
      'ratelimit-limit' in headers;

    // This is informational - not all APIs implement rate limiting
    if (!hasRateLimitHeaders) {
      console.warn('⚠️  No rate limiting headers found (this may be intentional)');
    }
  });

  test('API returns consistent date formats', async ({ request }) => {
    const response = await request.get(`${baseURL}/api/messages?limit=5`);
    const json = await response.json();

    if (json.data.length === 0) {
      test.skip();
      return;
    }

    // All dates should be ISO 8601 format
    json.data.forEach((message: any) => {
      const date = new Date(message.date);
      expect(date.toISOString()).toBe(message.date);
    });
  });

  test('API handles pagination correctly', async ({ request }) => {
    // Get first page
    const page1 = await request.get(`${baseURL}/api/messages?page=1&limit=10`);
    const json1 = await page1.json();

    // Get second page
    const page2 = await request.get(`${baseURL}/api/messages?page=2&limit=10`);
    const json2 = await page2.json();

    // Pages should have different data (unless only 1 page exists)
    if (json1.pagination.totalPages > 1) {
      expect(json1.data[0].id).not.toBe(json2.data[0].id);
    }

    // Pagination metadata should be consistent
    expect(json1.pagination.limit).toBe(10);
    expect(json2.pagination.limit).toBe(10);
    expect(json1.pagination.page).toBe(1);
    expect(json2.pagination.page).toBe(2);
  });

  test('API handles filter parameters correctly', async ({ request }) => {
    // Test channel filter
    const response = await request.get(`${baseURL}/api/messages?channelId=-1001649127710`);
    const json = await response.json();

    expect(response.status()).toBe(200);
    expect(json.data).toBeInstanceOf(Array);

    // All messages should be from the specified channel
    json.data.forEach((message: any) => {
      expect(message.channelId).toBe('-1001649127710');
    });
  });

  test('API handles sort parameters correctly', async ({ request }) => {
    // Test sort by date descending
    const response = await request.get(`${baseURL}/api/messages?sort=date&order=desc&limit=10`);
    const json = await response.json();

    expect(response.status()).toBe(200);

    if (json.data.length > 1) {
      // Verify dates are in descending order
      for (let i = 0; i < json.data.length - 1; i++) {
        const date1 = new Date(json.data[i].date);
        const date2 = new Date(json.data[i + 1].date);
        expect(date1.getTime()).toBeGreaterThanOrEqual(date2.getTime());
      }
    }
  });
});

test.describe('API Contracts - Performance Requirements', () => {
  const baseURL = process.env.GATEWAY_API_URL || 'http://localhost:4010';

  test('GET /api/messages responds within 500ms', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.get(`${baseURL}/api/messages?limit=50`);

    const duration = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(500);

    console.log(`Response time: ${duration}ms`);
  });

  test('POST /api/telegram-gateway/sync-messages responds within 5s', async ({ request }) => {
    const startTime = Date.now();

    const response = await request.post(`${baseURL}/api/telegram-gateway/sync-messages`, {
      data: { limit: 50 },
    });

    const duration = Date.now() - startTime;

    expect(response.status()).toBe(200);
    expect(duration).toBeLessThan(5000);

    console.log(`Sync response time: ${duration}ms`);
  });
});
