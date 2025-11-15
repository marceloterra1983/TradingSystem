import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { config } from "../config.js";
import {
  listMessages as listMessagesFromRepository,
  getDatabasePool,
} from "../db/messagesRepository.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../../../../../");

const defaultGatewayPort = Number(process.env.TELEGRAM_GATEWAY_PORT || 4006);
const gatewayBaseUrl =
  process.env.TELEGRAM_GATEWAY_URL || `http://localhost:${defaultGatewayPort}`;

const resolvePath = (value, fallbackSegments) => {
  if (value && typeof value === "string" && value.trim().length > 0) {
    return path.isAbsolute(value) ? value : path.join(projectRoot, value);
  }
  return path.join(projectRoot, ...fallbackSegments);
};

const failureQueuePath = resolvePath(
  process.env.TELEGRAM_GATEWAY_FAILURE_QUEUE_PATH,
  ["apps", "telegram-gateway", "data", "failure-queue.jsonl"],
);

const sessionFilePath = resolvePath(process.env.TELEGRAM_GATEWAY_SESSION_FILE, [
  "apps",
  "telegram-gateway",
  ".session",
  "telegram-gateway.session",
]);

const cacheTtlMs = Number(process.env.TELEGRAM_GATEWAY_CACHE_TTL_MS || 5000);
const queuePreviewLimit = Number(
  process.env.TELEGRAM_GATEWAY_QUEUE_PREVIEW_LIMIT || 10,
);
const recentMessagesLimit = Number(
  process.env.TELEGRAM_GATEWAY_RECENT_MESSAGES_LIMIT || 20,
);
const authLogLimit = Number(process.env.TELEGRAM_GATEWAY_AUTH_LOG_LIMIT || 200);

const caches = new Map();

const cacheKeys = {
  OVERVIEW: "overview",
  METRICS: "metrics",
  QUEUE: "queue",
  SESSION: "session",
  MESSAGE_SUMMARY: "messageSummary",
  HEALTH: "health",
};

const setCache = (key, data, ttl = cacheTtlMs) => {
  caches.set(key, {
    data,
    expiresAt: Date.now() + ttl,
  });
  return data;
};

const getCached = (key) => {
  const entry = caches.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    caches.delete(key);
    return null;
  }
  return entry.data;
};

export const invalidateCaches = (keys) => {
  if (Array.isArray(keys) && keys.length > 0) {
    keys.forEach((key) => caches.delete(key));
  } else {
    caches.clear();
  }
};

const authState = {
  process: null,
  status: "idle",
  logs: [],
  startedAt: null,
  finishedAt: null,
  exitCode: null,
};

const stripAnsi = (value) =>
  typeof value === "string"
    ? value.replace(/\u001B\[[0-9;]*[A-Za-z]/g, "")
    : value;

const appendAuthLog = (level, message) => {
  authState.logs.push({
    level,
    message: stripAnsi(message),
    timestamp: new Date().toISOString(),
  });
  if (authState.logs.length > authLogLimit) {
    authState.logs.splice(0, authState.logs.length - authLogLimit);
  }
};

const updateAuthStatus = (status) => {
  authState.status = status;
};

const ensureAuthProcess = () => {
  if (!authState.process) {
    const error = new Error("Nenhum processo de autenticação em execução");
    error.code = "NO_PROCESS";
    throw error;
  }
  return authState.process;
};

const normalizeChunk = (chunk) => {
  const text = stripAnsi(chunk.toString());
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .filter((line) => line.trim().length > 0);
};

const detectAuthHints = (line) => {
  const normalized = stripAnsi(line).toLowerCase();
  const accentless = normalized
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (
    normalized.includes("enter the code") ||
    normalized.includes("enter code") ||
    normalized.includes("verification code") ||
    normalized.includes("auth code") ||
    accentless.includes("digite o codigo") ||
    accentless.includes("informe o codigo") ||
    accentless.includes("codigo de autenticacao")
  ) {
    updateAuthStatus("waiting_code");
  } else if (
    normalized.includes("2fa password") ||
    normalized.includes("two-factor password") ||
    accentless.includes("senha de 2fa") ||
    accentless.includes("senha 2fa")
  ) {
    updateAuthStatus("waiting_password");
  } else if (normalized.includes("signed in successfully")) {
    updateAuthStatus("completed");
  }
};

const fetchWithTimeout = async (url, { timeout = 5000, ...options } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timer);
  }
};

const resolveMtprotoServiceBase = () => {
  return (
    process.env.MTPROTO_SERVICE_URL ||
    process.env.GATEWAY_SERVICE_URL ||
    gatewayBaseUrl
  );
};

const normalizeServiceUrl = (url) => {
  if (!url) return undefined;
  return url.endsWith("/") ? url.slice(0, -1) : url;
};

const requestMtprotoHealth = async () => {
  const serviceBase = normalizeServiceUrl(resolveMtprotoServiceBase());
  if (!serviceBase) {
    throw new Error("MTPROTO_SERVICE_URL (or GATEWAY_SERVICE_URL) not configured");
  }

  const response = await fetchWithTimeout(`${serviceBase}/health`, {
    timeout: 5000,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  return { response, payload };
};

async function fetchGatewayHealth() {
  const cached = getCached(cacheKeys.HEALTH);
  if (cached) return cached;

  const now = new Date().toISOString();

  try {
    const { response, payload } = await requestMtprotoHealth();

    if (!response.ok) {
      const data = {
        status: payload?.status ?? "unhealthy",
        telegram: payload?.telegram ?? "disconnected",
        error:
          payload?.error ||
          `MTProto health endpoint returned HTTP ${response.status}`,
        timestamp: payload?.timestamp || now,
      };
      return setCache(cacheKeys.HEALTH, data, 2000);
    }

    const data = {
      status: payload?.status ?? "healthy",
      telegram: payload?.telegram ?? "connected",
      uptime: payload?.uptime,
      timestamp: payload?.timestamp || now,
    };

    return setCache(cacheKeys.HEALTH, data);
  } catch (error) {
    const fallback = {
      status: "unknown",
      telegram: "disconnected",
      error: error.message,
      timestamp: now,
    };
    return setCache(cacheKeys.HEALTH, fallback, 2000);
  }
}

const parsePrometheus = (text) => {
  const metrics = {};
  if (typeof text !== "string") {
    return metrics;
  }

  const lines = text.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const spaceIndex = line.indexOf(" ");
    if (spaceIndex === -1) continue;

    const metricPart = line.slice(0, spaceIndex);
    const valuePart = line.slice(spaceIndex + 1).trim();
    const value = Number(valuePart);
    if (!Number.isFinite(value)) continue;

    let metricName = metricPart;
    let labels = {};

    const labelStart = metricPart.indexOf("{");
    if (labelStart !== -1) {
      metricName = metricPart.slice(0, labelStart);
      const labelChunk = metricPart.slice(
        labelStart + 1,
        metricPart.length - 1,
      );
      labels = {};
      if (labelChunk.length > 0) {
        for (const part of labelChunk.split(",")) {
          const [key, rawVal] = part.split("=");
          if (!key || typeof rawVal === "undefined") continue;
          labels[key.trim()] = rawVal.trim().replace(/^"|"$/g, "");
        }
      }
    }

    if (!metrics[metricName]) {
      metrics[metricName] = [];
    }
    metrics[metricName].push({ value, labels });
  }

  return metrics;
};

const summariseMetrics = (parsedMetrics) => {
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
    connectionStatus: firstValue("telegram_connection_status"),
    messagesReceivedTotal: sumSamples("telegram_messages_received_total"),
    messagesPublishedTotal: sumSamples("telegram_messages_published_total"),
    publishFailuresTotal: sumSamples("telegram_publish_failures_total"),
    retryAttemptsTotal: sumSamples("telegram_retry_attempts_total"),
    failureQueueSize: firstValue("telegram_failure_queue_size"),
  };
};

async function fetchGatewayMetrics() {
  const response = await fetchWithTimeout(`${gatewayBaseUrl}/metrics`, {
    timeout: 4000,
  });

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

const readFailureQueue = async (limit = queuePreviewLimit) => {
  try {
    const stats = await fs.stat(failureQueuePath);
    const content = await fs.readFile(failureQueuePath, "utf8");
    const lines = content
      .trim()
      .split("\n")
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
              typeof entry.text === "string" ? entry.text.slice(0, 160) : null,
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
    if (error.code === "ENOENT") {
      return {
        exists: false,
        path: failureQueuePath,
        totalMessages: 0,
        preview: [],
      };
    }
    throw error;
  }
};

const readSessionMetadata = async () => {
  try {
    const stats = await fs.stat(sessionFilePath);
    const ageMs = Date.now() - stats.mtimeMs;
    const hash = crypto.createHash("sha1");
    const content = await fs.readFile(sessionFilePath);
    hash.update(content);
    return {
      exists: true,
      path: sessionFilePath,
      sizeBytes: stats.size,
      updatedAt: stats.mtime.toISOString(),
      ageMs,
      hash: hash.digest("hex").slice(0, 16),
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return {
        exists: false,
        path: sessionFilePath,
      };
    }
    throw error;
  }
};

const statuses = [
  "received",
  "retrying",
  "published",
  "queued",
  "failed",
  "reprocess_pending",
  "reprocessed",
];

const toIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

export const buildMessageSummary = async ({ logger } = {}) => {
  const cached = getCached(cacheKeys.MESSAGE_SUMMARY);
  if (cached) return cached;

  const pool = await getDatabasePool(logger);
  const schema = toIdentifier(config.database.schema);
  const table = toIdentifier(config.database.table);
  const fullTableName = `${schema}.${table}`;

  const totalsResult = await pool.query(
    `SELECT status, COUNT(*)::bigint AS total
     FROM ${fullTableName}
     WHERE deleted_at IS NULL
     GROUP BY status`,
  );

  const totalsMap = new Map(
    totalsResult.rows.map((row) => [row.status, Number(row.total)]),
  );

  const overallResult = await pool.query(
    `SELECT COUNT(*)::bigint AS total
     FROM ${fullTableName}
     WHERE deleted_at IS NULL`,
  );
  const overallTotal = Number(overallResult.rows[0]?.total ?? 0);

  const recent = await listMessagesFromRepository(
    {
      limit: recentMessagesLimit,
      sort: "desc",
    },
    logger,
  );

  return setCache(cacheKeys.MESSAGE_SUMMARY, {
    total: overallTotal,
    byStatus: statuses.map((status) => ({
      status,
      total: totalsMap.get(status) ?? 0,
    })),
    recent: recent.rows,
    pagination: {
      total: recent.total,
      limit: recent.limit,
      offset: recent.offset,
      hasMore: recent.offset + recent.rows.length < recent.total,
    },
  });
};

export const getMetrics = async () => {
  const cached = getCached(cacheKeys.METRICS);
  if (cached) return cached;

  try {
    const metrics = await fetchGatewayMetrics();
    return setCache(cacheKeys.METRICS, metrics);
  } catch (error) {
    return setCache(
      cacheKeys.METRICS,
      {
        error: error.message,
      },
      2000,
    );
  }
};

export const getQueue = async ({ limit } = {}) => {
  if (typeof limit === "undefined") {
    const cached = getCached(cacheKeys.QUEUE);
    if (cached) return cached;
  }

  try {
    const queue = await readFailureQueue(limit);
    if (typeof limit === "undefined") {
      return setCache(cacheKeys.QUEUE, queue);
    }
    return queue;
  } catch (error) {
    const payload = {
      error: error.message,
      path: failureQueuePath,
    };
    if (typeof limit === "undefined") {
      return setCache(cacheKeys.QUEUE, payload, 2000);
    }
    return payload;
  }
};

export const getSession = async () => {
  const cached = getCached(cacheKeys.SESSION);
  if (cached) return cached;

  try {
    const [health, metadataResult] = await Promise.all([
      fetchGatewayHealth(),
      readSessionMetadata().catch((error) => ({
        exists: false,
        path: sessionFilePath,
        error: error.message,
      })),
    ]);

    const connectedToTelegram = health.telegram === "connected";
    const sessionExists = connectedToTelegram;

    return setCache(cacheKeys.SESSION, {
      ...(metadataResult ?? { path: sessionFilePath }),
      exists: sessionExists,
      connectedToTelegram,
      sessionFileExists: Boolean(metadataResult?.exists),
      mtprotoUptime: health.uptime,
      mtprotoStatus: health.status,
      timestamp: health.timestamp,
      error: sessionExists ? undefined : metadataResult?.error || health.error,
    });
  } catch (error) {
    return setCache(
      cacheKeys.SESSION,
      {
        exists: false,
        path: sessionFilePath,
        error: error.message,
      },
      2000,
    );
  }
};

export const getOverview = async ({ logger } = {}) => {
  const cached = getCached(cacheKeys.OVERVIEW);
  if (cached) return cached;

  try {
    const [health, metrics, queue, session, messages] = await Promise.all([
      fetchGatewayHealth().catch((error) => ({
        status: "unknown",
        error: error.message,
      })),
      getMetrics(),
      getQueue(),
      getSession(),
      buildMessageSummary({ logger }).catch((error) => ({
        error: error.message,
      })),
    ]);

    return setCache(cacheKeys.OVERVIEW, {
      health,
      metrics,
      queue,
      session,
      messages,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return setCache(
      cacheKeys.OVERVIEW,
      {
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      2000,
    );
  }
};

export const getAuthenticationStatus = () => ({
  status: authState.status,
  running: Boolean(authState.process),
  startedAt: authState.startedAt,
  finishedAt: authState.finishedAt,
  exitCode: authState.exitCode,
  logs: authState.logs,
});

export const startAuthentication = () => {
  if (authState.process) {
    const error = new Error("Uma autenticação já está em andamento");
    error.code = "ALREADY_RUNNING";
    throw error;
  }

  const command =
    process.platform === "win32"
      ? "authenticate-interactive.sh"
      : "./authenticate-interactive.sh";
  const workingDir = path.join(projectRoot, "apps", "telegram-gateway");
  appendAuthLog(
    "system",
    `Executando script de autenticação: ${command} (cwd: ${workingDir})`,
  );
  const child = spawn(command, {
    cwd: path.join(projectRoot, "apps", "telegram-gateway"),
    env: {
      ...process.env,
      FORCE_COLOR: "1",
    },
    stdio: ["pipe", "pipe", "pipe"],
    shell: process.platform === "win32",
  });

  authState.process = child;
  authState.status = "starting";
  authState.startedAt = new Date().toISOString();
  authState.finishedAt = null;
  authState.exitCode = null;
  authState.logs = [];

  appendAuthLog("system", "Processo de autenticação iniciado");

  child.stdout.on("data", (chunk) => {
    const lines = normalizeChunk(chunk);
    lines.forEach((line) => {
      appendAuthLog("stdout", line);
      detectAuthHints(line);
    });
  });

  child.stderr.on("data", (chunk) => {
    const lines = normalizeChunk(chunk);
    lines.forEach((line) => {
      appendAuthLog("stderr", line);
      detectAuthHints(line);
    });
  });

  child.on("error", (error) => {
    appendAuthLog("error", `Falha ao iniciar autenticação: ${error.message}`);
    authState.status = "error";
    authState.exitCode = typeof error.code === "number" ? error.code : null;
    authState.finishedAt = new Date().toISOString();
    authState.process = null;
  });

  child.on("close", (code) => {
    appendAuthLog("system", `Processo encerrado com código ${code}`);
    authState.exitCode = code;
    authState.finishedAt = new Date().toISOString();
    if (authState.status === "cancelling") {
      authState.status = "cancelled";
    } else if (authState.status !== "completed") {
      authState.status = code === 0 ? "completed" : "error";
    }
    authState.process = null;
  });

  // Avança o prompt inicial automaticamente
  setTimeout(() => {
    if (child.stdin.writable) {
      child.stdin.write("\n");
      appendAuthLog("system", "Prompt inicial confirmado automaticamente");
      authState.status = "waiting_code";
    }
  }, 300);

  return getAuthenticationStatus();
};

export const submitAuthenticationInput = (value) => {
  const processRef = ensureAuthProcess();
  if (!processRef.stdin.writable) {
    const error = new Error("Não é possível enviar entrada - stdin fechado");
    error.code = "STDIN_CLOSED";
    throw error;
  }

  processRef.stdin.write(`${value}\n`);
  appendAuthLog(
    "input",
    "Entrada enviada ao processo (conteúdo não exibido por segurança)",
  );
  if (authState.status === "waiting_code") {
    authState.status = "processing_code";
  } else if (authState.status === "waiting_password") {
    authState.status = "processing_password";
  }
};

export const cancelAuthentication = () => {
  const processRef = ensureAuthProcess();
  appendAuthLog("system", "Cancelamento solicitado pelo usuário");
  authState.status = "cancelling";
  processRef.kill("SIGTERM");
  setTimeout(() => {
    if (authState.process) {
      authState.process.kill("SIGKILL");
    }
  }, 2000);
};

export const getQueuePreviewLimit = () => queuePreviewLimit;
