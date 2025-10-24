import { Telegraf } from 'telegraf';
import { config } from './src/config.js';

console.log('Testing raw Telegraf launch...\n');

const bot = new Telegraf(config.telegram.forwarderBotToken);

console.log('Bot created, attempting launch...');

bot.launch({
  allowedUpdates: ['channel_post', 'edited_channel_post', 'my_chat_member']
})
.then(() => {
  console.log('✅ Launch successful!');
  setTimeout(() => {
    bot.stop();
    process.exit(0);
  }, 2000);
})
.catch((err) => {
  console.error('❌ Launch failed:', err);
  process.exit(1);
});

setTimeout(() => {
  console.log('⏱️ Timeout - launch is taking too long');
  process.exit(1);
}, 10000);
