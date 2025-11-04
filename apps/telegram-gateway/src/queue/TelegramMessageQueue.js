import amqp from 'amqplib';
import { logger } from '../logger.js';

/**
 * RabbitMQ Message Queue for Telegram
 * 
 * Optional component for pub/sub pattern (Phase 2)
 * Provides decoupling between Gateway and consumers
 * 
 * Enable with: TELEGRAM_ENABLE_QUEUE=true
 */
export class TelegramMessageQueue {
  constructor(config = {}) {
    this.config = {
      host: config.host || process.env.RABBITMQ_HOST || 'localhost',
      port: config.port || process.env.RABBITMQ_PORT || 5672,
      user: config.user || process.env.TELEGRAM_RABBITMQ_USER || 'telegram',
      password: config.password || process.env.TELEGRAM_RABBITMQ_PASSWORD,
      vhost: config.vhost || 'telegram'
    };
    
    this.EXCHANGE = 'telegram.messages';
    this.ROUTING_KEY_PREFIX = 'telegram.channel.';
    this.connection = null;
    this.channel = null;
  }

  /**
   * Initialize connection and create topology
   */
  async initialize() {
    const connectionString = `amqp://${this.config.user}:${this.config.password}@${this.config.host}:${this.config.port}/${this.config.vhost}`;
    
    this.connection = await amqp.connect(connectionString);
    this.channel = await this.connection.createChannel();
    
    // Create topic exchange
    await this.channel.assertExchange(
      this.EXCHANGE,
      'topic',
      { durable: true }
    );
    
    // Create dead letter queue
    await this.channel.assertQueue('telegram.messages.dlq', {
      durable: true,
      arguments: {
        'x-message-ttl': 86400000, // 24 hours
        'x-max-length': 10000
      }
    });
    
    logger.info('RabbitMQ queue initialized');
    return this.channel;
  }

  /**
   * Publish message to queue
   */
  async publishMessage(message) {
    if (!this.channel) {
      await this.initialize();
    }
    
    const routingKey = `${this.ROUTING_KEY_PREFIX}${message.channel_id}`;
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    
    this.channel.publish(
      this.EXCHANGE,
      routingKey,
      messageBuffer,
      {
        persistent: true,
        contentType: 'application/json',
        timestamp: Date.now(),
        messageId: `${message.channel_id}:${message.message_id}`
      }
    );
    
    logger.debug({ messageId: message.message_id }, 'Message published to queue');
    return true;
  }

  /**
   * Subscribe to channel messages
   * 
   * NOTE: Implementation placeholder for Phase 2
   * Consumer logic will be in TP Capital service
   */
  async subscribeToChannel(channelId, callback) {
    // Phase 2 implementation
    throw new Error('Queue consumption not implemented yet (Phase 2)');
  }

  /**
   * Close connection
   */
  async disconnect() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
    logger.info('RabbitMQ disconnected');
  }
}

