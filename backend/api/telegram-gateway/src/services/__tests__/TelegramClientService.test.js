import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TelegramClientService, getTelegramClient } from '../TelegramClientService.js';

const MOCK_KEY = '0123456789abcdef0123456789abcdef';
const originalKey = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;

beforeAll(() => {
  process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = MOCK_KEY;
});

afterAll(() => {
  if (originalKey) {
    process.env.TELEGRAM_SESSION_ENCRYPTION_KEY = originalKey;
  } else {
    delete process.env.TELEGRAM_SESSION_ENCRYPTION_KEY;
  }
});

describe('TelegramClientService', () => {
  describe('Constructor', () => {
    it('should throw error if API_ID is missing', () => {
      expect(() => new TelegramClientService({ apiHash: 'test' })).toThrow(
        /TELEGRAM_API_ID and TELEGRAM_API_HASH are required/,
      );
    });

    it('should throw error if API_HASH is missing', () => {
      expect(() => new TelegramClientService({ apiId: 12345 })).toThrow(
        /TELEGRAM_API_ID and TELEGRAM_API_HASH are required/,
      );
    });

    it('should create instance with valid config', () => {
      const service = new TelegramClientService({
        apiId: 12345,
        apiHash: 'test_hash',
        phoneNumber: '+5511999999999',
      });

      expect(service.apiId).toBe(12345);
      expect(service.apiHash).toBe('test_hash');
      expect(service.phoneNumber).toBe('+5511999999999');
      expect(service.isConnected).toBe(false);
    });
  });

  describe('Health Status', () => {
    it('should return health status with all flags', () => {
      const service = new TelegramClientService({
        apiId: 12345,
        apiHash: 'test_hash',
        phoneNumber: '+5511999999999',
      });

      const health = service.getHealthStatus();

      expect(health.isConnected).toBe(false);
      expect(health.hasClient).toBe(false);
      expect(health.apiId).toBe(true);
      expect(health.apiHash).toBe(true);
      expect(health.phoneNumber).toBe(true);
    });
  });

  describe('Message Transformation', () => {
    it('should transform Telegram message to standard format', () => {
      const service = new TelegramClientService({
        apiId: 12345,
        apiHash: 'test_hash',
      });

      const mockMessage = {
        id: 123,
        message: 'Test message',
        date: 1699000000,
        peerId: { channelId: 456 },
        fromId: { userId: 789 },
        media: { className: 'MessageMediaPhoto' },
        fwdFrom: { fromId: 111 },
        replyTo: { replyToMsgId: 100 },
        views: 50,
      };

      const transformed = service.transformMessage(mockMessage);

      expect(transformed.id).toBe(123);
      expect(transformed.channelId).toBe('456');
      expect(transformed.text).toBe('Test message');
      expect(transformed.date).toBe(1699000000);
      expect(transformed.fromId).toBe('789');
      expect(transformed.mediaType).toBe('MessageMediaPhoto');
      expect(transformed.isForwarded).toBe(true);
      expect(transformed.replyTo).toBe(100);
      expect(transformed.views).toBe(50);
      expect(transformed.raw).toBeDefined();
    });

    it('should handle messages without optional fields', () => {
      const service = new TelegramClientService({
        apiId: 12345,
        apiHash: 'test_hash',
      });

      const mockMessage = {
        id: 456,
        message: '',
        date: 1699000000,
      };

      const transformed = service.transformMessage(mockMessage);

      expect(transformed.id).toBe(456);
      expect(transformed.channelId).toBeNull();
      expect(transformed.text).toBe('');
      expect(transformed.fromId).toBeNull();
      expect(transformed.mediaType).toBeNull();
      expect(transformed.isForwarded).toBe(false);
      expect(transformed.replyTo).toBeNull();
      expect(transformed.views).toBe(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getTelegramClient({
        apiId: 12345,
        apiHash: 'test_hash',
      });

      const instance2 = getTelegramClient();

      expect(instance1).toBe(instance2);
    });
  });
});

// Note: Testes de integração (connect, getMessages, authenticate) requerem
// credenciais reais do Telegram e devem ser executados manualmente em ambiente de teste
