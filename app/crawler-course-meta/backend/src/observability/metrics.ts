import client from 'prom-client';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const pagesVisited = new client.Counter({
  name: 'crawler_pages_visited_total',
  help: 'Total de páginas visitadas',
});

export const itemsExtracted = new client.Counter({
  name: 'crawler_items_extracted_total',
  help: 'Total de itens extraídos',
});

export const errorsTotal = new client.Counter({
  name: 'crawler_errors_total',
  help: 'Total de erros durante crawls',
});

export const runtimeSeconds = new client.Histogram({
  name: 'crawler_runtime_seconds',
  help: 'Duração dos jobs em segundos',
  buckets: [1, 5, 15, 30, 60, 120, 300, 600, 1200],
});

register.registerMetric(pagesVisited);
register.registerMetric(itemsExtracted);
register.registerMetric(errorsTotal);
register.registerMetric(runtimeSeconds);

export const metricsRegister = register;
