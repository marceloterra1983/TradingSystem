import { Telegraf } from 'telegraf';
import { config } from './src/config.js';

console.log('Resetting webhooks for both bots...\n');

async function resetWebhook(token, name) {
  const bot = new Telegraf(token);
  try {
    // Delete webhook
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    console.log(`✅ ${name}: Webhook deleted`);
    
    // Get webhook info to confirm
    const info = await bot.telegram.getWebhookInfo();
    console.log(`   Webhook URL: ${info.url || 'none'}`);
    console.log(`   Pending updates: ${info.pending_update_count}`);
  } catch (err) {
    console.error(`❌ ${name} failed:`, err.message);
  }
}

await resetWebhook(config.telegram.forwarderBotToken, 'Forwarder Bot');
console.log('');
await resetWebhook(config.telegram.ingestionBotToken, 'Ingestion Bot');

process.exit(0);
