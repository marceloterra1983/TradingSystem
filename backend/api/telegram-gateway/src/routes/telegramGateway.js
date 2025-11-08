import { Router } from "express";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";
import {
  buildMessageSummary,
  cancelAuthentication,
  getAuthenticationStatus,
  getMetrics,
  getOverview,
  getQueue,
  getQueuePreviewLimit,
  getSession,
  invalidateCaches,
  startAuthentication,
  submitAuthenticationInput,
} from "../services/telegramGatewayFacade.js";

export const telegramGatewayRouter = Router();

telegramGatewayRouter.post("/actions/reload", (_req, res) => {
  invalidateCaches();
  res.json({
    success: true,
    message: "Caches invalidados com sucesso",
    timestamp: new Date().toISOString(),
  });
});

telegramGatewayRouter.get("/auth/status", (_req, res) => {
  res.json({
    success: true,
    data: getAuthenticationStatus(),
  });
});

telegramGatewayRouter.post("/auth/start", (_req, res, next) => {
  try {
    const status = startAuthentication();
    res.json({
      success: true,
      message: "Processo de autenticação iniciado",
      data: status,
    });
  } catch (error) {
    if (error.code === "ALREADY_RUNNING") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

telegramGatewayRouter.post("/auth/input", (req, res, next) => {
  const value =
    typeof req.body?.value === "string" ? req.body.value.trim() : "";
  if (!value) {
    return res.status(400).json({
      success: false,
      message: 'Campo "value" é obrigatório',
    });
  }

  try {
    submitAuthenticationInput(value);
    res.json({
      success: true,
      message: "Entrada enviada ao processo de autenticação",
      data: getAuthenticationStatus(),
    });
  } catch (error) {
    if (error.code === "NO_PROCESS") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    if (error.code === "STDIN_CLOSED") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

telegramGatewayRouter.post("/auth/cancel", (_req, res, next) => {
  try {
    cancelAuthentication();
    res.json({
      success: true,
      message: "Cancelamento solicitado",
      data: getAuthenticationStatus(),
    });
  } catch (error) {
    if (error.code === "NO_PROCESS") {
      return res.status(409).json({
        success: false,
        message: error.message,
      });
    }
    next(error);
  }
});

telegramGatewayRouter.get("/overview", async (req, res, next) => {
  try {
    const data = await getOverview({ logger: req.log });
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get("/metrics", async (_req, res, next) => {
  try {
    const data = await getMetrics();
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get("/queue", async (req, res, next) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const data = await getQueue({ limit });
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get("/session", async (_req, res, next) => {
  try {
    const data = await getSession();
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get("/messages/summary", async (req, res, next) => {
  try {
    const data = await buildMessageSummary({ logger: req.log });
    res.json({
      success: !data?.error,
      data,
    });
  } catch (error) {
    next(error);
  }
});

telegramGatewayRouter.get("/queue/preview-limit", (_req, res) => {
  res.json({
    success: true,
    data: {
      limit: getQueuePreviewLimit(),
    },
  });
});

// PHOTO DOWNLOAD ENDPOINT: Download Telegram photos via MTProto service
telegramGatewayRouter.get("/photos/:channelId/:messageId", async (req, res) => {
  const { channelId, messageId } = req.params;

  try {
    // Define cache directory
    const cacheDir = path.join(process.cwd(), "cache", "photos");
    const cacheFile = path.join(cacheDir, `${channelId}_${messageId}.jpg`);

    // Check if photo is already cached
    if (existsSync(cacheFile)) {
      req.log?.info?.(
        { channelId, messageId },
        "[PhotoDownload] Serving from cache",
      );

      return res.sendFile(cacheFile, (err) => {
        if (err) {
          req.log?.error?.(
            { err, channelId, messageId },
            "[PhotoDownload] Failed to send cached file",
          );
          res.status(500).json({
            success: false,
            error: "Failed to send cached photo",
          });
        }
      });
    }

    req.log?.info?.(
      { channelId, messageId },
      "[PhotoDownload] Fetching from MTProto service",
    );

    // Fetch photo from MTProto service
    const mtprotoServiceUrl =
      process.env.MTPROTO_SERVICE_URL || "http://localhost:4007";

    const response = await fetch(
      `${mtprotoServiceUrl}/photo/${channelId}/${messageId}`,
      {
        signal: AbortSignal.timeout(30000), // 30s timeout for photo download
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      req.log?.error?.(
        {
          channelId,
          messageId,
          status: response.status,
          error: errorText,
        },
        "[PhotoDownload] MTProto service returned error",
      );

      return res.status(response.status).json({
        success: false,
        error: "Failed to fetch photo from MTProto service",
        details: errorText,
      });
    }

    // Get photo buffer
    const photoBuffer = Buffer.from(await response.arrayBuffer());

    // Create cache directory if it doesn't exist
    await fs.mkdir(cacheDir, { recursive: true });

    // Save to cache (fire and forget - don't wait)
    fs.writeFile(cacheFile, photoBuffer).catch((err) => {
      req.log?.warn?.(
        { err, channelId, messageId },
        "[PhotoDownload] Failed to cache photo",
      );
    });

    // Send photo to client
    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
    res.send(photoBuffer);

    req.log?.info?.(
      { channelId, messageId, size: photoBuffer.length },
      "[PhotoDownload] Photo sent successfully",
    );
  } catch (error) {
    req.log?.error?.(
      { err: error, channelId, messageId },
      "[PhotoDownload] Failed to download photo",
    );

    res.status(500).json({
      success: false,
      error: "Failed to download photo",
      message: error.message,
    });
  }
});

// PROTECTED ENDPOINT: Require API key authentication
telegramGatewayRouter.post("/sync-messages", async (req, res, next) => {
  // Validate API key first (accept both X-API-Key and X-Gateway-Token for compatibility)
  const apiKey = req.headers["x-api-key"] || req.headers["x-gateway-token"];
  // Use TELEGRAM_GATEWAY_API_TOKEN (same as other endpoints)
  const expectedKey =
    process.env.TELEGRAM_GATEWAY_API_TOKEN ||
    process.env.API_SECRET_TOKEN ||
    process.env.TELEGRAM_GATEWAY_API_KEY;

  if (!expectedKey) {
    req.log?.error?.("[Auth] TELEGRAM_GATEWAY_API_TOKEN not configured");
    return res.status(500).json({
      success: false,
      error: "API authentication not configured",
      message: "Server misconfiguration: API token not set",
    });
  }

  if (!apiKey || apiKey !== expectedKey) {
    req.log?.warn?.(
      { ip: req.ip, path: req.path },
      "[Auth] Invalid or missing API key",
    );
    return res.status(apiKey ? 403 : 401).json({
      success: false,
      error: apiKey ? "Forbidden" : "Unauthorized",
      message: apiKey
        ? "Invalid API key"
        : "Missing X-API-Key or X-Gateway-Token header",
    });
  }

  // API key validated, continue with sync logic
  try {
    req.log.info("[SyncMessages] Sync requested via dashboard (authenticated)");

    const { limit = 500, channels, concurrency = 3 } = req.body;

    // ARCHITECTURAL FIX: Delegate to MTProto service (port 4006) via HTTP
    // This service already has an authenticated Telegram session
    // Avoids duplicate authentication and follows single responsibility principle

    // Determine which channels to sync
    const { listChannels } = await import("../db/channelsRepository.js");
    const activeChannels = await listChannels({ logger: req.log });
    const activeChannelIds = activeChannels
      .filter((ch) => ch.isActive)
      .map((ch) => ch.channelId);

    const channelsToSync =
      channels ||
      (activeChannelIds.length > 0
        ? activeChannelIds
        : [process.env.TELEGRAM_SIGNALS_CHANNEL_ID]);

    if (channelsToSync.length === 0) {
      req.log.warn("[SyncMessages] No active channels configured");
      return res.json({
        success: true,
        message: "Nenhum canal ativo configurado para sincronização",
        data: {
          totalMessagesSynced: 0,
          totalMessagesSaved: 0,
          channelsSynced: [],
          timestamp: new Date().toISOString(),
        },
      });
    }

    req.log.info(
      { channelCount: channelsToSync.length, channels: channelsToSync },
      "[SyncMessages] Delegating to MTProto service",
    );

    // Call MTProto service endpoint (has authenticated session)
    const mtprotoServiceUrl =
      process.env.MTPROTO_SERVICE_URL || "http://localhost:4007";
    const mtprotoApiKey = process.env.MTPROTO_SERVICE_API_KEY || expectedKey;

    const response = await fetch(`${mtprotoServiceUrl}/sync-messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": mtprotoApiKey, // Forward authentication to MTProto service
      },
      body: JSON.stringify({
        limit, // MTProto service only uses limit, fetches channels internally
      }),
      signal: AbortSignal.timeout(180000), // 180s timeout (3 minutes) for large syncs
    });

    if (!response.ok) {
      const errorText = await response.text();
      req.log.error(
        { status: response.status, error: errorText },
        "[SyncMessages] MTProto service returned error",
      );
      return res.status(502).json({
        success: false,
        message: "Serviço MTProto não está disponível ou retornou erro",
        error: `HTTP ${response.status}: ${errorText}`,
      });
    }

    const result = await response.json();

    const totalSynced = result.data?.totalMessagesSynced || 0;
    const channelsSynced = result.data?.channelsSynced || [];

    req.log.info(
      {
        totalSynced,
        channelsCount: channelsSynced.length,
      },
      "[SyncMessages] Sync completed via MTProto service",
    );

    // HTTP response handling (route responsibility)
    return res.json({
      success: true,
      message:
        totalSynced > 0
          ? `${totalSynced} mensagem(ns) sincronizada(s) de ${channelsSynced.length} canal(is). ${totalSynced} salvas no banco.`
          : "Todas as mensagens estão sincronizadas",
      data: {
        totalMessagesSynced: totalSynced,
        totalMessagesSaved: totalSynced, // MTProto service saves all synced messages
        channelsSynced,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    req.log.error({ err: error }, "[SyncMessages] Unexpected error");

    // Specific error messages
    if (error.name === "AbortError" || error.code === "ETIMEDOUT") {
      return res.status(504).json({
        success: false,
        message: "Timeout ao conectar com serviço MTProto (60s)",
        error: "Gateway Timeout",
      });
    }

    if (error.code === "ECONNREFUSED") {
      return res.status(503).json({
        success: false,
        message: "Serviço MTProto não está rodando (porta 4006)",
        error:
          "Service Unavailable - verifique se o serviço MTProto está ativo",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Erro interno ao processar sincronização",
      error: error.message,
    });
  }
});
