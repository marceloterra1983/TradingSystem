#!/usr/bin/env node
/**
 * Docker Control Server
 *
 * HTTP server para gerenciar containers Docker com privilégios elevados
 * Roda no host local para ter acesso direto ao Docker daemon
 *
 * Porta: 9876
 * Requisitos: Usuário no grupo docker (sudo usermod -aG docker $USER)
 */

import http from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const PORT = 9876;
const HOST = '127.0.0.1';

// Lista de containers permitidos para restart
const ALLOWED_CONTAINERS = [
  // Course Crawler
  'course-crawler-api',
  'course-crawler-worker',
  'course-crawler-db',

  // Documentation
  'docs-hub',
  'docs-api',

  // Workspace
  'workspace-api',
  'workspace-db',

  // TP Capital
  'tp-capital-api',
  'tp-capital-timescale',
  'tp-capital-redis-master',
  'tp-capital-redis-replica',
  'tp-capital-pgbouncer',

  // Telegram Gateway
  'telegram-gateway-api',
  'telegram-mtproto',
  'telegram-timescale',
  'telegram-redis-master',
  'telegram-redis-replica',
  'telegram-redis-sentinel',
  'telegram-pgbouncer',
  'telegram-rabbitmq',
  'telegram-prometheus',
  'telegram-grafana',
  'telegram-redis-exporter',
  'telegram-postgres-exporter',

  // WAHA
  'waha-core',
  'waha-postgres',
  'waha-minio',
  'waha-webhook',

  // n8n
  'n8n-app',
  'n8n-worker',
  'n8n-postgres',
  'n8n-redis',

  // DB Tools
  'dbui-pgadmin',
  'dbui-pgweb',
  'dbui-adminer',
  'dbui-launcher-api',

  // DB UI Tools
  'dbui-questdb',

  // Dashboard
  'dashboard-ui',
];

// Comandos Docker seguros
const DOCKER_COMMANDS = {
  restart: (container) => `docker restart ${container}`,
  stop: (container) => `docker stop ${container}`,
  start: (container) => `docker start ${container}`,
  logs: (container) => `docker logs --tail 50 ${container}`,
  ps: () => `docker ps --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"`,
  health: (container) => `docker inspect --format='{{.State.Health.Status}}' ${container}`,
};

/**
 * Valida se o container está na lista permitida
 */
function isAllowedContainer(container) {
  return ALLOWED_CONTAINERS.includes(container);
}

/**
 * Executa comando Docker com timeout
 */
async function executeDockerCommand(command, timeout = 30000) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      timeout,
      maxBuffer: 1024 * 1024 // 1MB
    });
    return { success: true, stdout, stderr };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      stdout: error.stdout,
      stderr: error.stderr
    };
  }
}

/**
 * Request handler
 */
async function handleRequest(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    res.writeHead(200);
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
    return;
  }

  // List containers
  if (req.url === '/containers' && req.method === 'GET') {
    const result = await executeDockerCommand(DOCKER_COMMANDS.ps());
    res.writeHead(result.success ? 200 : 500);
    res.end(JSON.stringify({
      success: result.success,
      containers: result.stdout,
      allowed: ALLOWED_CONTAINERS
    }));
    return;
  }

  // Container actions
  if (req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { action, container } = data;

        // Validações
        if (!action || !DOCKER_COMMANDS[action]) {
          res.writeHead(400);
          res.end(JSON.stringify({
            error: `Invalid action. Allowed: ${Object.keys(DOCKER_COMMANDS).join(', ')}`
          }));
          return;
        }

        if (action !== 'ps' && !isAllowedContainer(container)) {
          res.writeHead(403);
          res.end(JSON.stringify({
            error: `Container not allowed. Allowed: ${ALLOWED_CONTAINERS.join(', ')}`
          }));
          return;
        }

        // Executar comando
        const command = action === 'ps'
          ? DOCKER_COMMANDS[action]()
          : DOCKER_COMMANDS[action](container);

        console.log(`[${new Date().toISOString()}] Executing: ${command}`);
        const result = await executeDockerCommand(command);

        res.writeHead(result.success ? 200 : 500);
        res.end(JSON.stringify({
          success: result.success,
          action,
          container,
          output: result.stdout,
          error: result.error
        }));
      } catch (error) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Start server
 */
const server = http.createServer(handleRequest);

server.listen(PORT, HOST, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Docker Control Server                                         ║
╚════════════════════════════════════════════════════════════════╝

✓ Server running on http://${HOST}:${PORT}
✓ Allowed containers: ${ALLOWED_CONTAINERS.length}
✓ Available actions: restart, stop, start, logs, ps, health

Endpoints:
  GET  /health           - Health check
  GET  /containers       - List running containers
  POST /                 - Execute action

Example:
  curl -X POST http://${HOST}:${PORT} \\
    -H "Content-Type: application/json" \\
    -d '{"action":"restart","container":"dashboard"}'

Press Ctrl+C to stop
`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
