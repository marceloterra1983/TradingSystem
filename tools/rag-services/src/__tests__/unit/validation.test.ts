/**
 * Validation Middleware Unit Tests
 *
 * Tests for Zod-based request validation
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../../middleware/validation';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusMock: jest.Mock;
  let jsonMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      query: {},
      params: {},
    };

    mockResponse = {
      status: statusMock,
      locals: {
        requestId: 'test-request-id',
      },
    };

    mockNext = jest.fn();
  });

  describe('body validation', () => {
    const testSchema = z.object({
      name: z.string().min(1).max(50),
      age: z.number().int().min(0).max(150),
      email: z.string().email(),
    });

    it('should pass validation with valid body', async () => {
      mockRequest.body = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const middleware = validate({ body: testSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should fail validation with invalid body', async () => {
      mockRequest.body = {
        name: '', // Too short
        age: -5, // Negative
        email: 'invalid-email', // Invalid format
      };

      const middleware = validate({ body: testSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR',
          }),
        }),
      );
    });

    it('should provide detailed error messages', async () => {
      mockRequest.body = {
        name: 'a'.repeat(51), // Too long
        age: 200, // Too high
        email: 'not-an-email',
      };

      const middleware = validate({ body: testSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.any(Array),
          }),
        }),
      );

      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details).toHaveLength(3);
    });

    it('should handle missing required fields', async () => {
      mockRequest.body = {}; // Empty body

      const middleware = validate({ body: testSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      const response = jsonMock.mock.calls[0][0];
      expect(response.error.details).toHaveLength(3); // All required fields missing
    });
  });

  describe('query validation', () => {
    const querySchema = z.object({
      page: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1)).default('1'),
      limit: z.string().transform((val) => parseInt(val, 10)).pipe(z.number().int().min(1).max(100)).default('10'),
      search: z.string().optional(),
    });

    it('should pass validation with valid query params', async () => {
      mockRequest.query = {
        page: '2',
        limit: '50',
        search: 'test',
      };

      const middleware = validate({ query: querySchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should apply default values for missing query params', async () => {
      mockRequest.query = {}; // Empty query

      const middleware = validate({ query: querySchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail validation with invalid query params', async () => {
      mockRequest.query = {
        page: '-1', // Negative
        limit: '1000', // Too high
      };

      const middleware = validate({ query: querySchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('params validation', () => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
      name: z.string().regex(/^[a-z0-9-_]+$/),
    });

    it('should pass validation with valid params', async () => {
      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'my-collection',
      };

      const middleware = validate({ params: paramsSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail validation with invalid UUID', async () => {
      mockRequest.params = {
        id: 'not-a-uuid',
        name: 'my-collection',
      };

      const middleware = validate({ params: paramsSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should fail validation with invalid name pattern', async () => {
      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'INVALID NAME', // Uppercase and spaces not allowed
      };

      const middleware = validate({ params: paramsSchema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('combined validation', () => {
    const bodySchema = z.object({
      title: z.string().min(1),
    });

    const querySchema = z.object({
      format: z.enum(['json', 'xml']),
    });

    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    it('should validate all request parts simultaneously', async () => {
      mockRequest.body = { title: 'Test Title' };
      mockRequest.query = { format: 'json' };
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      const middleware = validate({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail if any part is invalid', async () => {
      mockRequest.body = { title: '' }; // Invalid
      mockRequest.query = { format: 'json' }; // Valid
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' }; // Valid

      const middleware = validate({
        body: bodySchema,
        query: querySchema,
        params: paramsSchema,
      });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('security validations', () => {
    it('should prevent directory traversal in paths', async () => {
      const schema = z.object({
        path: z.string().refine((p) => !p.includes('..'), 'Path cannot contain ".."'),
      });

      mockRequest.body = {
        path: '../../../etc/passwd',
      };

      const middleware = validate({ body: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should enforce collection name security patterns', async () => {
      const schema = z.object({
        name: z.string().regex(/^[a-z0-9-_]+$/, 'Invalid collection name format'),
      });

      mockRequest.body = {
        name: 'DROP TABLE users;--', // SQL injection attempt
      };

      const middleware = validate({ body: schema });
      await middleware(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });
});
