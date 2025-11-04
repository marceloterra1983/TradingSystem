/**
 * Items Router Tests
 * Tests for workspace items CRUD operations
 */

import request from 'supertest';
import express from 'express';
import { itemsRouter } from '../items.js';
import { getDbClient } from '../../db/index.js';

// Mock the database client
jest.mock('../../db/index.js');

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
      res.status(err.status || 500).json({
        success: false,
        message: err.message,
      });
    });

    // Setup mock database
    mockDb = {
      init: jest.fn().mockResolvedValue(undefined),
      pool: {
        query: jest.fn(),
      },
      getItems: jest.fn(),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
    };

    getDbClient.mockReturnValue(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/items', () => {
    it('should return all items', async () => {
      const mockItems = [
        {
          id: '1',
          title: 'Test Item 1',
          description: 'Description 1',
          category: 'Features',
          priority: 'high',
          status: 'new',
          tags: ['test'],
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          title: 'Test Item 2',
          description: 'Description 2',
          category: 'Bug',
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

      expect(response.body).toEqual({
        success: true,
        count: 2,
        data: mockItems,
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
      mockDb.pool.query.mockResolvedValue({
        rows: [{ name: 'Features' }],
      });
    });

    it('should create a new item with valid data', async () => {
      const newItem = {
        title: 'New Test Item',
        description: 'Test description',
        category: 'Features',
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
        category: 'Features',
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
            message: 'title is required',
          }),
        ])
      );
      expect(mockDb.createItem).not.toHaveBeenCalled();
    });

    it('should reject item with invalid priority', async () => {
      const invalidItem = {
        title: 'Test Item',
        description: 'Test description',
        category: 'Features',
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
      mockDb.pool.query.mockResolvedValue({ rows: [] });

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
        category: 'Features',
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
      mockDb.pool.query.mockResolvedValue({
        rows: [{ name: 'Features' }],
      });
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
        category: 'Features',
        tags: ['test'],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: new Date().toISOString(),
      };

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
      expect(mockDb.updateItem).toHaveBeenCalledWith('abc123', updates);
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
