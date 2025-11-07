import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from './env.js';
import { logger } from './logger.js';
import { TOOL_COMMANDS } from './commands.js';

// Calculate repo root based on this file's location (backend/api/launcher-api/src/server.ts)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '../../..');

const execAsync = promisify(exec);

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  pinoHttp({
    logger,
    autoLogging: {
      ignorePaths: ['/healthz']
    }
  } as any)
);

app.get('/healthz', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.get('/api/launcher/commands', (_req, res) => {
  const commands = Object.values(TOOL_COMMANDS).map(
    ({ id, label, description }) => ({ id, label, description })
  );
  res.json({ commands });
});

function verifyToken(headerValue: string | undefined): boolean {
  if (!env.TOKEN) {
    return true;
  }
  return headerValue === env.TOKEN;
}

app.post('/api/launcher/start', async (req, res) => {
  const authorized = verifyToken(
    (req.headers['x-launcher-token'] as string | undefined) ??
      (req.headers.authorization?.replace(/^Bearer\s+/i, '') ?? undefined)
  );
  if (!authorized) {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { toolId } = req.body ?? {};
  if (typeof toolId !== 'string' || !(toolId in TOOL_COMMANDS)) {
    return res.status(400).json({ message: 'Invalid toolId' });
  }

  const commandDef = TOOL_COMMANDS[toolId];
  const command = commandDef.command;
  
  // For dashboard-rebuild, ensure we're in the repo root to load .env correctly
  // The script dashboard-docker.sh also changes to PROJECT_ROOT internally,
  // but we set cwd here to ensure Docker Compose finds .env relative paths
  const repoRoot = toolId === 'dashboard-rebuild' ? REPO_ROOT : process.cwd();
  
  logger.info({ toolId, command, cwd: repoRoot }, 'Executing docker command');
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: repoRoot,
      timeout: 5 * 60 * 1000
    });
    res.json({
      ok: true,
      toolId,
      stdout: stdout?.trim(),
      stderr: stderr?.trim()
    });
  } catch (error) {
    logger.error({ toolId, error }, 'Failed to execute docker command');
    res.status(500).json({
      message: 'Falha ao executar comando',
      detail: error instanceof Error ? error.message : String(error)
    });
  }
});

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, 'Launcher API listening');
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'Shutting down launcher API');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
