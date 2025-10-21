import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import app from '../server.js';
import HealthCheckCron from '../scripts/cronHealthCheck.js';

describe('Documentation API E2E Tests', () => {
  let healthChecker;
  const testSpecsDir = path.join(__dirname, 'fixtures/specs');
  const testOutputDir = path.join(__dirname, 'fixtures/output');

  beforeAll(async () => {
    // Create test directories
    await fs.mkdir(testSpecsDir, { recursive: true });
    await fs.mkdir(testOutputDir, { recursive: true });

    // Create test specs
    await fs.writeFile(path.join(testSpecsDir, 'openapi.yaml'), `
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /test:
    get:
      responses:
        '200':
          description: OK
    `);

    await fs.writeFile(path.join(testSpecsDir, 'asyncapi.yaml'), `
asyncapi: 3.0.0
info:
  title: Test Events API
  version: 1.0.0
channels:
  test:
    subscribe:
      message:
        payload:
          type: object
    `);

    // Initialize health checker with test config
    healthChecker = new HealthCheckCron({
      specsDir: testSpecsDir,
      outputDir: testOutputDir,
      schedule: '*/1 * * * *',
      maxHistory: 5
    });
  });

  afterAll(async () => {
    // Cleanup test files
    await fs.rm(testSpecsDir, { recursive: true, force: true });
    await fs.rm(testOutputDir, { recursive: true, force: true });
  });

  describe('Documentation Flow', () => {
    it('should validate and serve documentation', async () => {
      // Step 1: Check initial health status
      const healthResponse = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(healthResponse.body).toMatchObject({
        status: expect.any(String),
        openapi: expect.any(Object),
        asyncapi: expect.any(Object)
      });

      // Step 2: Run health check
      await healthChecker.runHealthCheck();

      // Step 3: Verify status.json was created
      const statusExists = await fs.access(path.join(testOutputDir, 'status.json'))
        .then(() => true)
        .catch(() => false);
      expect(statusExists).toBe(true);

      // Step 4: Download and verify specs
      const downloadResponse = await request(app)
        .get('/api/v1/download')
        .expect(200);

      expect(downloadResponse.headers['content-type']).toMatch(/zip/);
      expect(downloadResponse.body.length).toBeGreaterThan(0);
    });
  });

  describe('Schema Validation', () => {
    it('should detect invalid OpenAPI spec', async () => {
      // Create invalid spec
      await fs.writeFile(path.join(testSpecsDir, 'openapi.yaml'), `
openapi: invalid
info:
  title: Invalid API
      `);

      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body.openapi.valid).toBe(false);
      expect(response.body.openapi.issues).toBeTruthy();
    });

    it('should detect invalid AsyncAPI spec', async () => {
      // Create invalid spec
      await fs.writeFile(path.join(testSpecsDir, 'asyncapi.yaml'), `
asyncapi: invalid
info:
  title: Invalid Events API
      `);

      const response = await request(app)
        .get('/api/v1/status')
        .expect(200);

      expect(response.body.asyncapi.valid).toBe(false);
      expect(response.body.asyncapi.issues).toBeTruthy();
    });
  });

  describe('Health History', () => {
    it('should maintain health check history', async () => {
      // Run multiple health checks
      await healthChecker.runHealthCheck();
      await healthChecker.runHealthCheck();
      await healthChecker.runHealthCheck();

      const history = await healthChecker.getHealthHistory();
      expect(history).toHaveLength(3);
      expect(history[0]).toMatchObject({
        timestamp: expect.any(String),
        status: expect.any(String)
      });
    });

    it('should provide status summary', async () => {
      const summary = await healthChecker.getStatusSummary();
      expect(summary).toMatchObject({
        status: expect.any(String),
        lastCheck: expect.any(String),
        checksLastDay: expect.any(Number),
        uptime: expect.any(Number)
      });
    });
  });
});