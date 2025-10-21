/**
 * Service Launcher - Logger Tests
 * Tests for structured logging utility
 */

const logger = require('../src/utils/logger');

describe('Logger Utility', () => {
  let consoleOutput;

  beforeEach(() => {
    // Capture console output
    consoleOutput = [];
    jest.spyOn(console, 'log').mockImplementation((...args) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    // Restore console
    console.log.mockRestore();
  });

  describe('Basic logging', () => {
    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Custom methods', () => {
    it('should have startup method', () => {
      expect(typeof logger.startup).toBe('function');
      logger.startup('Test startup', { port: 3500 });
      // Method should execute without error
    });

    it('should have healthCheck method', () => {
      expect(typeof logger.healthCheck).toBe('function');
      logger.healthCheck('test-service', 'ok', 100);
      // Method should execute without error
    });

    it('should have launch method', () => {
      expect(typeof logger.launch).toBe('function');
      logger.launch('TestService', '/tmp', 'test-method');
      // Method should execute without error
    });

    it('should have statusCheck method', () => {
      expect(typeof logger.statusCheck).toBe('function');
      logger.statusCheck('ok', 10, 0, 0, 50);
      // Method should execute without error
    });

    it('should handle healthCheck with degraded status', () => {
      expect(() => {
        logger.healthCheck('test-service', 'degraded', 200, { reason: 'slow' });
      }).not.toThrow();
    });

    it('should handle healthCheck with down status', () => {
      expect(() => {
        logger.healthCheck('test-service', 'down', null, { error: 'timeout' });
      }).not.toThrow();
    });

    it('should handle statusCheck with degraded overall status', () => {
      expect(() => {
        logger.statusCheck('degraded', 10, 2, 0, 150);
      }).not.toThrow();
    });

    it('should handle statusCheck with down overall status', () => {
      expect(() => {
        logger.statusCheck('down', 10, 3, 2, 200);
      }).not.toThrow();
    });
  });

  describe('Request logging', () => {
    it('should have request method', () => {
      expect(typeof logger.request).toBe('function');
    });

    it('should log HTTP requests', () => {
      const mockReq = {
        method: 'GET',
        url: '/api/status',
      };
      const mockRes = {
        statusCode: 200,
      };

      expect(() => {
        logger.request(mockReq, mockRes, 50);
      }).not.toThrow();
    });
  });
});













