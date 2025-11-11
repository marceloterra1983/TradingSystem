/**
 * Integration Tests for Security Middleware
 *
 * Tests the complete middleware stack in a real Express application.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { createInterServiceAuthMiddleware, generateServiceToken } from '../inter-service-auth.js';
import { createAdvancedRateLimit, RATE_LIMIT_TIERS } from '../advanced-rate-limit.js';

describe('Security Middleware Integration', () => {
  let app;
  let server;

  beforeEach(() => {
    // Create fresh Express app for each test
    app = express();
    app.use(express.json());

    // Health endpoint (no auth required)
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    // Public endpoint (with rate limiting)
    app.get('/api/public', (req, res) => {
      res.json({ message: 'Public data' });
    });

    // Internal endpoint (requires service authentication)
    app.use('/internal/*', createInterServiceAuthMiddleware({
      logger: {
        warn: () => {},
        error: () => {},
        debug: () => {},
      },
    }));

    app.get('/internal/data', (req, res) => {
      res.json({
        message: 'Internal data',
        serviceName: req.serviceAuth?.serviceName,
      });
    });
  });

  afterEach((done) => {
    if (server) {
      server.close(done);
    } else {
      done();
    }
  });

  describe('Health Endpoint', () => {
    it('should respond without authentication', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });

  describe('Public Endpoint', () => {
    it('should be accessible without authentication', async () => {
      const response = await request(app)
        .get('/api/public')
        .expect(200);

      expect(response.body.message).toBe('Public data');
    });
  });

  describe('Internal Endpoint', () => {
    it('should require service authentication', async () => {
      const response = await request(app)
        .get('/internal/data')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
      expect(response.body.message).toContain('Service authentication token required');
    });

    it('should allow request with valid service token', async () => {
      const token = generateServiceToken('workspace-api');

      const response = await request(app)
        .get('/internal/data')
        .set('x-service-token', token)
        .expect(200);

      expect(response.body.message).toBe('Internal data');
      expect(response.body.serviceName).toBe('workspace-api');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/internal/data')
        .set('x-service-token', 'invalid.token.here')
        .expect(401);

      expect(response.body.error).toBe('Unauthorized');
    });
  });

  describe('Rate Limiting Tiers', () => {
    it('should have correct tier configurations', () => {
      expect(RATE_LIMIT_TIERS.anonymous.max).toBe(100);
      expect(RATE_LIMIT_TIERS.authenticated.max).toBe(1000);
      expect(RATE_LIMIT_TIERS.premium.max).toBe(10000);
      expect(RATE_LIMIT_TIERS.strict.max).toBe(10);
      expect(RATE_LIMIT_TIERS.auth.max).toBe(5);
    });

    it('should have correct window durations', () => {
      // Anonymous: 1 hour
      expect(RATE_LIMIT_TIERS.anonymous.windowMs).toBe(60 * 60 * 1000);

      // Authenticated: 1 hour
      expect(RATE_LIMIT_TIERS.authenticated.windowMs).toBe(60 * 60 * 1000);

      // Strict: 1 minute
      expect(RATE_LIMIT_TIERS.strict.windowMs).toBe(60 * 1000);

      // Auth: 15 minutes
      expect(RATE_LIMIT_TIERS.auth.windowMs).toBe(15 * 60 * 1000);
    });
  });

  describe('Service Token Workflow', () => {
    it('should generate, use, and validate tokens', async () => {
      // 1. Generate token
      const token = generateServiceToken('test-service', {
        expiresIn: '1h',
        additionalClaims: { purpose: 'integration-test' },
      });

      expect(token).toBeTruthy();
      expect(typeof token).toBe('string');

      // 2. Use token in request
      const response = await request(app)
        .get('/internal/data')
        .set('x-service-token', token)
        .expect(200);

      // 3. Validate service name attached to request
      expect(response.body.serviceName).toBe('test-service');
    });

    it('should support token in x-api-key header', async () => {
      const token = generateServiceToken('api-key-test');

      const response = await request(app)
        .get('/internal/data')
        .set('x-api-key', token)
        .expect(200);

      expect(response.body.serviceName).toBe('api-key-test');
    });
  });

  describe('Error Handling', () => {
    it('should handle expired tokens gracefully', async () => {
      // Generate token that expires immediately
      const token = generateServiceToken('expired-service', {
        expiresIn: '0s',
      });

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await request(app)
        .get('/internal/data')
        .set('x-service-token', token)
        .expect(401);

      expect(response.body.message).toContain('expired');
    });

    it('should provide helpful error messages', async () => {
      const response = await request(app)
        .get('/internal/data')
        .expect(401);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('message');
    });
  });
});
