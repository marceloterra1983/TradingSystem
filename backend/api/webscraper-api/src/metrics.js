import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics
} from 'prom-client';

export const register = new Registry();
collectDefaultMetrics({ register });

const httpRequestCounter = new Counter({
  name: 'webscraper_http_requests_total',
  help: 'Total number of HTTP requests handled by the WebScraper API',
  labelNames: ['method', 'route', 'status'],
  registers: [register]
});

const httpRequestDuration = new Histogram({
  name: 'webscraper_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register]
});

const jobCounter = new Counter({
  name: 'webscraper_jobs_total',
  help: 'Total jobs processed by type and status',
  labelNames: ['type', 'status'],
  registers: [register]
});

const templatesGauge = new Gauge({
  name: 'webscraper_templates_total',
  help: 'Number of templates stored',
  registers: [register]
});

const activeJobsGauge = new Gauge({
  name: 'webscraper_active_jobs',
  help: 'Number of active running jobs',
  registers: [register]
});

const schedulesGauge = new Gauge({
  name: 'webscraper_schedules_total',
  help: 'Number of active schedules by type and enabled state',
  labelNames: ['type', 'enabled'],
  registers: [register]
});

const scheduleExecutionCounter = new Counter({
  name: 'webscraper_schedule_executions_total',
  help: 'Total scheduled executions grouped by schedule type and status',
  labelNames: ['schedule_type', 'status'],
  registers: [register]
});

const scheduleExecutionDurationHistogram = new Histogram({
  name: 'webscraper_schedule_execution_duration_seconds',
  help: 'Duration of scheduled job executions in seconds',
  labelNames: ['schedule_type'],
  buckets: [1, 5, 10, 30, 60, 120, 300],
  registers: [register]
});

const exportsGauge = new Gauge({
  name: 'webscraper_exports_total',
  help: 'Number of export jobs by status and type',
  labelNames: ['status', 'export_type'],
  registers: [register]
});

const exportExecutionCounter = new Counter({
  name: 'webscraper_export_executions_total',
  help: 'Total export executions grouped by type and status',
  labelNames: ['export_type', 'status'],
  registers: [register]
});

const exportDurationHistogram = new Histogram({
  name: 'webscraper_export_duration_seconds',
  help: 'Duration of export generation in seconds',
  labelNames: ['export_type', 'format'],
  buckets: [1, 5, 10, 30, 60, 120, 300, 600],
  registers: [register]
});

const exportFileSizeHistogram = new Histogram({
  name: 'webscraper_export_file_size_bytes',
  help: 'Export file sizes in bytes by type and format',
  labelNames: ['export_type', 'format'],
  buckets: [1024, 10_240, 102_400, 1_048_576, 10_485_760, 104_857_600],
  registers: [register]
});

function resolveRouteLabel(req) {
  if (req.route?.path) {
    const base = req.baseUrl ?? '';
    return `${base}${req.route.path}` || 'unknown';
  }
  if (req.originalUrl) {
    return 'unmatched';
  }
  return 'unmatched';
}

export function metricsMiddleware(req, res, next) {
  const endTimer = httpRequestDuration.startTimer();
  res.on('finish', () => {
    const routeLabel = resolveRouteLabel(req);
    const labels = { method: req.method, route: routeLabel };
    httpRequestCounter.inc({ ...labels, status: res.statusCode });
    endTimer(labels);
  });
  next();
}

export async function metricsHandler() {
  return register.metrics();
}

export function incrementJobMetric(type, status) {
  jobCounter.inc({ type, status });
}

export function setTemplateCount(count) {
  templatesGauge.set(count);
}

export function setActiveJobCount(count) {
  activeJobsGauge.set(count);
}

export function setScheduleCount(type, enabled, count) {
  schedulesGauge.set({ type, enabled: String(enabled) }, count);
}

export function incrementScheduleExecution(scheduleType, status) {
  scheduleExecutionCounter.inc({ schedule_type: scheduleType, status });
}

export function observeScheduleExecutionDuration(scheduleType, durationSeconds) {
  scheduleExecutionDurationHistogram.observe(
    { schedule_type: scheduleType },
    durationSeconds
  );
}

export function setExportCount(status, exportType, count) {
  exportsGauge.set({ status, export_type: exportType }, count);
}

export function incrementExportExecution(exportType, status) {
  exportExecutionCounter.inc({ export_type: exportType, status });
}

export function observeExportDuration(exportType, format, durationSeconds) {
  exportDurationHistogram.observe({ export_type: exportType, format }, durationSeconds);
}

export function observeExportFileSize(exportType, format, sizeBytes) {
  exportFileSizeHistogram.observe({ export_type: exportType, format }, sizeBytes);
}
