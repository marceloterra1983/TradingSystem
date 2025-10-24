import { createTelegramForwarderManual } from './src/telegramForwarderManual.js';

console.log('Testing manual forwarder...\n');

const forwarder = createTelegramForwarderManual();
if (!forwarder) {
  console.log('❌ Forwarder not created');
  process.exit(1);
}

console.log('✅ Forwarder created');
console.log('Launching...\n');

forwarder.launch()
  .then(() => {
    console.log('✅ Forwarder launched successfully!');
    console.log('Polling for messages... Send a message to test!');
  })
  .catch((err) => {
    console.error('❌ Launch failed:', err);
    process.exit(1);
  });

// Keep alive for testing
setTimeout(() => {
  console.log('\n⏱️ 60 seconds elapsed, stopping...');
  forwarder.stop().then(() => process.exit(0));
}, 60000);

process.on('SIGINT', async () => {
  console.log('\nStopping...');
  await forwarder.stop();
  process.exit(0);
});
