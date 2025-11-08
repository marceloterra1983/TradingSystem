import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import env from './config/env.js';
import jobsRouter from './api/jobsRouter.js';
import sessionsRouter from './api/sessionsRouter.js';
import pluginsRouter from './api/pluginsRouter.js';
import metricsRouter from './api/metricsRouter.js';
import logger from './observability/logger.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/jobs', jobsRouter);
app.use('/api/plugins', pluginsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/metrics', metricsRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error({ err: message }, 'Unhandled error');
  res.status(500).json({ error: message });
});

app.listen(env.apiPort, () => {
  logger.info(`Crawler Course Meta API listening on port ${env.apiPort}`);
});
