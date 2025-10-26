import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import pg from 'pg';
import { config } from './src/config.js';
import { logger } from './src/logger.js';

const { Pool } = pg;

async function updateChannelNames() {
  const apiId = Number(process.env.TELEGRAM_API_ID || 0);
  const apiHash = process.env.TELEGRAM_API_HASH || '';
  const sessionString = process.env.TELEGRAM_SESSION || '';

  if (!apiId || !apiHash || !sessionString) {
    console.error('❌ Telegram credentials not configured');
    process.exit(1);
  }

  // Conectar ao Telegram
  const session = new StringSession(sessionString);
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.connect();
  console.log('✅ Connected to Telegram');

  // Conectar ao banco
  const pool = new Pool({
    host: config.timescale.host,
    port: config.timescale.port,
    database: config.timescale.database,
    user: config.timescale.user,
    password: config.timescale.password,
  });

  console.log('✅ Connected to database');

  try {
    // Buscar mensagens com nomes genéricos
    const result = await pool.query(`
      SELECT DISTINCT source_channel_id 
      FROM tp_capital.forwarded_messages 
      WHERE source_channel_name LIKE 'Channel %' OR source_channel_name LIKE 'Canal %'
    `);

    console.log(`\n📋 Found ${result.rows.length} channels to update:`);

    for (const row of result.rows) {
      const channelId = Number(row.source_channel_id);
      
      try {
        // Buscar nome real do canal
        const entity = await client.getEntity(channelId);
        const realName = entity.title || entity.username || `Canal ${channelId}`;
        
        console.log(`\n🔄 Channel ${channelId}:`);
        console.log(`   Nome real: "${realName}"`);
        
        // Atualizar no banco
        const updateResult = await pool.query(`
          UPDATE tp_capital.forwarded_messages 
          SET source_channel_name = $1 
          WHERE source_channel_id = $2
        `, [realName, channelId]);
        
        console.log(`   ✅ Updated ${updateResult.rowCount} messages`);
      } catch (error) {
        console.error(`   ❌ Failed to update channel ${channelId}:`, error.message);
      }
    }

    console.log('\n✅ All channel names updated!');
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
    await client.disconnect();
    process.exit(0);
  }
}

updateChannelNames();


