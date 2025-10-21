import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import path from 'path';
import fs from 'fs/promises';
import app from '../server.js';
import DocumentationSearchService from '../services/searchService.js';

describe('Documentation Search API', () => {
  const testSpecsDir = path.join(__dirname, 'fixtures/search');
  let searchService;

  beforeAll(async () => {
    // Create test directory
    await fs.mkdir(testSpecsDir, { recursive: true });

    // Create test OpenAPI spec
    await fs.writeFile(path.join(testSpecsDir, 'openapi.yaml'), `
openapi: 3.1.0
info:
  title: Test API
  description: API for testing search functionality
  version: 1.0.0
paths:
  /users:
    get:
      summary: List users
      description: Get a list of system users
      operationId: listUsers
      responses:
        '200':
          description: List of users
    post:
      summary: Create user
      description: Create a new system user
      operationId: createUser
      responses:
        '201':
          description: User created
components:
  schemas:
    User:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
    `);

    // Create test AsyncAPI spec
    await fs.writeFile(path.join(testSpecsDir, 'asyncapi.yaml'), `
asyncapi: 3.0.0
info:
  title: Test Events API
  description: Event system for testing search
  version: 1.0.0
channels:
  user/created:
    publish:
      message:
        name: UserCreated
        description: Event when a new user is created
    `);

    // Initialize search service
    searchService = new DocumentationSearchService(testSpecsDir);
    await searchService.indexDocumentation();
  });

  afterAll(async () => {
    await fs.rm(testSpecsDir, { recursive: true, force: true });
  });

  describe('GET /api/v1/search', () => {
    it('should find matching endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=user')
        .expect(200);

      expect(response.body.results).toHaveLength.greaterThan(0);
      expect(response.body.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'endpoint',
            title: expect.stringContaining('user'),
            method: expect.stringMatching(/GET|POST/)
          })
        ])
      );
    });

    it('should filter by type', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=user&type=schema')
        .expect(200);

      expect(response.body.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'schema',
            title: 'User'
          })
        ])
      );
    });

    it('should filter by source', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=user&source=asyncapi')
        .expect(200);

      expect(response.body.results).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: 'asyncapi',
            title: expect.stringContaining('User')
          })
        ])
      );
    });

    it('should respect limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/search?q=user&limit=1')
        .expect(200);

      expect(response.body.results).toHaveLength(1);
    });

    it('should validate search parameters', async () => {
      await request(app)
        .get('/api/v1/search')
        .expect(400);

      await request(app)
        .get('/api/v1/search?q=user&type=invalid')
        .expect(400);

      await request(app)
        .get('/api/v1/search?q=user&limit=0')
        .expect(400);
    });
  });

  describe('GET /api/v1/suggest', () => {
    it('should return search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/suggest?q=us')
        .expect(200);

      expect(response.body.suggestions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            text: expect.stringContaining('user'),
            type: expect.any(String)
          })
        ])
      );
    });

    it('should respect suggestion limit', async () => {
      const response = await request(app)
        .get('/api/v1/suggest?q=us&limit=1')
        .expect(200);

      expect(response.body.suggestions).toHaveLength(1);
    });

    it('should validate suggestion parameters', async () => {
      await request(app)
        .get('/api/v1/suggest')
        .expect(400);

      await request(app)
        .get('/api/v1/suggest?q=us&limit=0')
        .expect(400);
    });
  });

  describe('POST /api/v1/reindex', () => {
    it('should reindex documentation', async () => {
      const response = await request(app)
        .post('/api/v1/reindex')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'success',
        indexed: expect.any(Object)
      });
    });
  });

  describe('Search Service', () => {
    it('should find content in specifications', () => {
      const results = searchService.search('user');
      expect(results.total).toBeGreaterThan(0);
    });

    it('should provide relevant suggestions', () => {
      const suggestions = searchService.suggest('us');
      expect(suggestions).toHaveLength.greaterThan(0);
      suggestions.forEach(suggestion => {
        expect(suggestion.text.toLowerCase()).toContain('us');
      });
    });

    it('should handle case-insensitive search', () => {
      const results = searchService.search('USER');
      expect(results.total).toBeGreaterThan(0);
    });
  });
});