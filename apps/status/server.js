// Load environment variables from project root (following TradingSystem standard)
const path = require('path');
const projectRoot = path.resolve(__dirname, '../../');

require(path.join(projectRoot, 'backend/shared/config/load-env.cjs'));

const dotenv = require('dotenv');
if (process.env.SERVICE_LAUNCHER_ENV_PATH) {
  const resolvedEnvPath = path.isAbsolute(process.env.SERVICE_LAUNCHER_ENV_PATH)
    ? process.env.SERVICE_LAUNCHER_ENV_PATH
    : path.resolve(projectRoot, process.env.SERVICE_LAUNCHER_ENV_PATH);
  dotenv.config({ path: resolvedEnvPath, override: true });
}

const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { execSync, spawn, execFile } = require('child_process');
const { performance } = require('node:perf_hooks');
const { promisify } = require('util');

// Structured logging (Pino)
const logger = require('./src/utils/logger');

// Circuit Breaker for resilient health checks
const CircuitBreaker = require('./src/utils/circuit-breaker');
const circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 60s timeout

// Prometheus metrics
const metrics = require('./src/utils/metrics');

// Terminal detection and launching
const terminalDetector = require('./src/utils/terminal-detector');
const terminalLauncher = require('./src/utils/terminal-launcher');

const app = express();
// Port 3500 is the official default (aligned with project standards)
// STATUS_PORT takes priority, SERVICE_LAUNCHER_PORT for backward compatibility, then PORT
const PORT = Number(process.env.STATUS_PORT || process.env.SERVICE_LAUNCHER_PORT || process.env.PORT || 3500);
const preferWindowsTerminal = process.env.STATUS_USE_WT === 'true' || process.env.SERVICE_LAUNCHER_USE_WT === 'true';
const defaultProtocol = process.env.STATUS_PROTOCOL || process.env.SERVICE_LAUNCHER_PROTOCOL || 'http';
const defaultHost = process.env.STATUS_HOST || process.env.SERVICE_LAUNCHER_HOST || 'localhost';
const DEFAULT_TIMEOUT_MS = Number(process.env.STATUS_TIMEOUT_MS || process.env.SERVICE_LAUNCHER_TIMEOUT_MS || 2500);
const MAX_BODY_PREVIEW = 256;
const HEALTH_CHECK_CACHE_TTL_MS = 60_000;
const HEALTH_CHECK_SCRIPT_TIMEOUT_MS = 10_000;
const HEALTH_CHECK_SCRIPT_MAX_BUFFER = 10 * 1024 * 1024;

const execFileAsync = promisify(execFile);
const HEALTH_SCRIPT_PATH = path.join(projectRoot, 'scripts/maintenance/health-check-all.sh');

const healthCheckCache = {
  data: null,
  timestamp: 0,
  ttl: HEALTH_CHECK_CACHE_TTL_MS,
  durationMs: 0,
};

let inFlightHealthCheck = null;

function isCacheValid(cache) {
  return Boolean(cache.data) && Date.now() - cache.timestamp < cache.ttl;
}

function updateCache(cache, data, durationMs) {
  cache.data = data;
  cache.timestamp = Date.now();
  cache.durationMs = durationMs;
}

function getCacheAgeSeconds(cache) {
  if (!cache.timestamp) return 0;
  return Math.floor((Date.now() - cache.timestamp) / 1000);
}

function invalidateHealthCheckCache() {
  healthCheckCache.data = null;
  healthCheckCache.timestamp = 0;
  healthCheckCache.durationMs = 0;
}

const rawCorsOrigin = process.env.CORS_ORIGIN && process.env.CORS_ORIGIN.trim() !== ''
  ? process.env.CORS_ORIGIN
  : 'http://localhost:3101,http://localhost:3004';
const corsOrigins = rawCorsOrigin === '*'
  ? undefined
  : rawCorsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);
app.use(cors(corsOrigins ? { origin: corsOrigins, credentials: true } : undefined));
const limiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000),
  max: Number(process.env.RATE_LIMIT_MAX || 200),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);
app.use(express.json());

/**
 * Resolve the numeric port for a service.
 * @param {string} envKey
 * @param {number} fallback
 * @returns {number}
 */
function resolvePort(envKeys, fallback) {
  const keys = Array.isArray(envKeys) ? envKeys : [envKeys];
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const parsed = Number(raw);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return fallback;
}

function resolveUrl(envKeys, fallbackUrl) {
  const keys = Array.isArray(envKeys) ? envKeys : [envKeys];
  for (const key of keys) {
    const raw = process.env[key];
    if (raw && raw.trim() !== '') {
      return raw;
    }
  }
  return fallbackUrl;
}

/**
 * Build an absolute health URL using the shared host/protocol.
 * @param {number} port
 * @param {string} path
 * @returns {string}
 */
function toHealthUrl(port, path = '/health') {
  return `${defaultProtocol}://${defaultHost}:${port}${path}`;
}

/**
 * Helper to create a service descriptor used for health aggregation.
 * @param {{
 *  id: string;
 *  name: string;
 *  description: string;
 *  category: string;
 *  defaultPort: number;
 *  portEnv: string;
 *  urlEnv: string;
 *  path?: string;
 *  method?: string;
 *  timeoutMs?: number;
 * }} config
 */
function createServiceTarget(config) {
  const port = resolvePort(config.portEnv, config.defaultPort);
  return {
    id: config.id,
    name: config.name,
    description: config.description,
    category: config.category,
    port,
    method: config.method || 'GET',
    timeoutMs: config.timeoutMs,
    healthUrl: resolveUrl(config.urlEnv, toHealthUrl(port, config.path)),
  };
}

const SERVICE_TARGETS = [
  createServiceTarget({
    id: 'workspace-api',
    name: 'Workspace',
    description: 'Workspace item management (documentation backlog)',
    category: 'api',
    defaultPort: 3200,
    portEnv: ['SERVICE_LAUNCHER_WORKSPACE_PORT', 'SERVICE_LAUNCHER_LIBRARY_PORT'],
    urlEnv: ['SERVICE_LAUNCHER_WORKSPACE_URL', 'SERVICE_LAUNCHER_LIBRARY_URL'],
  }),
  createServiceTarget({
    id: 'tp-capital-signals-api',
    name: 'TP-Capital',
    description: 'Telegram ingestion service',
    category: 'api',
    defaultPort: 3200,
    portEnv: 'SERVICE_LAUNCHER_TP_CAPITAL_PORT',
    urlEnv: 'SERVICE_LAUNCHER_TP_CAPITAL_URL',
  }),
  createServiceTarget({
    id: 'b3-market-data-api',
    name: 'B3',
    description: 'B3 market data gateway',
    category: 'api',
    defaultPort: 3302,
    portEnv: 'SERVICE_LAUNCHER_B3_PORT',
    urlEnv: 'SERVICE_LAUNCHER_B3_URL',
  }),
  createServiceTarget({
    id: 'firecrawl-proxy',
    name: 'Firecrawl Proxy',
    description: 'Web scraping proxy with validation and rate limiting',
    category: 'api',
    defaultPort: 3600,
    portEnv: 'SERVICE_LAUNCHER_FIRECRAWL_PROXY_PORT',
    urlEnv: 'SERVICE_LAUNCHER_FIRECRAWL_PROXY_URL',
  }),
  createServiceTarget({
    id: 'documentation-api',
    name: 'DocsAPI',
    description: 'Documentation content service',
    category: 'api',
    defaultPort: 3400,
    portEnv: 'SERVICE_LAUNCHER_DOCS_PORT',
    urlEnv: 'SERVICE_LAUNCHER_DOCS_URL',
  }),
  createServiceTarget({
    id: 'dashboard-ui',
    name: 'Dashboard',
    description: 'Frontend dashboard (Vite/React)',
    category: 'ui',
    defaultPort: 3101,
    portEnv: 'SERVICE_LAUNCHER_DASHBOARD_PORT',
    urlEnv: 'SERVICE_LAUNCHER_DASHBOARD_URL',
    path: '/',
  }),
  createServiceTarget({
    id: 'docusaurus',
    name: 'Docusaurus',
    description: 'Site oficial de documentação técnica',
    category: 'docs',
    defaultPort: 3004,
    portEnv: 'SERVICE_LAUNCHER_DOCUSAURUS_PORT',
    urlEnv: 'SERVICE_LAUNCHER_DOCUSAURUS_URL',
    path: '/',
  }),
  createServiceTarget({
    id: 'prometheus',
    name: 'Prometheus',
    description: 'Metrics scraping & monitoring',
    category: 'monitoring',
    defaultPort: 9090,
    portEnv: 'SERVICE_LAUNCHER_PROMETHEUS_PORT',
    urlEnv: 'SERVICE_LAUNCHER_PROMETHEUS_URL',
    path: '/',
  }),
  createServiceTarget({
    id: 'grafana',
    name: 'Grafana',
    description: 'Dashboards de métricas',
    category: 'monitoring',
    defaultPort: 3000,
    portEnv: 'SERVICE_LAUNCHER_GRAFANA_PORT',
    urlEnv: 'SERVICE_LAUNCHER_GRAFANA_URL',
    path: '/',
  }),
  createServiceTarget({
    id: 'questdb-http',
    name: 'QuestDB HTTP',
    description: 'Console QuestDB',
    category: 'data',
    defaultPort: 9000,
    portEnv: 'SERVICE_LAUNCHER_QUESTDB_HTTP_PORT',
    urlEnv: 'SERVICE_LAUNCHER_QUESTDB_HTTP_URL',
    path: '/',
  }),
  {
    id: 'service-launcher',
    name: 'Launcher API',  // Corrected typo: Laucher → Launcher
    description: 'Local orchestrator',
    category: 'internal',
    port: PORT,  // Uses PORT constant (defaults to 3500)
    method: 'GET',
    timeoutMs: DEFAULT_TIMEOUT_MS,
    healthUrl: process.env.SERVICE_LAUNCHER_SELF_URL || `http://localhost:${PORT}/health`,
  },
];

/**
 * Probe an individual service and return status metadata.
 * @param {{
 *  id: string;
 *  name: string;
 *  description: string;
 *  category: string;
 *  port: number;
 *  method?: string;
 *  timeoutMs?: number;
 *  healthUrl: string;
 * }} service
 */
async function evaluateService(service) {
  const start = performance.now();
  const updatedAt = new Date().toISOString();

  // Check circuit breaker first
  if (circuitBreaker.isOpen(service.id)) {
    logger.warn(
      { serviceId: service.id, circuitState: 'open', event: 'circuit_breaker_open' },
      `Circuit breaker open for ${service.id} - skipping health check`
    );
    return {
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      port: service.port,
      status: 'down',
      latencyMs: null,
      updatedAt,
      details: {
        healthUrl: service.healthUrl,
        error: 'Circuit breaker open - too many consecutive failures',
        circuitBreaker: circuitBreaker.getState(service.id),
      },
    };
  }

  const controller = new AbortController();
  const timeoutMs = Number.isFinite(service.timeoutMs)
    ? service.timeoutMs
    : DEFAULT_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let status = 'down';
  let latencyMs = null;
  let details = {
    healthUrl: service.healthUrl,
    timeoutMs,
  };

  try {
    const response = await fetch(service.healthUrl, {
      method: service.method || 'GET',
      signal: controller.signal,
    });
    latencyMs = Math.round(performance.now() - start);

    status = response.ok ? 'ok' : 'degraded';
    details = {
      healthUrl: service.healthUrl,
      httpStatus: response.status,
      timeoutMs,
    };

    const contentType = response.headers?.get
      ? response.headers.get('content-type')
      : null;
    const shouldCaptureBody =
      !response.ok || Boolean(contentType?.includes('application/json'));

    if (shouldCaptureBody && response.body) {
      try {
        if (contentType && contentType.includes('application/json')) {
          details.body = await response.json();
        } else if ((service.method || 'GET') !== 'HEAD') {
          const text = await response.text();
          details.body =
            text.length > MAX_BODY_PREVIEW
              ? `${text.slice(0, MAX_BODY_PREVIEW)}…`
              : text;
        }
      } catch (bodyError) {
        details.bodyError = bodyError.message;
      }
    }
  } catch (error) {
    const isTimeout = controller.signal.aborted || error.name === 'AbortError';
    details = {
      healthUrl: service.healthUrl,
      timeoutMs,
      error: isTimeout ? 'timeout' : error.message,
    };
    status = 'down';
  } finally {
    clearTimeout(timeout);
  }

  // Update circuit breaker based on result
  if (status === 'ok') {
    circuitBreaker.recordSuccess(service.id);
  } else {
    circuitBreaker.recordFailure(service.id);
  }

  // Record metrics
  const durationSeconds = (performance.now() - start) / 1000;
  metrics.recordHealthCheck(service.id, status, durationSeconds);
  metrics.updateServiceStatus(service.id, service.name, status);
  
  // Update circuit breaker metrics
  const cbState = circuitBreaker.getState(service.id);
  metrics.updateCircuitBreakerMetrics(service.id, cbState);

  return {
    id: service.id,
    name: service.name,
    description: service.description,
    category: service.category,
    port: service.port,
    status,
    latencyMs,
    updatedAt,
    details,
  };
}

/**
 * Gather status information for the provided service list.
 * @param {Array<ReturnType<typeof createServiceTarget>>} serviceList
 */
async function gatherServiceStatuses(serviceList) {
  return Promise.all(serviceList.map((service) => evaluateService(service)));
}

/**
 * Summarize service statuses into an aggregated payload.
 * @param {Array<Awaited<ReturnType<typeof evaluateService>>>} results
 */
function summarizeStatuses(results) {
  const lastCheckAt = new Date().toISOString();
  let degradedCount = 0;
  let downCount = 0;
  const latencies = [];

  for (const result of results) {
    if (result.status === 'degraded') {
      degradedCount += 1;
    }
    if (result.status === 'down') {
      downCount += 1;
      degradedCount += 1;
    }
    if (typeof result.latencyMs === 'number') {
      latencies.push(result.latencyMs);
    }
  }

  const overallStatus =
    downCount > 0 ? 'down' : degradedCount > 0 ? 'degraded' : 'ok';
  const averageLatencyMs = latencies.length
    ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length)
    : null;

  return {
    overallStatus,
    totalServices: results.length,
    degradedCount,
    downCount,
    averageLatencyMs,
    lastCheckAt,
    services: results.map((result) => ({
      id: result.id,
      name: result.name,
      description: result.description,
      category: result.category,
      port: result.port,
      status: result.status,
      latencyMs: result.latencyMs,
      updatedAt: result.updatedAt,
      details: result.details,
    })),
  };
}

/**
 * Order results by severity (down > degraded > ok) and then by name.
 * @param {Array<Awaited<ReturnType<typeof evaluateService>>>} results
 */
function sortResultsBySeverity(results) {
  const severity = { down: 0, degraded: 1, ok: 2 };
  return [...results].sort((a, b) => {
    const severityDiff = (severity[a.status] ?? 3) - (severity[b.status] ?? 3);
    if (severityDiff !== 0) {
      return severityDiff;
    }
    return a.name.localeCompare(b.name);
  });
}

/**
 * Execute the comprehensive health check script and parse its JSON output.
 * Exit codes 0-2 are considered successful executions (healthy/degraded/critical).
 */
async function executeHealthCheckScript() {
  const start = performance.now();
  const args = ['--format', 'json'];
  const execOptions = {
    timeout: HEALTH_CHECK_SCRIPT_TIMEOUT_MS,
    maxBuffer: HEALTH_CHECK_SCRIPT_MAX_BUFFER,
  };

  try {
    const { stdout, stderr } = await execFileAsync(HEALTH_SCRIPT_PATH, args, execOptions);
    let parsed;
    try {
      parsed = JSON.parse(stdout);
    } catch (parseError) {
      logger.scriptExecution(HEALTH_SCRIPT_PATH, 0, performance.now() - start, {
        stderr,
        parseError: parseError.message,
      });
      const jsonError = new Error('Invalid JSON output from health check script');
      jsonError.code = 'EJSONPARSE';
      jsonError.stderr = stderr;
      jsonError.durationMs = performance.now() - start;
      throw jsonError;
    }
    const durationMs = performance.now() - start;

    logger.scriptExecution(HEALTH_SCRIPT_PATH, 0, durationMs, stderr ? { stderr } : undefined);

    return { payload: parsed, exitCode: 0, durationMs, stderr };
  } catch (error) {
    const durationMs = performance.now() - start;
    const stderr = error.stderr || '';

    // Script not found
    if (error.code === 'ENOENT') {
      logger.scriptExecution(HEALTH_SCRIPT_PATH, null, durationMs, { stderr });
      const notFoundError = new Error(`Health check script not found at ${HEALTH_SCRIPT_PATH}`);
      notFoundError.code = 'ENOENT';
      notFoundError.durationMs = durationMs;
      notFoundError.stderr = stderr;
      throw notFoundError;
    }

    // Timeout handling
    if (error.killed || error.signal === 'SIGTERM') {
      logger.scriptExecution(HEALTH_SCRIPT_PATH, null, durationMs, { stderr, signal: error.signal });
      const timeoutError = new Error(`Health check script timed out after ${HEALTH_CHECK_SCRIPT_TIMEOUT_MS / 1000}s`);
      timeoutError.code = 'ETIMEDOUT';
      timeoutError.durationMs = durationMs;
      timeoutError.stderr = stderr;
      throw timeoutError;
    }

    const exitCode = typeof error.code === 'number'
      ? error.code
      : Number.isFinite(Number(error.code))
        ? Number(error.code)
        : null;
    const stdout = error.stdout || '';

    // Exit codes 1-2 still provide structured data (degraded/critical)
    if (exitCode === 1 || exitCode === 2) {
      try {
        const parsed = JSON.parse(stdout);
        logger.scriptExecution(HEALTH_SCRIPT_PATH, exitCode, durationMs, stderr ? { stderr } : undefined);
        return { payload: parsed, exitCode, durationMs, stderr };
      } catch (parseError) {
        logger.scriptExecution(HEALTH_SCRIPT_PATH, exitCode, durationMs, {
          stderr,
          parseError: parseError.message,
        });
        const jsonError = new Error('Invalid JSON output from health check script');
        jsonError.code = 'EJSONPARSE';
        jsonError.durationMs = durationMs;
        jsonError.stderr = stderr;
        throw jsonError;
      }
    }

    // For other failures, propagate descriptive error
    logger.scriptExecution(HEALTH_SCRIPT_PATH, exitCode, durationMs, {
      stderr,
      error: error.message,
    });

    const execError = new Error('Failed to execute health check script');
    execError.code = error.code || 'EXEC_ERROR';
    execError.durationMs = durationMs;
    execError.stderr = stderr;
    throw execError;
  }
}

app.get('/api/status', async (_req, res) => {
  try {
    const results = await gatherServiceStatuses(SERVICE_TARGETS);
    const ordered = sortResultsBySeverity(results);
    const summary = summarizeStatuses(ordered);
    
    // Update overall status metric
    metrics.updateOverallStatus(summary.overallStatus);
    
    res.json(summary);
  } catch (error) {
    logger.error({ err: error, event: 'status_error' }, 'Failed to gather service status');
    res.status(500).json({
      success: false,
      error: 'Failed to gather service status',
      message: error.message,
    });
  }
});

app.get('/api/health/full', async (_req, res) => {
  const requestStart = performance.now();
  const cacheHit = isCacheValid(healthCheckCache);
  const cacheAgeSeconds = cacheHit ? getCacheAgeSeconds(healthCheckCache) : 0;

  res.set('X-Cache-Status', cacheHit ? 'HIT' : 'MISS');
  res.set('X-Cache-Age', String(cacheAgeSeconds));

  if (cacheHit) {
    const durationSeconds = (performance.now() - requestStart) / 1000;
    const status = healthCheckCache.data?.overallHealth || 'unknown';
    metrics.recordHealthCheckFull(true, durationSeconds, true);
    logger.healthCheckFull(status, true, healthCheckCache.durationMs, {
      cacheAgeSeconds,
      event: 'health_check_full_cache_hit',
    });
    return res.json(healthCheckCache.data);
  }

  logger.debug({ event: 'health_check_full_cache_miss' }, 'Comprehensive health check cache miss');

  if (!inFlightHealthCheck) {
    inFlightHealthCheck = executeHealthCheckScript();
  }

  let scriptResult;

  try {
    scriptResult = await inFlightHealthCheck;
  } catch (error) {
    inFlightHealthCheck = null;
    const durationSeconds = (error.durationMs || performance.now() - requestStart) / 1000;
    metrics.recordHealthCheckFull(false, durationSeconds, false);

    logger.error(
      { err: error, stderr: error.stderr, event: 'health_check_full_error' },
      'Failed to execute comprehensive health check'
    );

    return res.status(500).json({
      success: false,
      error: 'Failed to execute health check script',
      message: error.message,
    });
  }

  inFlightHealthCheck = null;
  updateCache(healthCheckCache, scriptResult.payload, scriptResult.durationMs);

  const status = scriptResult.payload?.overallHealth || 'unknown';
  const durationSeconds = scriptResult.durationMs / 1000;

  metrics.recordHealthCheckFull(false, durationSeconds, true);
  logger.healthCheckFull(status, false, scriptResult.durationMs, {
    exitCode: scriptResult.exitCode,
    stderr: scriptResult.stderr,
    event: 'health_check_full_execution',
  });

  return res.json(scriptResult.payload);
});

app.post('/launch', (req, res) => {
  const { serviceName, workingDir, command } = req.body;

  if (!serviceName || !workingDir || !command) {
    return res.status(400).json({
      success: false,
      error: 'Missing required fields: serviceName, workingDir, command',
    });
  }

  logger.launch(serviceName, workingDir, 'auto-detect', { command });

  try {
    // Detect available terminal
    const terminal = terminalDetector.detectTerminal();

    if (!terminal) {
      logger.error({ serviceName, event: 'launch_error' }, 'No terminal detected on this platform');
      return res.status(500).json({
        success: false,
        error: 'No supported terminal found on this system',
      });
    }

    logger.debug({ terminal, serviceName }, `Detected terminal: ${terminal.type}`);

    // Launch using detected terminal
    const result = terminalLauncher.launchByType(
      terminal.type,
      serviceName,
      workingDir,
      command
    );

    logger.info(
      { serviceName, method: result.method, platform: terminal.platform, event: 'launch_success' },
      `Service launched successfully: ${serviceName}`
    );
    
    metrics.recordServiceLaunch(serviceName, result.method, true);

    return res.json({
      success: true,
      message: `${serviceName} launched in ${terminal.type}`,
      terminal: terminal.type,
      platform: terminal.platform,
    });
  } catch (error) {
    logger.error({ serviceName, err: error, event: 'launch_error' }, 'Failed to launch service');
    metrics.recordServiceLaunch(serviceName, 'unknown', false);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Service configuration mapping for auto-start
const SERVICE_START_CONFIGS = {
  'workspace-api': {
    workingDir: path.join(projectRoot, 'backend/api/workspace'),
    command: 'npm run dev',
    displayName: 'Workspace API'
  },
  'documentation-api': {
    workingDir: path.join(projectRoot, 'backend/api/documentation-api'),
    command: 'npm run dev',
    displayName: 'Documentation API'
  },
  'tp-capital-signals-api': {
    workingDir: path.join(projectRoot, 'apps/tp-capital'),
    command: 'npm run dev',
    displayName: 'TP Capital API'
  },
  'b3-market-data-api': {
    workingDir: path.join(projectRoot, 'backend/api/b3'),
    command: 'npm run dev',
    displayName: 'B3 API'
  },
  'firecrawl-proxy': {
    workingDir: path.join(projectRoot, 'backend/api/firecrawl-proxy'),
    command: 'npm run dev',
    displayName: 'Firecrawl Proxy'
  }
};

// Rate limiting for auto-start (prevent rapid restarts)
const autoStartAttempts = new Map();
const AUTO_START_COOLDOWN_MS = 30000; // 30 seconds

app.post('/api/auto-start/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const config = SERVICE_START_CONFIGS[serviceId];

  if (!config) {
    return res.status(404).json({
      success: false,
      error: `Service configuration not found: ${serviceId}`
    });
  }

  // Check cooldown
  const lastAttempt = autoStartAttempts.get(serviceId);
  if (lastAttempt && Date.now() - lastAttempt < AUTO_START_COOLDOWN_MS) {
    const remainingSeconds = Math.ceil((AUTO_START_COOLDOWN_MS - (Date.now() - lastAttempt)) / 1000);
    return res.status(429).json({
      success: false,
      error: `Auto-start cooldown active. Try again in ${remainingSeconds}s`
    });
  }

  logger.info({ serviceId, event: 'auto_start_attempt' }, `Auto-starting service: ${config.displayName}`);

  try {
    const terminal = terminalDetector.detectTerminal();
    if (!terminal) {
      logger.error({ serviceId, event: 'auto_start_error' }, 'No terminal detected');
      return res.status(500).json({
        success: false,
        error: 'No supported terminal found'
      });
    }

    const result = terminalLauncher.launchByType(
      terminal.type,
      config.displayName,
      config.workingDir,
      config.command
    );

    autoStartAttempts.set(serviceId, Date.now());
    metrics.recordServiceLaunch(serviceId, result.method, true);

    logger.info(
      { serviceId, method: result.method, event: 'auto_start_success' },
      `Service auto-started: ${config.displayName}`
    );

    return res.json({
      success: true,
      message: `${config.displayName} auto-started`,
      serviceId,
      terminal: terminal.type
    });
  } catch (error) {
    logger.error({ serviceId, err: error, event: 'auto_start_error' }, 'Auto-start failed');
    metrics.recordServiceLaunch(serviceId, 'unknown', false);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'service-launcher-api' });
});

app.get('/circuit-breaker', (_req, res) => {
  const stats = circuitBreaker.getStats();
  const circuits = Array.from(stats.entries()).map(([serviceId, state]) => ({
    serviceId,
    ...state,
  }));

  res.json({
    threshold: circuitBreaker.threshold,
    timeoutMs: circuitBreaker.timeout,
    activeCircuits: circuits.length,
    circuits,
  });
});

app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', metrics.getContentType());
    const metricsOutput = await metrics.getMetrics();
    res.end(metricsOutput);
  } catch (error) {
    logger.error({ err: error, event: 'metrics_error' }, 'Failed to generate metrics');
    res.status(500).json({
      success: false,
      error: 'Failed to generate metrics',
      message: error.message,
    });
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    logger.startup('Launcher API started successfully', {
      port: PORT,
      endpoints: {
        launch: `POST http://localhost:${PORT}/launch`,
        health: `GET http://localhost:${PORT}/health`,
        status: `GET http://localhost:${PORT}/api/status`,
      },
    });
  });
}

module.exports = {
  app,
  PORT,
  SERVICE_TARGETS,
  evaluateService,
  gatherServiceStatuses,
  summarizeStatuses,
  sortResultsBySeverity,
  invalidateHealthCheckCache,
};
