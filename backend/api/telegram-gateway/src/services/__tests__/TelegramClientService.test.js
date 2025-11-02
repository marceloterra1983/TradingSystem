import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { TelegramClientService, getTelegramClient } from '../TelegramClientService.js';

describe('TelegramClientService', () => {
  describe('Constructor', () => {
    it('should throw error if API_ID is missing', () => {
      assert.throws(
        () => new TelegramClientService({ apiHash: 'test' }),
        /TELEGRAM_API_ID and TELEGRAM_API_HASH are required/
      );
    });

    it('should throw error if API_HASH is missing', () => {
      assert.throws(
        () => new TelegramClientService({ apiId: 12345 }),
        /TELEGRAM_API_ID and TELEGRAM_API_HASH are required/
      );
    });

    it('should create instance with valid config', () => {
      const service = new TelegramClientService({
        apiId: 12345,
        apiHash: 'test_hash',
        phoneNumber: '+5511999999999',
      });

      assert.strictEqual(service.apiId, 12345);
      assert.strictEqual(service.apiHash, 'test_hash');
      assert.strictEqual(service.phoneNumber, '+5511999999999');
      assert.strictEqual(service.isConnected, false);
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

      assert.strictEqual(health.isConnected, false);
      assert.strictEqual(health.hasClient, false);
      assert.strictEqual(health.apiId, true);
      assert.strictEqual(health.apiHash, true);
      assert.strictEqual(health.phoneNumber, true);
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

      assert.strictEqual(transformed.id, 123);
      assert.strictEqual(transformed.channelId, '456');
      assert.strictEqual(transformed.text, 'Test message');
      assert.strictEqual(transformed.date, 1699000000);
      assert.strictEqual(transformed.fromId, '789');
      assert.strictEqual(transformed.mediaType, 'MessageMediaPhoto');
      assert.strictEqual(transformed.isForwarded, true);
      assert.strictEqual(transformed.replyTo, 100);
      assert.strictEqual(transformed.views, 50);
      assert.ok(transformed.raw);
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

      assert.strictEqual(transformed.id, 456);
      assert.strictEqual(transformed.channelId, null);
      assert.strictEqual(transformed.text, '');
      assert.strictEqual(transformed.fromId, null);
      assert.strictEqual(transformed.mediaType, null);
      assert.strictEqual(transformed.isForwarded, false);
      assert.strictEqual(transformed.replyTo, null);
      assert.strictEqual(transformed.views, 0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getTelegramClient({
        apiId: 12345,
        apiHash: 'test_hash',
      });

      const instance2 = getTelegramClient();

      assert.strictEqual(instance1, instance2);
    });
  });
});

// Note: Testes de integração (connect, getMessages, authenticate) requerem
// credenciais reais do Telegram e devem ser executados manualmente em ambiente de teste

