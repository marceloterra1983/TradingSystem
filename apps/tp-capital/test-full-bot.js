import { config } from './src/config.js';
import { logger } from './src/logger.js';
import { createTelegramIngestion } from './src/telegramIngestion.js';
import { createTelegramForwarder } from './src/telegramForwarder.js';

console.log('=== Full Bot Test with Logging ===\n');

console.log('Config:');
console.log('  Forwarder Bot Token:', config.telegram.forwarderBotToken ? 'SET' : 'NOT SET');
console.log('  Source Channels:', config.telegram.forwarderSourceChannels);
console.log('  Destination:', config.telegram.destinationChannelId);
console.log('');

const forwarder = createTelegramForwarder();
if (!forwarder) {
  console.log('❌ Forwarder bot not created');
  process.exit(1);
}

console.log('✅ Forwarder bot created');
console.log('Launching...\n');

forwarder.launch()
  .then(() => {
    console.log('✅ Forwarder bot launched successfully!');
    console.log('Bot is now listening for messages...');
    console.log('Send a message to one of the source channels to test');
  })
  .catch((err) => {
    console.error('❌ Launch failed:', err.message);
    process.exit(1);
  });

// Keep process alive
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await forwarder.bot.stop();
  process.exit(0);
});
