import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import app from '../server.js';
import VersionManager from '../services/versionManager.js';

describe('Version Management', () => {
  const testSpecsDir = path.join(__dirname, 'fixtures/versions');
  let versionManager;

  beforeAll(async () => {
    // Create test directory structure
    await fs.mkdir(path.join(testSpecsDir, 'versions'), { recursive: true });

    // Create test OpenAPI spec
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
components:
  schemas:
    Test:
      type: object
      properties:
        id: { type: string }
    `);

    // Create test AsyncAPI spec
    await fs.writeFile(path.join(testSpecsDir, 'asyncapi.yaml'), `
asyncapi: 3.0.0
info:
  title: Test Events API
  version: 1.0.0
channels:
  test:
    publish:
      message:
        payload:
          type: object
    `);

    // Initialize version manager
    versionManager = new VersionManager(testSpecsDir);
    await versionManager.initialize();
  });

  afterAll(async () => {
    await fs.rm(testSpecsDir, { recursive: true, force: true });
  });

  describe('Version Creation', () => {
    it('should create a new minor version', async () => {
      const version = await versionManager.createVersion('minor');
      expect(version.version).toBe('1.1.0');
      expect(version.type).toBe('minor');

      // Verify files were created
      const versionDir = path.join(testSpecsDir, 'versions', '1.1.0');
      const files = await fs.readdir(versionDir);
      expect(files).toContain('openapi.yaml');
      expect(files).toContain('asyncapi.yaml');
    });

    it('should create a new patch version', async () => {
      const version = await versionManager.createVersion('patch');
      expect(version.version).toBe('1.1.1');
      expect(version.type).toBe('patch');
    });

    it('should create a new major version', async () => {
      const version = await versionManager.createVersion('major');
      expect(version.version).toBe('2.0.0');
      expect(version.type).toBe('major');
    });
  });

  describe('Version Retrieval', () => {
    it('should get latest version', async () => {
      const version = await versionManager.getVersion('latest');
      expect(version.version).toBe('2.0.0');
      expect(version.specs).toBeDefined();
    });

    it('should get stable version', async () => {
      const version = await versionManager.getVersion('stable');
      expect(version.version).toBe('1.1.1');
      expect(version.specs).toBeDefined();
    });

    it('should get specific version', async () => {
      const version = await versionManager.getVersion('1.1.0');
      expect(version.version).toBe('1.1.0');
      expect(version.specs).toBeDefined();
    });

    it('should fail for non-existent version', async () => {
      await expect(versionManager.getVersion('999.0.0')).rejects.toThrow();
    });
  });

  describe('Version Comparison', () => {
    it('should compare two versions', async () => {
      const comparison = await versionManager.compareVersions('1.0.0', '2.0.0');
      expect(comparison.v1).toBe('1.0.0');
      expect(comparison.v2).toBe('2.0.0');
      expect(comparison.changes).toMatchObject({
        paths: {
          added: expect.any(Array),
          removed: expect.any(Array),
          modified: expect.any(Array)
        },
        components: {
          added: expect.any(Array),
          removed: expect.any(Array),
          modified: expect.any(Array)
        }
      });
    });
  });

  describe('API Endpoints', () => {
    it('should list all versions', async () => {
      const response = await request(app)
        .get('/api/v1/versions')
        .expect(200);

      expect(response.body).toMatchObject({
        latest: expect.any(String),
        stable: expect.any(String),
        all: expect.arrayContaining(['1.0.0', '1.1.0', '1.1.1', '2.0.0'])
      });
    });

    it('should get specific version', async () => {
      const response = await request(app)
        .get('/api/v1/versions/1.1.0')
        .expect(200);

      expect(response.body).toMatchObject({
        version: '1.1.0',
        path: expect.stringContaining('1.1.0'),
        specs: {
          openapi: expect.stringContaining('openapi.yaml'),
          asyncapi: expect.stringContaining('asyncapi.yaml')
        }
      });
    });

    it('should create new version', async () => {
      const response = await request(app)
        .post('/api/v1/versions')
        .send({ type: 'minor' })
        .expect(201);

      expect(response.body).toMatchObject({
        version: expect.any(String),
        type: 'minor',
        path: expect.any(String)
      });
    });

    it('should compare versions', async () => {
      const response = await request(app)
        .get('/api/v1/versions/compare/1.0.0/2.0.0')
        .expect(200);

      expect(response.body).toMatchObject({
        v1: '1.0.0',
        v2: '2.0.0',
        changes: {
          paths: expect.any(Object),
          components: expect.any(Object)
        }
      });
    });

    it('should serve versioned spec files', async () => {
      const response = await request(app)
        .get('/api/v1/versions/1.1.0/spec/openapi')
        .expect('Content-Type', /yaml/)
        .expect(200);

      expect(response.text).toContain('openapi: 3.1.0');
      expect(response.text).toContain('version: 1.1.0');
    });
  });
});