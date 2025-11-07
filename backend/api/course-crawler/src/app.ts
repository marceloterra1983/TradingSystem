import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { registerCourseRoutes } from './routes/courses.js';
import { registerRunRoutes } from './routes/runs.js';
import { registerHealthRoutes } from './routes/health.js';
import { env } from './config/environment.js';

export function createApp() {
  const app = express();

  app.use(pinoHttp());
  app.use(helmet());
  app.use(
    cors({
      origin: '*',
    }),
  );
  app.use(compression());
  app.use(express.json());
  app.use(
    rateLimit({
      windowMs: 60_000,
      max: 120,
      standardHeaders: true,
      legacyHeaders: false,
    }),
  );

  registerCourseRoutes(app);
  registerRunRoutes(app);
  registerHealthRoutes(app);

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      req.log?.error({ err }, 'Unhandled error');
      res.status(500).json({ message: 'Unexpected error' });
      next();
    },
  );

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(env.COURSE_CRAWLER_API_PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Course Crawler API listening on ${env.COURSE_CRAWLER_API_PORT}`);
  });
  return server;
}
