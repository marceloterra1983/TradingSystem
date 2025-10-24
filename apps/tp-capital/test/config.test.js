import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

// Create a temporary .env in a temp directory and point TP_CAPITAL_ENV_PATH to it
const tmpDir = fs.mkdtempSync(path.join(process.cwd(), '.tmp-env-'));
const tmpEnv = path.join(tmpDir, '.env');
fs.writeFileSync(
  tmpEnv,
  [
    'TELEGRAM_INGESTION_BOT_TOKEN=token123',
    'TELEGRAM_SOURCE_CHANNEL_IDS=123, 456 ,789',
    'TELEGRAM_DESTINATION_CHANNEL_ID=9999',
    'TELEGRAM_MODE=webhook',
    'QUESTDB_HOST=questdb.local',
    'QUESTDB_HTTP_PORT=9100',
    'QUESTDB_ILP_PORT=9109',
    'QUESTDB_USER=userx',
    'QUESTDB_PASSWORD=passx',
    'PORT=4010'
  ].join('\n')
);

process.env.TP_CAPITAL_ENV_PATH = tmpEnv;

describe('tp-capital config', () => {
  let cfg;
  before(async () => {
    const mod = await import('../src/config.js');
    cfg = mod.config;
  });

  it('loads environment from TP_CAPITAL_ENV_PATH', () => {
    assert.equal(cfg.telegram.ingestionBotToken, 'token123');
  });

  it('parses channel ids into numbers', () => {
    assert.deepEqual(cfg.telegram.forwarderSourceChannels, [123, 456, 789]);
    assert.equal(cfg.telegram.destinationChannelId, 9999);
  });

  it('sets mode and webhook defaults', () => {
    assert.equal(cfg.telegram.mode, 'webhook');
  });

  it('maps questdb config and server port', () => {
    assert.equal(cfg.questdb.host, 'questdb.local');
    assert.equal(cfg.questdb.httpPort, 9100);
    assert.equal(cfg.questdb.ilpPort, 9109);
    assert.equal(cfg.questdb.user, 'userx');
    assert.equal(cfg.questdb.password, 'passx');
    assert.equal(cfg.server.port, 4010);
  });
});
