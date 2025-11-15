import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';
import input from 'input';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config, validateConfig } from './config.js';
import { logger } from './logger.js';

validateConfig(logger);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sessionDir = path.resolve(__dirname, '..', '.session');
const sessionFile = path.join(sessionDir, 'telegram-gateway.session');

if (!fs.existsSync(sessionDir)) {
  fs.mkdirSync(sessionDir, { recursive: true });
}

let sessionString = '';
if (fs.existsSync(sessionFile)) {
  try {
    sessionString = fs.readFileSync(sessionFile, 'utf8').trim();
    logger.info({ sessionFile }, '[Auth] Loaded existing session from file');
  } catch (error) {
    logger.warn({ err: error, sessionFile }, '[Auth] Failed to read existing session file');
  }
}

const client = new TelegramClient(
  new StringSession(sessionString),
  config.telegram.apiId,
  config.telegram.apiHash,
  {
    connectionRetries: 5,
  }
);

const promptPhoneNumber = async () => {
  if (config.telegram.phoneNumber) {
    return config.telegram.phoneNumber;
  }
  const provided = (await input.text('Informe o número de telefone (ex: +5567991908000): ')).trim();
  if (!provided) {
    throw new Error('Número de telefone é obrigatório para autenticação.');
  }
  return provided;
};

try {
  logger.info('[Auth] Starting interactive Telegram authentication');
  await client.start({
    phoneNumber: promptPhoneNumber,
    password: async () => (await input.text('Digite sua senha 2FA (Enter se não tiver): ')).trim(),
    phoneCode: async () => (await input.text('Digite o código recebido por SMS: ')).trim(),
    onError: (err) => logger.error({ err }, '[Auth] Telegram client error'),
  });

  const newSession = client.session.save();
  fs.writeFileSync(sessionFile, newSession, 'utf8');
  logger.info({ sessionFile }, '[Auth] Session saved successfully');
  console.log('✅ Autenticação concluída e sessão salva em', sessionFile);
  process.exit(0);
} catch (error) {
  logger.error({ err: error }, '[Auth] Failed to authenticate Telegram client');
  console.error('❌ Falha na autenticação:', error.message);
  process.exit(1);
} finally {
  await client.disconnect();
}

