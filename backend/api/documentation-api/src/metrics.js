import client from "prom-client";

const SERVICE_NAME = "documentation-api";
// Use default registry so all metrics are in the same registry
const register = client.register;

const stopDefaultMetricsCollection = client.collectDefaultMetrics({
  register,
  prefix: "tradingsystem_",
});

const httpRequestDurationSeconds = new client.Histogram({
  name: "tradingsystem_http_request_duration_seconds",
  help: "HTTP request duration in seconds.",
  labelNames: ["service", "method", "route", "status_code"],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1, 2, 5, 10],
});

const httpRequestsTotal = new client.Counter({
  name: "tradingsystem_http_requests_total",
  help: "Total number of HTTP requests.",
  labelNames: ["service", "method", "route", "status_code"],
});

register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(httpRequestsTotal);

const docsIndexLenientGauge = new client.Gauge({
  name: "tradingsystem_docs_index_lenient_mode",
  help: "Flag indicating whether the documentation index health check is in lenient mode (1=active).",
  labelNames: ["service"],
});

register.registerMetric(docsIndexLenientGauge);

const normalizeRoute = (req) => {
  if (req.route?.path) {
    return `${req.baseUrl || ""}${req.route.path}`;
  }
  return req.originalUrl?.split("?")[0] ?? req.url ?? "unknown_route";
};

const metricsMiddleware = (req, res, next) => {
  if (req.path === "/metrics") {
    return next();
  }

  const labels = {
    service: SERVICE_NAME,
    method: req.method,
  };
  const end = httpRequestDurationSeconds.startTimer(labels);

  res.on("finish", () => {
    const route = normalizeRoute(req);
    const statusCode = String(res.statusCode);
    const finalLabels = { ...labels, route, status_code: statusCode };
    httpRequestsTotal.inc(finalLabels);
    end({ route, status_code: statusCode });
  });

  next();
};

const metricsHandler = async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.send(await register.metrics());
};

const setDocsIndexLenientMode = (active) => {
  docsIndexLenientGauge.set(
    {
      service: SERVICE_NAME,
    },
    active ? 1 : 0,
  );
};

export {
  register,
  metricsMiddleware,
  metricsHandler,
  stopDefaultMetricsCollection,
  setDocsIndexLenientMode,
};
