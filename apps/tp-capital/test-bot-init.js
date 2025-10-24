import { config } from './src/config.js';
import { logger } from './src/logger.js';
import { createTelegramIngestion } from './src/telegramIngestion.js';
import { createTelegramForwarder } from './src/telegramForwarder.js';

console.log('Testing bot initialization...\n');

console.log('Config values:');
console.log('  TELEGRAM_INGESTION_BOT_TOKEN:', config.telegram.ingestionBotToken ? 'SET' : 'NOT SET');
console.log('  TELEGRAM_FORWARDER_BOT_TOKEN:', config.telegram.forwarderBotToken ? 'SET' : 'NOT SET');
console.log('  Source Channels:', config.telegram.forwarderSourceChannels);
console.log('  Destination Channel:', config.telegram.destinationChannelId);
console.log('');

console.log('Creating Ingestion Bot...');
const ingestion = createTelegramIngestion();
console.log('Ingestion bot:', ingestion ? 'CREATED' : 'NULL (check warnings above)');
console.log('');

console.log('Creating Forwarder Bot...');
const forwarder = createTelegramForwarder();
console.log('Forwarder bot:', forwarder ? 'CREATED' : 'NULL (check warnings above)');

process.exit(0);
