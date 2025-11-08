import type { Express } from "express";
import { workerState } from "../jobs/worker.js";

export function registerHealthRoutes(app: Express) {
  app.get("/health", (req, res) => {
    const now = Date.now();
    const activeRuns = Array.from(workerState.activeRuns.entries()).map(
      ([runId, info]) => ({
        runId,
        pid: info.pid,
        startTime: info.startTime,
        durationMs: now - info.startTime,
      }),
    );

    const timeSinceLastPoll = now - workerState.lastPollTime;
    const workerHealthy = workerState.isRunning && timeSinceLastPoll < 30000; // 30s threshold

    res.json({
      status: workerHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      worker: {
        isRunning: workerState.isRunning,
        lastPollTime: new Date(workerState.lastPollTime).toISOString(),
        timeSinceLastPollMs: timeSinceLastPoll,
        activeRunsCount: workerState.activeRuns.size,
        activeRuns,
      },
    });
  });

  app.get("/health/worker", (req, res) => {
    const now = Date.now();
    const activeRuns = Array.from(workerState.activeRuns.entries()).map(
      ([runId, info]) => ({
        runId,
        pid: info.pid,
        startTime: new Date(info.startTime).toISOString(),
        durationMs: now - info.startTime,
      }),
    );

    res.json({
      isRunning: workerState.isRunning,
      lastPollTime: new Date(workerState.lastPollTime).toISOString(),
      timeSinceLastPollMs: now - workerState.lastPollTime,
      activeRunsCount: workerState.activeRuns.size,
      activeRuns,
    });
  });
}
