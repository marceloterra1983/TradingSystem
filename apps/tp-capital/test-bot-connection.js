import { Telegraf } from 'telegraf';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '.env'), override: true });

const forwarderToken = process.env.TELEGRAM_FORWARDER_BOT_TOKEN;
const ingestionToken = process.env.TELEGRAM_INGESTION_BOT_TOKEN;

console.log('Testing bot connections...\n');

// Test forwarder bot
const forwarderBot = new Telegraf(forwarderToken);
forwarderBot.telegram.getMe()
  .then(me => {
    console.log('✅ Forwarder Bot connected:');
    console.log('   Username:', me.username);
    console.log('   ID:', me.id);
    console.log('   Name:', me.first_name);
  })
  .catch(err => {
    console.log('❌ Forwarder Bot connection failed:', err.message);
  })
  .finally(() => {
    // Test ingestion bot
    const ingestionBot = new Telegraf(ingestionToken);
    ingestionBot.telegram.getMe()
      .then(me => {
        console.log('\n✅ Ingestion Bot connected:');
        console.log('   Username:', me.username);
        console.log('   ID:', me.id);
        console.log('   Name:', me.first_name);
      })
      .catch(err => {
        console.log('\n❌ Ingestion Bot connection failed:', err.message);
      })
      .finally(() => process.exit(0));
  });
