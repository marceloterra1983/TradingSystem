import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import dotenv from 'dotenv';
import path from 'node:path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env');
dotenv.config({ path: envPath });

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH;
const phoneNumber = process.env.TELEGRAM_PHONE_NUMBER;
const sessionString = process.env.TELEGRAM_SESSION || '';

console.log('\n=== Telegram User Account Authentication ===\n');
console.log('API ID:', apiId);
console.log('Phone:', phoneNumber);
console.log('Session:', sessionString ? 'EXISTS (will try to reuse)' : 'NEW (will authenticate)');
console.log('');

if (!apiId || !apiHash || !phoneNumber) {
  console.error('❌ Missing required credentials in .env file:');
  console.error('   TELEGRAM_API_ID, TELEGRAM_API_HASH, TELEGRAM_PHONE_NUMBER');
  process.exit(1);
}

const session = new StringSession(sessionString);
const client = new TelegramClient(session, apiId, apiHash, {
  connectionRetries: 5,
});

(async () => {
  try {
    console.log('🔄 Connecting to Telegram...\n');

    await client.start({
      phoneNumber: async () => phoneNumber,
      password: async () => {
        console.log('');
        return await input.text('🔐 Please enter your 2FA password (press Enter to skip): ');
      },
      phoneCode: async () => {
        console.log('');
        console.log('📱 A code was sent to your Telegram app');
        return await input.text('Enter the code here: ');
      },
      onError: (err) => console.error('❌ Error:', err.message),
    });

    console.log('');
    console.log('✅ Authentication successful!');
    console.log('');

    // Get user info
    const me = await client.getMe();
    console.log('👤 Logged in as:', me.username || me.firstName);
    console.log('');

    // Save session string
    const newSessionString = client.session.save();
    console.log('📝 Session String (save this to TELEGRAM_SESSION in .env):');
    console.log('');
    console.log(newSessionString);
    console.log('');
    
    if (sessionString !== newSessionString) {
      console.log('⚠️  IMPORTANT: Update your .env file with:');
      console.log('');
      console.log(`TELEGRAM_SESSION=${newSessionString}`);
      console.log('');
      console.log('This will avoid re-authentication next time!');
    } else {
      console.log('✅ Session is already saved in .env');
    }

    await client.disconnect();
    console.log('');
    console.log('✅ Authentication complete! You can now start the TP-Capital service.');
    console.log('');
    process.exit(0);
  } catch (error) {
    console.error('');
    console.error('❌ Authentication failed:', error.message);
    console.error('');
    if (error.errorMessage === 'PHONE_NUMBER_INVALID') {
      console.error('💡 Check if your phone number is correct in .env:');
      console.error(`   Current: ${phoneNumber}`);
      console.error('   Format: +COUNTRYCODE + DDD + NUMBER (e.g., +5511987654321)');
    }
    console.error('');
    process.exit(1);
  }
})();


