#!/usr/bin/env node

import pg from 'pg';

const dbUrl = process.env.TELEGRAM_GATEWAY_DB_URL || 
              process.env.GATEWAY_DATABASE_URL || 
              'postgresql://timescale:changeme@localhost:5433/APPS-TELEGRAM-GATEWAY';

const schema = process.env.TELEGRAM_GATEWAY_DB_SCHEMA || 
               process.env.GATEWAY_DATABASE_SCHEMA || 
               'telegram_gateway';

const channelId = '-1001649127710';

async function debugChannel() {
  const pool = new pg.Pool({
    connectionString: dbUrl,
    ssl: false
  });

  try {
    console.log('🔍 Verificando canal:', channelId);
    console.log('📦 Database:', dbUrl.replace(/:[^:@]+@/, ':****@'));
    console.log('📋 Schema:', schema);
    console.log('');

    // Verificar se o canal existe
    const channelQuery = `
      SELECT channel_id, label, description, is_active, created_at
      FROM ${schema}.channels
      WHERE channel_id = $1
    `;
    
    console.log('1️⃣ Verificando registro do canal...');
    const channelResult = await pool.query(channelQuery, [channelId]);
    
    if (channelResult.rows.length === 0) {
      console.log('❌ Canal NÃO está registrado na tabela channels');
      console.log('');
      console.log('📋 Canais registrados:');
      const allChannelsResult = await pool.query(`
        SELECT channel_id, label, is_active 
        FROM ${schema}.channels 
        ORDER BY created_at DESC
      `);
      console.table(allChannelsResult.rows);
      console.log('');
      console.log('💡 Solução: Registre o canal com o comando:');
      console.log(`
INSERT INTO ${schema}.channels (channel_id, label, description, is_active)
VALUES ('${channelId}', 'Operações | TP Capital', 'Canal de sinais do TP Capital', true)
ON CONFLICT (channel_id) DO UPDATE SET is_active = true;
      `);
    } else {
      const channel = channelResult.rows[0];
      console.log('✅ Canal está registrado:');
      console.log('   ID:', channel.channel_id);
      console.log('   Label:', channel.label);
      console.log('   Ativo:', channel.is_active ? '✅' : '❌');
      console.log('   Criado em:', channel.created_at);
      console.log('');

      if (!channel.is_active) {
        console.log('⚠️ Canal está INATIVO');
        console.log('💡 Solução: Ative o canal com o comando:');
        console.log(`
UPDATE ${schema}.channels
SET is_active = true
WHERE channel_id = '${channelId}';
        `);
        console.log('');
      }

      // Verificar mensagens do canal
      console.log('2️⃣ Verificando mensagens do canal...');
      const messagesQuery = `
        SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'received') as received,
          COUNT(*) FILTER (WHERE status = 'published') as published,
          COUNT(*) FILTER (WHERE status = 'queued') as queued,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          MAX(message_id) as last_message_id,
          MAX(telegram_date) as last_message_date
        FROM ${schema}.messages
        WHERE channel_id = $1
      `;
      
      const messagesResult = await pool.query(messagesQuery, [channelId]);
      const stats = messagesResult.rows[0];
      
      console.log('📊 Estatísticas de mensagens:');
      console.log('   Total:', stats.total);
      console.log('   Received:', stats.received);
      console.log('   Published:', stats.published);
      console.log('   Queued:', stats.queued);
      console.log('   Failed:', stats.failed);
      console.log('   Última mensagem ID:', stats.last_message_id);
      console.log('   Última mensagem data:', stats.last_message_date);
      console.log('');

      // Verificar últimas 5 mensagens
      console.log('3️⃣ Últimas 5 mensagens do canal:');
      const recentMessagesQuery = `
        SELECT message_id, status, LEFT(text, 50) as text_preview, telegram_date
        FROM ${schema}.messages
        WHERE channel_id = $1
        ORDER BY message_id DESC
        LIMIT 5
      `;
      
      const recentResult = await pool.query(recentMessagesQuery, [channelId]);
      console.table(recentResult.rows);
    }

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugChannel();



