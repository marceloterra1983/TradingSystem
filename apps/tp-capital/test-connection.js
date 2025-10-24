import { Telegraf } from 'telegraf';
import { config } from './src/config.js';

console.log('Testing Telegram API connection...\n');

const bot = new Telegraf(config.telegram.forwarderBotToken);

console.log('1. Testing getMe()...');
bot.telegram.getMe()
  .then(me => {
    console.log('✅ getMe() successful:',me.username);
    
    console.log('\n2. Testing getUpdates()...');
    return bot.telegram.getUpdates({ limit: 1, timeout: 5 });
  })
  .then(updates => {
    console.log('✅ getUpdates() successful, got', updates.length, 'updates');
    
    console.log('\n3. Now trying bot.launch()...');
    return bot.launch({ allowedUpdates: ['channel_post'] });
  })
  .then(() => {
    console.log('✅ bot.launch() successful!');
    setTimeout(async () => {
      await bot.stop();
      process.exit(0);
    }, 3000);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  });

setTimeout(() => {
  console.log('\n⏱️ 30s timeout reached');
  process.exit(1);
}, 30000);
