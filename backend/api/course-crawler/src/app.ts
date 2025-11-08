import express from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { requestIdMiddleware } from "./middleware/request-id.js";
import { httpMetricsMiddleware } from "./middleware/metrics.js";
import { registerCourseRoutes } from "./routes/courses.js";
import { registerRunRoutes } from "./routes/runs.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMetricsRoutes } from "./routes/metrics.js";
import { env } from "./config/environment.js";

export function createApp() {
  const app = express();

  // Request ID tracking MUST come before logging to include ID in logs
  app.use(requestIdMiddleware);
  app.use(httpMetricsMiddleware);
  app.use(pinoHttp());
  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin) {
          return callback(null, true);
        }

        if (env.COURSE_CRAWLER_CORS_ORIGINS.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin ${origin} not allowed by CORS policy`));
        }
      },
      credentials: true,
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

  // Public routes (no auth required)
  registerHealthRoutes(app);
  registerAuthRoutes(app);
  registerMetricsRoutes(app);

  // Protected routes (JWT required)
  registerCourseRoutes(app);
  registerRunRoutes(app);

  app.use(
    (
      err: unknown,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      req.log?.error({ err }, "Unhandled error");
      res.status(500).json({ message: "Unexpected error" });
      next();
    },
  );

  return app;
}

export function startServer() {
  const app = createApp();
  const server = app.listen(env.COURSE_CRAWLER_API_PORT, () => {
    // eslint-disable-next-line no-console
    console.log(
      `Course Crawler API listening on ${env.COURSE_CRAWLER_API_PORT}`,
    );
  });
  return server;
}
