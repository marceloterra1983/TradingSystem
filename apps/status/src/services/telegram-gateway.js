const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const projectRoot = path.resolve(__dirname, '../../../..');

const gatewayPort = Number(process.env.SERVICE_LAUNCHER_TELEGRAM_GATEWAY_PORT || 4006);
const gatewayBaseUrl =
  process.env.SERVICE_LAUNCHER_TELEGRAM_GATEWAY_URL || `http://localhost:${gatewayPort}`;

const gatewayApiPort = Number(
  process.env.SERVICE_LAUNCHER_TELEGRAM_GATEWAY_API_PORT || process.env.TELEGRAM_GATEWAY_API_PORT || 4010,
);
const gatewayApiBaseUrl =
  process.env.SERVICE_LAUNCHER_TELEGRAM_GATEWAY_API_URL || `http://localhost:${gatewayApiPort}`;

const gatewayApiToken =
  process.env.TELEGRAM_GATEWAY_API_TOKEN ||
  process.env.SERVICE_LAUNCHER_TELEGRAM_GATEWAY_API_TOKEN ||
  process.env.API_SECRET_TOKEN ||
  process.env.GATEWAY_API_TOKEN ||
  '';

const resolvePath = (value, defaultSegments) => {
  if (value) {
    return path.isAbsolute(value) ? value : path.join(projectRoot, value);
  }
  return path.join(projectRoot, ...defaultSegments);
};

const failureQueuePath = resolvePath(process.env.TELEGRAM_GATEWAY_FAILURE_QUEUE_PATH, [
  'apps',
  'telegram-gateway',
  'data',
  'failure-queue.jsonl',
]);

const sessionFilePath = resolvePath(process.env.TELEGRAM_GATEWAY_SESSION_FILE, [
  'apps',
  'telegram-gateway',
  '.session',
  'telegram-gateway.session',
]);

const cacheTtlMs = Number(process.env.TELEGRAM_GATEWAY_CACHE_TTL_MS || 5000);
const queuePreviewLimit = Number(process.env.TELEGRAM_GATEWAY_QUEUE_PREVIEW_LIMIT || 10);
const recentMessagesLimit = Number(process.env.TELEGRAM_GATEWAY_RECENT_MESSAGES_LIMIT || 20);

const caches = {
  overview: null,
  metrics: null,
  queue: null,
  session: null,
  messageSummary: null,
};

const isCacheValid = (entry) => entry && entry.expiresAt > Date.now();

const setCache = (key, data, ttl = cacheTtlMs) => {
  caches[key] = {
    data,
    expiresAt: Date.now() + ttl,
  };
  return data;
};

const getCached = (key) => {
  const entry = caches[key];
  return isCacheValid(entry) ? entry.data : null;
};

const invalidateCaches = () => {
  Object.keys(caches).forEach((key) => {
    caches[key] = null;
  });
};

const telegramGatewayDir = path.join(projectRoot, 'apps', 'telegram-gateway');
const AUTH_LOG_LIMIT = Number(process.env.TELEGRAM_GATEWAY_AUTH_LOG_LIMIT || 200);

const authState = {
  process: null,
  status: 'idle',
  logs: [],
  startedAt: null,
  finishedAt: null,
  exitCode: null,
};

const appendAuthLog = (level, message) => {
  authState.logs.push({
    level,
    message,
    timestamp: new Date().toISOString(),
  });
  if (authState.logs.length > AUTH_LOG_LIMIT) {
    authState.logs.splice(0, authState.logs.length - AUTH_LOG_LIMIT);
  }
};

const updateAuthStatus = (status) => {
  authState.status = status;
};

const ensureAuthProcess = () => {
  if (!authState.process) {
    const error = new Error('Nenhum processo de autenticação em execução');
    error.code = 'NO_PROCESS';
    throw error;
  }
  return authState.process;
};

const normalizeChunk = (chunk) => {
  const text = chunk.toString();
  return text.replace(/\r\n/g, '\n').split('\n').filter((line) => line.trim().length > 0);
};

const detectAuthHints = (line) => {
  const normalized = line.toLowerCase();
  if (normalized.includes('enter the code')) {
    updateAuthStatus('waiting_code');
  } else if (normalized.includes('enter your 2fa password')) {
    updateAuthStatus('waiting_password');
  } else if (normalized.includes('signed in successfully')) {
    updateAuthStatus('completed');
  }
};

const startAuthentication = () => {
  if (authState.process) {
    const error = new Error('Uma autenticação já está em andamento');
    error.code = 'ALREADY_RUNNING';
    throw error;
  }

  const child = spawn('bash', ['authenticate-interactive.sh'], {
    cwd: telegramGatewayDir,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  authState.process = child;
  authState.status = 'starting';
  authState.startedAt = new Date().toISOString();
  authState.finishedAt = null;
  authState.exitCode = null;
  authState.logs = [];

  appendAuthLog('system', 'Processo de autenticação iniciado');

  child.stdout.on('data', (chunk) => {
    const lines = normalizeChunk(chunk);
    lines.forEach((line) => {
      appendAuthLog('stdout', line);
      detectAuthHints(line);
    });
  });

  child.stderr.on('data', (chunk) => {
    const lines = normalizeChunk(chunk);
    lines.forEach((line) => {
      appendAuthLog('stderr', line);
      detectAuthHints(line);
    });
  });

  child.on('error', (error) => {
    appendAuthLog('error', `Falha ao iniciar autenticação: ${error.message}`);
    authState.status = 'error';
    authState.exitCode = error.code ?? null;
    authState.finishedAt = new Date().toISOString();
    authState.process = null;
  });

  child.on('close', (code) => {
    appendAuthLog('system', `Processo encerrado com código ${code}`);
    authState.exitCode = code;
    authState.finishedAt = new Date().toISOString();
    if (authState.status === 'cancelling') {
      authState.status = 'cancelled';
    } else if (authState.status !== 'completed') {
      authState.status = code === 0 ? 'completed' : 'error';
    }
    authState.process = null;
  });

  // Avança o prompt inicial ("Pressione ENTER para começar...")
  setTimeout(() => {
    if (child.stdin.writable) {
      child.stdin.write('\n');
      appendAuthLog('system', 'Prompt inicial confirmado automaticamente');
      authState.status = 'waiting_code';
    }
  }, 300);

  return getAuthenticationStatus();
};

const submitAuthenticationInput = (value) => {
  const processRef = ensureAuthProcess();
  if (!processRef.stdin.writable) {
    const error = new Error('Não é possível enviar entrada - stdin fechado');
    error.code = 'STDIN_CLOSED';
    throw error;
  }

  processRef.stdin.write(`${value}\n`);
  appendAuthLog('input', 'Entrada enviada ao processo (conteúdo não exibido por segurança)');
  if (authState.status === 'waiting_code') {
    authState.status = 'processing_code';
  } else if (authState.status === 'waiting_password') {
    authState.status = 'processing_password';
  }
};

const cancelAuthentication = () => {
  const processRef = ensureAuthProcess();
  appendAuthLog('system', 'Cancelamento solicitado pelo usuário');
  authState.status = 'cancelling';
  processRef.kill('SIGTERM');
  setTimeout(() => {
    if (authState.process) {
      authState.process.kill('SIGKILL');
    }
  }, 2000);
};

const getAuthenticationStatus = () => ({
  status: authState.status,
  running: Boolean(authState.process),
  startedAt: authState.startedAt,
  finishedAt: authState.finishedAt,
  exitCode: authState.exitCode,
  logs: authState.logs,
});

function parsePrometheus(text) {
  const metrics = {};

  if (typeof text !== 'string') {
    return metrics;
  }

  const lines = text.split('\n');

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const spaceIndex = line.indexOf(' ');
    if (spaceIndex === -1) continue;

    const metricPart = line.slice(0, spaceIndex);
    const valuePart = line.slice(spaceIndex + 1).trim();
    const value = Number(valuePart);
    if (!Number.isFinite(value)) continue;

    let metricName = metricPart;
    let labels = {};

    const labelStart = metricPart.indexOf('{');
    if (labelStart !== -1) {
      metricName = metricPart.slice(0, labelStart);
      const labelChunk = metricPart.slice(labelStart + 1, metricPart.length - 1);
      labels = {};
      if (labelChunk.length > 0) {
        for (const part of labelChunk.split(',')) {
          const [key, rawVal] = part.split('=');
          if (!key || typeof rawVal === 'undefined') continue;
          labels[key.trim()] = rawVal.trim().replace(/^"|"$/g, '');
        }
      }
    }

    if (!metrics[metricName]) {
      metrics[metricName] = [];
    }
    metrics[metricName].push({ value, labels });
  }

  return metrics;
}

function summariseMetrics(parsedMetrics) {
  const sumSamples = (metricName, labelFilter) => {
    const samples = parsedMetrics[metricName];
    if (!samples || samples.length === 0) return null;
    return samples
      .filter((sample) => {
        if (!labelFilter) return true;
        return Object.entries(labelFilter).every(
          ([key, expected]) => sample.labels[key] === String(expected),
        );
      })
      .reduce((acc, sample) => acc + sample.value, 0);
  };

  const firstValue = (metricName) => {
    const samples = parsedMetrics[metricName];
    if (!samples || samples.length === 0) return null;
    return samples[0].value;
  };

  return {
    connectionStatus: firstValue('telegram_connection_status'),
    messagesReceivedTotal: sumSamples('telegram_messages_received_total'),
    messagesPublishedTotal: sumSamples('telegram_messages_published_total'),
    publishFailuresTotal: sumSamples('telegram_publish_failures_total'),
    retryAttemptsTotal: sumSamples('telegram_retry_attempts_total'),
    failureQueueSize: firstValue('telegram_failure_queue_size'),
  };
}

async function fetchGatewayHealth() {
  const response = await fetch(`${gatewayBaseUrl}/health`, {
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gateway health returned ${response.status}: ${body}`);
  }

  return response.json();
}

async function fetchGatewayMetrics() {
  const response = await fetch(`${gatewayBaseUrl}/metrics`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gateway metrics returned ${response.status}: ${body}`);
  }
  const text = await response.text();
  const parsed = parsePrometheus(text);
  return {
    raw: text,
    parsed,
    summary: summariseMetrics(parsed),
  };
}

async function readFailureQueue(limit = queuePreviewLimit) {
  try {
    const stats = await fs.stat(failureQueuePath);
    const content = await fs.readFile(failureQueuePath, 'utf8');
    const lines = content
      .trim()
      .split('\n')
      .filter((line) => line.trim().length > 0);

    const total = lines.length;
    const offset = Math.max(total - limit, 0);
    const previewLines = lines.slice(offset);

    const preview = previewLines
      .map((line) => {
        try {
          const entry = JSON.parse(line);
          return {
            channelId: entry.channelId ?? null,
            messageId: entry.messageId ?? null,
            textPreview:
              typeof entry.text === 'string' ? entry.text.slice(0, 160) : null,
            failedAt: entry.failedAt ?? null,
            queuedAt: entry.queuedAt ?? null,
            createdAt: entry.timestamp ?? entry.receivedAt ?? null,
          };
        } catch (error) {
          return { parseError: error.message, raw: line.slice(0, 160) };
        }
      })
      .reverse();

    return {
      exists: true,
      path: failureQueuePath,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
      totalMessages: total,
      previewLimit: limit,
      previewCount: preview.length,
      preview,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        path: failureQueuePath,
        totalMessages: 0,
        preview: [],
      };
    }

    throw error;
  }
}

async function readSessionMetadata() {
  try {
    const stats = await fs.stat(sessionFilePath);
    const ageMs = Date.now() - stats.mtimeMs;
    const hash = crypto.createHash('sha1');
    const content = await fs.readFile(sessionFilePath);
    hash.update(content);
    return {
      exists: true,
      path: sessionFilePath,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
      ageMs,
      hash: hash.digest('hex').slice(0, 16),
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        path: sessionFilePath,
      };
    }
    throw error;
  }
}

async function authenticatedFetch(url, options = {}) {
  if (!gatewayApiToken) {
    throw new Error('TELEGRAM_GATEWAY_API_TOKEN not configured');
  }

  const headers = {
    'Content-Type': 'application/json',
    'X-Gateway-Token': gatewayApiToken,
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let details;
    try {
      details = await response.json();
    } catch (error) {
      details = await response.text();
    }

    const errorMessage =
      typeof details === 'object' && details !== null
        ? details.message || JSON.stringify(details)
        : String(details);

    const err = new Error(
      `Telegram Gateway API ${response.status}: ${errorMessage}`,
    );
    err.status = response.status;
    err.details = details;
    throw err;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.text();
}

async function fetchMessageCount(status) {
  const url = new URL('/api/messages', gatewayApiBaseUrl);
  url.searchParams.set('limit', '1');
  if (status) {
    url.searchParams.set('status', status);
  }

  const result = await authenticatedFetch(url, {
    method: 'GET',
  });

  return result?.pagination?.total ?? 0;
}

async function fetchRecentMessages(limit = recentMessagesLimit) {
  const url = new URL('/api/messages', gatewayApiBaseUrl);
  url.searchParams.set('limit', String(limit));
  url.searchParams.set('sort', 'desc');

  return authenticatedFetch(url, { method: 'GET' });
}

async function listMessages(query = {}) {
  const url = new URL('/api/messages', gatewayApiBaseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => url.searchParams.append(key, String(item)));
    } else {
      url.searchParams.set(key, String(value));
    }
  });

  return authenticatedFetch(url, { method: 'GET' });
}

async function requestMessageReprocess(id, body) {
  const url = new URL(`/api/messages/${id}/reprocess`, gatewayApiBaseUrl);
  return authenticatedFetch(url, {
    method: 'POST',
    body: JSON.stringify(body || {}),
  });
}

async function deleteMessage(id, body) {
  const url = new URL(`/api/messages/${id}`, gatewayApiBaseUrl);
  return authenticatedFetch(url, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function buildMessageSummary() {
  const cached = getCached('messageSummary');
  if (cached) return cached;

  const statuses = [
    'received',
    'retrying',
    'published',
    'queued',
    'failed',
    'reprocess_pending',
    'reprocessed',
  ];

  const totals = await Promise.all(
    statuses.map(async (status) => ({
      status,
      total: await fetchMessageCount(status),
    })),
  );

  const overallTotal = await fetchMessageCount();
  const recent = await fetchRecentMessages();

  return setCache('messageSummary', {
    total: overallTotal,
    byStatus: totals,
    recent: recent?.data ?? [],
    pagination: recent?.pagination ?? null,
  });
}

async function getMetrics() {
  const cached = getCached('metrics');
  if (cached) return cached;

  try {
    const metrics = await fetchGatewayMetrics();
    return setCache('metrics', metrics);
  } catch (error) {
    return setCache(
      'metrics',
      {
        error: error.message,
      },
      2000,
    );
  }
}

async function getQueue(limit) {
  const cached = getCached('queue');

  if (cached && typeof limit === 'undefined') {
    return cached;
  }

  try {
    const queue = await readFailureQueue(limit);
    return setCache('queue', queue);
  } catch (error) {
    return setCache(
      'queue',
      {
        error: error.message,
        path: failureQueuePath,
      },
      2000,
    );
  }
}

async function getSession() {
  const cached = getCached('session');
  if (cached) return cached;

  try {
    const session = await readSessionMetadata();
    return setCache('session', session);
  } catch (error) {
    return setCache(
      'session',
      {
        error: error.message,
        path: sessionFilePath,
      },
      2000,
    );
  }
}

async function getOverview() {
  const cached = getCached('overview');
  if (cached) return cached;

  try {
    const [health, metrics, queue, session, messages] = await Promise.all([
      fetchGatewayHealth().catch((error) => ({ status: 'unknown', error: error.message })),
      getMetrics(),
      getQueue(),
      getSession(),
      buildMessageSummary().catch((error) => ({ error: error.message })),
    ]);

    return setCache('overview', {
      health,
      metrics,
      queue,
      session,
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return setCache(
      'overview',
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      2000,
    );
  }
}

async function listChannels(query = {}) {
  const url = new URL('/api/channels', gatewayApiBaseUrl);
  Object.entries(query).forEach(([key, value]) => {
    if (typeof value === 'undefined' || value === null) return;
    url.searchParams.set(key, String(value));
  });
  return authenticatedFetch(url, { method: 'GET' });
}

async function createChannel(payload) {
  const result = await authenticatedFetch(`${gatewayApiBaseUrl}/api/channels`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  invalidateCaches();
  return result;
}

async function updateChannel(id, payload) {
  const result = await authenticatedFetch(`${gatewayApiBaseUrl}/api/channels/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  invalidateCaches();
  return result;
}

async function deleteChannel(id) {
  const result = await authenticatedFetch(`${gatewayApiBaseUrl}/api/channels/${id}`, {
    method: 'DELETE',
  });
  invalidateCaches();
  return result;
}

module.exports = {
  getOverview,
  getMetrics,
  getQueue,
  getSession,
  listMessages,
  requestMessageReprocess,
  deleteMessage,
  buildMessageSummary,
  invalidateCaches,
  getAuthenticationStatus,
  startAuthentication,
  submitAuthenticationInput,
  cancelAuthentication,
  listChannels,
  createChannel,
  updateChannel,
  deleteChannel,
};
