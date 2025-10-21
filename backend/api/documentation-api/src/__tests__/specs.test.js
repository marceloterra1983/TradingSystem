import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import app from '../server.js';
import yaml from 'js-yaml';

describe('Documentation API', () => {
  const specsDir = path.join(__dirname, '../../../../docs/spec');
  let openApiSpec;
  let asyncApiSpec;

  beforeAll(async () => {
    // Load specs for validation
    [openApiSpec, asyncApiSpec] = await Promise.all([
      fs.readFile(path.join(specsDir, 'openapi.yaml'), 'utf8').then(yaml.load),
      fs.readFile(path.join(specsDir, 'asyncapi.yaml'), 'utf8').then(yaml.load)
    ]);
  });

  describe('GET /spec/*', () => {
    it('should serve OpenAPI spec with correct content type', async () => {
      const response = await request(app)
        .get('/spec/openapi.yaml')
        .expect('Content-Type', /yaml/)
        .expect(200);

      const spec = yaml.load(response.text);
      expect(spec.openapi).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });

    it('should serve AsyncAPI spec with correct content type', async () => {
      const response = await request(app)
        .get('/spec/asyncapi.yaml')
        .expect('Content-Type', /yaml/)
        .expect(200);

      const spec = yaml.load(response.text);
      expect(spec.asyncapi).toBeDefined();
      expect(spec.info.version).toBeDefined();
    });
  });

  describe('GET /status', () => {
    it('should return documentation health status', async () => {
      const response = await request(app)
        .get('/api/v1/status')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.any(String),
        openapi: expect.any(Object),
        asyncapi: expect.any(Object),
        lastChecked: expect.any(String)
      });
    });
  });

  describe('GET /check', () => {
    it('should run documentation validation', async () => {
      const response = await request(app)
        .get('/api/v1/check')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        message: 'Documentation check completed'
      });
    });
  });

  describe('GET /download', () => {
    it('should return zip archive of all specs', async () => {
      const response = await request(app)
        .get('/api/v1/download')
        .expect('Content-Type', /zip/)
        .expect('Content-Disposition', /attachment.*tradingsystem-specs\.zip/)
        .expect(200);

      expect(response.body).toBeInstanceOf(Buffer);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('Specification Validation', () => {
    it('should have valid OpenAPI specification', () => {
      expect(openApiSpec.openapi).toMatch(/3\.\d+\.\d+/);
      expect(openApiSpec.info.title).toBeTruthy();
      expect(openApiSpec.paths).toBeDefined();
      expect(Object.keys(openApiSpec.paths).length).toBeGreaterThan(0);
    });

    it('should have valid AsyncAPI specification', () => {
      expect(asyncApiSpec.asyncapi).toMatch(/3\.\d+\.\d+/);
      expect(asyncApiSpec.info.title).toBeTruthy();
      expect(asyncApiSpec.channels).toBeDefined();
      expect(Object.keys(asyncApiSpec.channels).length).toBeGreaterThan(0);
    });

    it('should have matching versions between specs', () => {
      expect(openApiSpec.info.version).toBe(asyncApiSpec.info.version);
    });
  });
});