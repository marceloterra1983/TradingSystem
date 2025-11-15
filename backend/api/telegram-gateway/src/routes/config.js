/**
 * Runtime Configuration Endpoint
 * Provides frontend with necessary configuration at runtime
 * Eliminates need for build-time environment variables
 */

import express from "express";
import { config } from "../config.js";

const router = express.Router();

/**
 * GET /api/telegram-gateway/config
 * Returns frontend configuration including auth token
 *
 * Security: This endpoint is only accessible from same-origin
 * The token is transmitted over HTTPS in production
 */
router.get("/config", (req, res) => {
  const logger = req.log || console;

  try {
    const frontendConfig = {
      apiBaseUrl: process.env.TELEGRAM_GATEWAY_API_URL || "http://localhost:9082/api/telegram-gateway",
      messagesBaseUrl: process.env.TELEGRAM_MESSAGES_API_URL || "http://localhost:9082/api/messages",
      channelsBaseUrl: process.env.TELEGRAM_CHANNELS_API_URL || "http://localhost:9082/api/channels",
      authToken: config.apiToken, // Server-provided token
      environment: config.env,
      features: {
        authEnabled: Boolean(config.apiToken),
        metricsEnabled: true,
        queueMonitoringEnabled: true,
      },
    };

    logger.info(
      {
        clientIp: req.ip,
        userAgent: req.get("user-agent"),
      },
      "Frontend config requested"
    );

    res.json({
      success: true,
      data: frontendConfig,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, "Failed to generate frontend config");
    res.status(500).json({
      success: false,
      error: "Failed to load configuration",
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
