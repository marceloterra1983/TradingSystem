/**
 * Items Router Tests
 * Tests for workspace items CRUD operations
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';
import express from 'express';

// Stub the shared logger so tests do not require the real pino dependency
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbModuleId = path.resolve(__dirname, '../../db/index.js');
const sharedLoggerModuleId = path.resolve(__dirname, '../../../../../shared/logger/index.js');

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnThis(),
};

await jest.unstable_mockModule(sharedLoggerModuleId, () => ({
  createLogger: jest.fn(() => mockLogger),
}));

await jest.unstable_mockModule(dbModuleId, () => ({
  getDbClient: jest.fn(),
}));

const { itemsRouter, resetWorkspaceService } = await import('../items.js');
const dbModule = await import('../../db/index.js');
const { getDbClient } = dbModule;

describe('Items Router', () => {
  let app;
  let mockDb;

  beforeEach(() => {
    // Create Express app with router
    app = express();
    app.use(express.json());
    app.use('/api/items', itemsRouter);

    // Error handler
    app.use((err, req, res, next) => {
      const status = err.statusCode || err.status || 500;
      res.status(status).json({
        success: false,
        message: err.message,
        errors: err.errors,
      });
    });

    // Setup mock database
    mockDb = {
      init: jest.fn().mockResolvedValue(undefined),
      pool: {
        query: jest.fn(),
      },
      getCategories: jest.fn().mockResolvedValue([
        { name: 'features' },
        { name: 'bug' },
      ]),
      getItems: jest.fn(),
      getItem: jest.fn(),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
    };

    getDbClient.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    resetWorkspaceService();
  });

  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const mockItems = [
        {
          id: '1',
          title: 'Test Item 1',
          description: 'Description 1',
          category: 'features',
          priority: 'high',
          status: 'new',
          tags: ['test'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Test Item 2',
          description: 'Description 2',
          category: 'bug',
          priority: 'medium',
          status: 'in-progress',
          tags: ['bug'],
          createdAt: new Date().toISOString(),
        },
      ];

      mockDb.getItems.mockResolvedValue(mockItems);

      const response = await request(app)
        .get('/api/items')
        .expect(200);

      expect(response.body).toEqual(expect.objectContaining({
        success: true,
        count: 2,
        data: mockItems,
      }));
      expect(response.body.filters).toEqual({
        limit: 100,
        offset: 0,
      });
      expect(mockDb.getItems).toHaveBeenCalledTimes(1);
    });

    it('should handle database errors gracefully', async () => {
      mockDb.getItems.mockRejectedValue(new Error('Database connection failed'));

      await request(app)
        .get('/api/items')
        .expect(500);
    });
  });

  describe('POST /api/items', () => {
    beforeEach(() => {
      // Mock category validation query
      mockDb.getCategories.mockResolvedValue([
        { name: 'features' },
      ]);
    });

    it('should create a new item with valid data', async () => {
      const newItem = {
        title: 'New Test Item',
        description: 'Test description',
        category: 'features',
        priority: 'high',
        tags: ['test', 'new'],
      };

      const createdItem = {
        id: 'abc123',
        ...newItem,
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      mockDb.createItem.mockResolvedValue(createdItem);

      const response = await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        message: 'Item created successfully',
        data: createdItem,
      });
      expect(mockDb.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          title: newItem.title,
          description: newItem.description,
          category: newItem.category,
          priority: newItem.priority,
          tags: newItem.tags,
          status: 'new',
        })
      );
    });

    it('should reject item without title', async () => {
      const invalidItem = {
        description: 'Test description',
        category: 'features',
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'title',
            message: expect.stringContaining('Invalid input'),
          }),
        ])
      );
      expect(mockDb.createItem).not.toHaveBeenCalled();
    });

    it('should reject item with invalid priority', async () => {
      const invalidItem = {
        title: 'Test Item',
        description: 'Test description',
        category: 'features',
        priority: 'invalid',
      };

      const response = await request(app)
        .post('/api/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'priority',
          }),
        ])
      );
    });

    it('should reject item with invalid category', async () => {
      // Mock category validation to return no rows
      mockDb.getCategories.mockResolvedValue([]);

      const invalidItem = {
        title: 'Test Item',
        description: 'Test description',
        category: 'InvalidCategory',
        priority: 'high',
      };

      const response = await request(app)
        .post('/api/items')
        .send(invalidItem)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'category',
          }),
        ])
      );
    });

    it('should accept item without tags', async () => {
      const newItem = {
        title: 'Test Item',
        description: 'Test description',
        category: 'features',
        priority: 'high',
      };

      const createdItem = {
        id: 'abc123',
        ...newItem,
        tags: [],
        status: 'new',
        createdAt: new Date().toISOString(),
        updatedAt: null,
      };

      mockDb.createItem.mockResolvedValue(createdItem);

      await request(app)
        .post('/api/items')
        .send(newItem)
        .expect(201);

      expect(mockDb.createItem).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: [],
        })
      );
    });
  });

  describe('PUT /api/items/:id', () => {
    beforeEach(() => {
      // Mock category validation query
      mockDb.getCategories.mockResolvedValue([
        { name: 'features' },
      ]);
    });

    it('should update an existing item', async () => {
      const updates = {
        title: 'Updated Title',
        priority: 'critical',
        status: 'in-progress',
      };

      const updatedItem = {
        id: 'abc123',
        ...updates,
        description: 'Original description',
        category: 'features',
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };

      mockDb.getItem.mockResolvedValue({
        id: 'abc123',
        title: 'Original Title',
        description: 'Original description',
        category: 'features',
        tags: ['test'],
      });
      mockDb.updateItem.mockResolvedValue(updatedItem);

      const response = await request(app)
        .put('/api/items/abc123')
        .send(updates)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Item updated successfully',
        data: updatedItem,
      });
      expect(mockDb.updateItem).toHaveBeenCalledWith(
        'abc123',
        expect.objectContaining(updates)
      );
    });

    it('should return 404 for non-existent item', async () => {
      mockDb.updateItem.mockResolvedValue(null);

      const response = await request(app)
        .put('/api/items/nonexistent')
        .send({ title: 'Updated' })
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Item with id nonexistent not found',
      });
    });

    it('should reject invalid status update', async () => {
      const invalidUpdate = {
        status: 'invalid-status',
      };

      const response = await request(app)
        .put('/api/items/abc123')
        .send(invalidUpdate)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            field: 'status',
          }),
        ])
      );
      expect(mockDb.updateItem).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/items/:id', () => {
    it('should delete an existing item', async () => {
      mockDb.getItem.mockResolvedValue({
        id: 'abc123',
        title: 'Delete me',
      });
      mockDb.deleteItem.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/items/abc123')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Item deleted successfully',
      });
      expect(mockDb.deleteItem).toHaveBeenCalledWith('abc123');
    });

    it('should return 404 for non-existent item', async () => {
      mockDb.deleteItem.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/items/nonexistent')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        message: 'Item with id nonexistent not found',
      });
    });

    it('should reject empty id', async () => {
      const response = await request(app)
        .delete('/api/items/')
        .expect(404); // Express returns 404 for missing route param

      expect(mockDb.deleteItem).not.toHaveBeenCalled();
    });
  });
});
