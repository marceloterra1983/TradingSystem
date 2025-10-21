import { config } from './src/config.js';
import { createTelegramIngestion } from './src/telegramIngestion.js';
import { createTelegramForwarder } from './src/telegramForwarder.js';

console.log('=== Testing Telegram Bots ===\n');

console.log('Config:');
console.log('  Ingestion Bot Token:', config.telegram.ingestionBotToken ? 'SET' : 'NOT SET');
console.log('  Forwarder Bot Token:', config.telegram.forwarderBotToken ? 'SET' : 'NOT SET');
console.log('  Source Channels:', config.telegram.forwarderSourceChannels);
console.log('  Destination Channel:', config.telegram.destinationChannelId);
console.log('  Mode:', config.telegram.mode);
console.log('');

console.log('Creating Telegram Ingestion Bot...');
const telegramIngestion = createTelegramIngestion();
if (telegramIngestion) {
  console.log('✅ Ingestion bot created successfully');
} else {
  console.log('❌ Ingestion bot creation failed or disabled');
}
console.log('');

console.log('Creating Telegram Forwarder Bot...');
const telegramForwarder = createTelegramForwarder();
if (telegramForwarder) {
  console.log('✅ Forwarder bot created successfully');
  console.log('   Source Channels:', config.telegram.forwarderSourceChannels);
  console.log('   Destination:', config.telegram.destinationChannelId);
} else {
  console.log('❌ Forwarder bot creation failed or disabled');
}
console.log('');

if (telegramIngestion) {
  console.log('Launching ingestion bot...');
  telegramIngestion.launch()
    .then(() => console.log('✅ Ingestion bot launched'))
    .catch(err => console.error('❌ Ingestion bot launch failed:', err.message));
}

if (telegramForwarder) {
  console.log('Launching forwarder bot...');
  telegramForwarder.launch()
    .then(() => console.log('✅ Forwarder bot launched'))
    .catch(err => console.error('❌ Forwarder bot launch failed:', err.message));
}

console.log('\n=== Bots are now running. Press Ctrl+C to stop ===\n');

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  const stops = [];
  if (telegramIngestion?.bot) stops.push(telegramIngestion.bot.stop());
  if (telegramForwarder?.bot) stops.push(telegramForwarder.bot.stop());
  await Promise.all(stops);
  process.exit(0);
});
