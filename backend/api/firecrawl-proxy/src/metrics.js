import client from 'prom-client';

const SERVICE_NAME = 'firecrawl-proxy';
const register = new client.Registry();

export const stopDefaultMetricsCollection = client.collectDefaultMetrics({
  register,
  prefix: 'tradingsystem_'
});

const httpRequestDurationSeconds = new client.Histogram({
  name: 'tradingsystem_http_request_duration_seconds',
  help: 'HTTP request duration in seconds.',
  labelNames: ['service', 'method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60]
});

const httpRequestsTotal = new client.Counter({
  name: 'tradingsystem_http_requests_total',
  help: 'Total number of HTTP requests.',
  labelNames: ['service', 'method', 'route', 'status_code']
});

const firecrawlScrapeTotal = new client.Counter({
  name: 'tradingsystem_firecrawl_scrape_total',
  help: 'Total Firecrawl scrape operations proxied.',
  labelNames: ['service', 'status']
});

const firecrawlScrapeDuration = new client.Histogram({
  name: 'tradingsystem_firecrawl_scrape_duration_seconds',
  help: 'Firecrawl scrape duration in seconds.',
  labelNames: ['service', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5, 10, 20, 30, 60]
});

const firecrawlCrawlJobsTotal = new client.Counter({
  name: 'tradingsystem_firecrawl_crawl_jobs_total',
  help: 'Total Firecrawl crawl jobs initiated via proxy.',
  labelNames: ['service', 'status']
});

const firecrawlCrawlStatusChecks = new client.Counter({
  name: 'tradingsystem_firecrawl_crawl_status_checks_total',
  help: 'Total Firecrawl crawl status checks.',
  labelNames: ['service', 'crawl_status']
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsTotal);
register.registerMetric(firecrawlScrapeTotal);
register.registerMetric(firecrawlScrapeDuration);
register.registerMetric(firecrawlCrawlJobsTotal);
register.registerMetric(firecrawlCrawlStatusChecks);

const normalizeRoute = (req) => {
  if (req.route?.path) {
    return `${req.baseUrl || ''}${req.route.path}`;
  }
  return req.originalUrl?.split('?')[0] ?? req.url ?? 'unknown_route';
};

export const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  const labels = {
    service: SERVICE_NAME,
    method: req.method
  };

  const end = httpRequestDurationSeconds.startTimer(labels);

  res.on('finish', () => {
    const route = normalizeRoute(req);
    const statusCode = String(res.statusCode);
    const finalLabels = { ...labels, route, status_code: statusCode };
    httpRequestsTotal.inc(finalLabels);
    end({ route, status_code: statusCode });
  });

  next();
};

export const metricsHandler = async (_req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
};

export const recordScrape = (status, durationSeconds) => {
  firecrawlScrapeTotal.inc({ service: SERVICE_NAME, status });
  firecrawlScrapeDuration.observe({ service: SERVICE_NAME, status }, durationSeconds);
};

export const recordCrawlJob = (status) => {
  firecrawlCrawlJobsTotal.inc({ service: SERVICE_NAME, status });
};

export const recordCrawlStatusCheck = (status) => {
  firecrawlCrawlStatusChecks.inc({ service: SERVICE_NAME, crawl_status: status });
};

export default register;
