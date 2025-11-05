import { Pool, PoolClient } from 'pg';

/**
 * Database Seeder for E2E Tests
 * Manages test data seeding and cleanup for TimescaleDB
 *
 * Usage:
 * ```typescript
 * const seeder = new DatabaseSeeder();
 * await seeder.connect();
 * await seeder.cleanDatabase();
 * await seeder.seedChannels(3);
 * await seeder.seedMessages(50);
 * await seeder.close();
 * ```
 */

export interface ChannelSeed {
  channel_id: string;
  title: string;
  label: string;
  active: boolean;
  description?: string;
}

export interface MessageSeed {
  message_id: number;
  channel_id: string;
  text: string;
  date: Date;
  sender?: string;
  has_media?: boolean;
  photo_url?: string;
  link_preview?: any;
}

export interface GatewayLogSeed {
  level: 'info' | 'warn' | 'error';
  message: string;
  timestamp: Date;
  metadata?: any;
}

export class DatabaseSeeder {
  private pool: Pool | null = null;
  private client: PoolClient | null = null;

  /**
   * Default channels for testing
   */
  private static readonly DEFAULT_CHANNELS: ChannelSeed[] = [
    {
      channel_id: '-1001649127710',
      title: 'TP Capital',
      label: 'TP',
      active: true,
      description: 'Trading signals and analysis',
    },
    {
      channel_id: '-1001744113331',
      title: 'Jonas Trading',
      label: 'jonas',
      active: true,
      description: 'Market insights',
    },
    {
      channel_id: '-1001412188586',
      title: 'Ações Brasileiras',
      label: 'acoes',
      active: false,
      description: 'Brazilian stocks',
    },
  ];

  constructor(
    private config = {
      host: process.env.TIMESCALEDB_HOST || 'localhost',
      port: parseInt(process.env.TIMESCALEDB_PORT || '7001'),
      database: process.env.TIMESCALEDB_DATABASE || 'telegram_gateway',
      user: process.env.TIMESCALEDB_USER || 'telegram',
      password: process.env.TIMESCALEDB_PASSWORD || 'telegram_dev_pass',
    }
  ) {}

  /**
   * Connect to database
   */
  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool(this.config);

    try {
      this.client = await this.pool.connect();
      console.log('✓ Connected to TimescaleDB for seeding');
    } catch (error) {
      console.error('✗ Failed to connect to database:', error);
      throw error;
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }

    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }

    console.log('✓ Database connection closed');
  }

  /**
   * Clean all test data from database
   */
  async cleanDatabase(): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    try {
      await this.client.query('BEGIN');

      // Disable triggers temporarily for faster deletion
      await this.client.query('SET session_replication_role = replica');

      // Delete in correct order (respecting foreign keys)
      await this.client.query('DELETE FROM gateway_logs WHERE TRUE');
      await this.client.query('DELETE FROM messages WHERE TRUE');
      await this.client.query('DELETE FROM channels WHERE TRUE');

      // Re-enable triggers
      await this.client.query('SET session_replication_role = DEFAULT');

      await this.client.query('COMMIT');

      console.log('✓ Database cleaned');
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error('✗ Failed to clean database:', error);
      throw error;
    }
  }

  /**
   * Seed channels
   */
  async seedChannels(
    channels: ChannelSeed[] = DatabaseSeeder.DEFAULT_CHANNELS
  ): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    try {
      const query = `
        INSERT INTO channels (channel_id, title, label, active, description, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        ON CONFLICT (channel_id) DO UPDATE SET
          title = EXCLUDED.title,
          label = EXCLUDED.label,
          active = EXCLUDED.active,
          description = EXCLUDED.description,
          updated_at = NOW()
      `;

      for (const channel of channels) {
        await this.client.query(query, [
          channel.channel_id,
          channel.title,
          channel.label,
          channel.active,
          channel.description || null,
        ]);
      }

      console.log(`✓ Seeded ${channels.length} channels`);
    } catch (error) {
      console.error('✗ Failed to seed channels:', error);
      throw error;
    }
  }

  /**
   * Seed messages
   */
  async seedMessages(
    count: number = 50,
    channelId?: string,
    options: {
      withMedia?: boolean;
      withLinkPreviews?: boolean;
      dateRange?: { start: Date; end: Date };
    } = {}
  ): Promise<MessageSeed[]> {
    if (!this.client) throw new Error('Database not connected');

    const channels = channelId
      ? [channelId]
      : DatabaseSeeder.DEFAULT_CHANNELS.map(c => c.channel_id);

    const messages: MessageSeed[] = [];
    const now = new Date();
    const dateStart = options.dateRange?.start || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const dateEnd = options.dateRange?.end || now;

    try {
      await this.client.query('BEGIN');

      const query = `
        INSERT INTO messages (
          message_id, channel_id, text, date, sender, has_media, photo_url, link_preview
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (message_id, channel_id) DO NOTHING
      `;

      for (let i = 0; i < count; i++) {
        const channelId = channels[i % channels.length];
        const messageId = 5000 + i;
        const date = new Date(
          dateStart.getTime() +
            Math.random() * (dateEnd.getTime() - dateStart.getTime())
        );

        const hasMedia = options.withMedia && Math.random() > 0.7;
        const hasLinkPreview = options.withLinkPreviews && Math.random() > 0.8;

        const message: MessageSeed = {
          message_id: messageId,
          channel_id: channelId,
          text: this.generateMessageText(i, hasLinkPreview),
          date,
          sender: ['Admin', 'Bot', 'Trader', 'Analyst'][Math.floor(Math.random() * 4)],
          has_media: hasMedia,
          photo_url: hasMedia ? `https://example.com/photo_${messageId}.jpg` : null,
          link_preview: hasLinkPreview ? this.generateLinkPreview(i) : null,
        };

        await this.client.query(query, [
          message.message_id,
          message.channel_id,
          message.text,
          message.date,
          message.sender,
          message.has_media,
          message.photo_url,
          message.link_preview ? JSON.stringify(message.link_preview) : null,
        ]);

        messages.push(message);
      }

      await this.client.query('COMMIT');

      console.log(`✓ Seeded ${count} messages`);

      return messages;
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error('✗ Failed to seed messages:', error);
      throw error;
    }
  }

  /**
   * Seed gateway logs
   */
  async seedGatewayLogs(count: number = 100): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    try {
      await this.client.query('BEGIN');

      const query = `
        INSERT INTO gateway_logs (level, message, timestamp, metadata)
        VALUES ($1, $2, $3, $4)
      `;

      const levels: Array<'info' | 'warn' | 'error'> = ['info', 'warn', 'error'];
      const messages = {
        info: [
          'Gateway connected to Telegram',
          'Message received from channel',
          'Heartbeat successful',
          'Cache updated',
        ],
        warn: [
          'Rate limit approaching',
          'Slow database query',
          'High memory usage',
          'Connection timeout',
        ],
        error: [
          'Failed to download photo',
          'Database connection lost',
          'API request failed',
          'Invalid message format',
        ],
      };

      for (let i = 0; i < count; i++) {
        const level = levels[Math.floor(Math.random() * levels.length)];
        const messageText =
          messages[level][Math.floor(Math.random() * messages[level].length)];
        const timestamp = new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000);

        const metadata =
          level === 'error'
            ? { errorCode: 'ERR_' + Math.floor(Math.random() * 1000) }
            : {};

        await this.client.query(query, [level, messageText, timestamp, JSON.stringify(metadata)]);
      }

      await this.client.query('COMMIT');

      console.log(`✓ Seeded ${count} gateway logs`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error('✗ Failed to seed gateway logs:', error);
      throw error;
    }
  }

  /**
   * Create database snapshot
   */
  async createSnapshot(name: string): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    try {
      // Create snapshot schema if doesn't exist
      await this.client.query(`CREATE SCHEMA IF NOT EXISTS snapshots`);

      // Copy current data to snapshot
      await this.client.query(`
        CREATE TABLE IF NOT EXISTS snapshots.${name}_channels AS
        SELECT * FROM channels
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS snapshots.${name}_messages AS
        SELECT * FROM messages
      `);

      await this.client.query(`
        CREATE TABLE IF NOT EXISTS snapshots.${name}_logs AS
        SELECT * FROM gateway_logs
      `);

      console.log(`✓ Created snapshot: ${name}`);
    } catch (error) {
      console.error(`✗ Failed to create snapshot ${name}:`, error);
      throw error;
    }
  }

  /**
   * Restore database snapshot
   */
  async restoreSnapshot(name: string): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    try {
      await this.client.query('BEGIN');

      // Clean current data
      await this.cleanDatabase();

      // Restore from snapshot
      await this.client.query(`
        INSERT INTO channels
        SELECT * FROM snapshots.${name}_channels
      `);

      await this.client.query(`
        INSERT INTO messages
        SELECT * FROM snapshots.${name}_messages
      `);

      await this.client.query(`
        INSERT INTO gateway_logs
        SELECT * FROM snapshots.${name}_logs
      `);

      await this.client.query('COMMIT');

      console.log(`✓ Restored snapshot: ${name}`);
    } catch (error) {
      await this.client.query('ROLLBACK');
      console.error(`✗ Failed to restore snapshot ${name}:`, error);
      throw error;
    }
  }

  /**
   * Delete snapshot
   */
  async deleteSnapshot(name: string): Promise<void> {
    if (!this.client) throw new Error('Database not connected');

    try {
      await this.client.query(`DROP TABLE IF EXISTS snapshots.${name}_channels CASCADE`);
      await this.client.query(`DROP TABLE IF EXISTS snapshots.${name}_messages CASCADE`);
      await this.client.query(`DROP TABLE IF EXISTS snapshots.${name}_logs CASCADE`);

      console.log(`✓ Deleted snapshot: ${name}`);
    } catch (error) {
      console.error(`✗ Failed to delete snapshot ${name}:`, error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getStatistics(): Promise<{
    channels: number;
    messages: number;
    logs: number;
  }> {
    if (!this.client) throw new Error('Database not connected');

    const channelsCount = await this.client.query('SELECT COUNT(*) FROM channels');
    const messagesCount = await this.client.query('SELECT COUNT(*) FROM messages');
    const logsCount = await this.client.query('SELECT COUNT(*) FROM gateway_logs');

    return {
      channels: parseInt(channelsCount.rows[0].count),
      messages: parseInt(messagesCount.rows[0].count),
      logs: parseInt(logsCount.rows[0].count),
    };
  }

  // Private helper methods

  private generateMessageText(index: number, hasLinkPreview: boolean): string {
    if (hasLinkPreview) {
      const linkTypes = [
        'https://twitter.com/user/status/123456',
        'https://www.youtube.com/watch?v=abc123',
        'https://www.instagram.com/p/abc123/',
        'https://example.com/article-title',
      ];
      return linkTypes[index % linkTypes.length];
    }

    const templates = [
      'COMPRA: PETR4 @ R$ 38.50 - Stop: R$ 37.80 - Alvo: R$ 40.00',
      'VENDA: VALE3 @ R$ 65.30 - Stop: R$ 66.00 - Alvo: R$ 63.50',
      'ATENÇÃO: ITUB4 rompendo resistência em R$ 28.50',
      'Mercado em tendência de alta. Fique atento aos suportes.',
      'Análise técnica PETR4: Padrão de reversão formado no gráfico diário',
      'Stop loss movido para breakeven em VALE3',
      'Alvo 1 atingido em ITUB4! Parcial realizada.',
      'Aguardando pullback para entrada em BBDC4',
    ];

    return templates[index % templates.length];
  }

  private generateLinkPreview(index: number): any {
    const types = ['twitter', 'youtube', 'instagram', 'generic'];
    const type = types[index % types.length];

    const previews = {
      twitter: {
        type: 'twitter',
        url: `https://twitter.com/user/status/${1000000 + index}`,
        tweetId: String(1000000 + index),
        text: 'Market update: Important news for traders',
        author: {
          id: '123456',
          name: 'Trading Expert',
          username: 'tradingexpert',
          profileImage: 'https://example.com/avatar.jpg',
        },
        metrics: {
          likes: Math.floor(Math.random() * 100),
          retweets: Math.floor(Math.random() * 50),
          replies: Math.floor(Math.random() * 20),
        },
      },
      youtube: {
        type: 'youtube',
        url: `https://www.youtube.com/watch?v=abc${index}`,
        videoId: `abc${index}`,
        title: 'Technical Analysis Tutorial',
        author: {
          name: 'Trading Channel',
          url: 'https://www.youtube.com/@tradingchannel',
        },
        thumbnail: {
          url: `https://i.ytimg.com/vi/abc${index}/hqdefault.jpg`,
          width: 480,
          height: 360,
        },
      },
      instagram: {
        type: 'instagram',
        url: `https://www.instagram.com/p/abc${index}/`,
        postId: `abc${index}`,
        caption: 'Check out this chart analysis',
        author: {
          username: 'trader_pro',
          profileImage: 'https://example.com/profile.jpg',
        },
      },
      generic: {
        type: 'generic',
        url: `https://example.com/article-${index}`,
        title: 'Market Analysis Article',
        description: 'Detailed analysis of market trends',
        siteName: 'Trading News',
        image: {
          url: `https://example.com/og-image-${index}.jpg`,
          width: 1200,
          height: 630,
        },
      },
    };

    return previews[type];
  }
}

/**
 * Quick seeder for common test scenarios
 */
export async function quickSeed(scenario: 'empty' | 'small' | 'medium' | 'large' = 'small') {
  const seeder = new DatabaseSeeder();

  try {
    await seeder.connect();
    await seeder.cleanDatabase();

    if (scenario === 'empty') {
      console.log('✓ Quick seed: Empty database');
      return;
    }

    await seeder.seedChannels();

    const messageCounts = {
      small: 10,
      medium: 50,
      large: 500,
    };

    await seeder.seedMessages(messageCounts[scenario], undefined, {
      withMedia: true,
      withLinkPreviews: true,
    });

    await seeder.seedGatewayLogs(50);

    console.log(`✓ Quick seed: ${scenario} dataset`);
  } finally {
    await seeder.close();
  }
}
