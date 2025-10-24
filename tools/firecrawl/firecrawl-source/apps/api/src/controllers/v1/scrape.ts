import { Response } from "express";
import { logger as _logger } from "../../lib/logger";
import {
  Document,
  RequestWithAuth,
  ScrapeRequest,
  scrapeRequestSchema,
  ScrapeResponse,
} from "./types";
import { v4 as uuidv4 } from "uuid";
import { addScrapeJob, waitForJob } from "../../services/queue-jobs";
import { getJobPriority } from "../../lib/job-priority";
import { fromV1ScrapeOptions } from "../v2/types";
import { TransportableError } from "../../lib/error";
import { scrapeQueue } from "../../services/worker/nuq";
import { checkPermissions } from "../../lib/permissions";

export async function scrapeController(
  req: RequestWithAuth<{}, ScrapeResponse, ScrapeRequest>,
  res: Response<ScrapeResponse>,
) {
  // Get timing data from middleware (includes all middleware processing time)
  const middlewareStartTime =
    (req as any).requestTiming?.startTime || new Date().getTime();
  const controllerStartTime = new Date().getTime();

  const jobId: string = uuidv4();
  const preNormalizedBody = { ...req.body };
  req.body = scrapeRequestSchema.parse(req.body);

  const permissions = checkPermissions(req.body, req.acuc?.flags);
  if (permissions.error) {
    return res.status(403).json({
      success: false,
      error: permissions.error,
    });
  }

  const zeroDataRetention =
    req.acuc?.flags?.forceZDR || req.body.zeroDataRetention;

  const logger = _logger.child({
    method: "scrapeController",
    jobId,
    scrapeId: jobId,
    teamId: req.auth.team_id,
    team_id: req.auth.team_id,
    zeroDataRetention,
  });

  const middlewareTime = controllerStartTime - middlewareStartTime;

  logger.debug("Scrape " + jobId + " starting", {
    version: "v1",
    scrapeId: jobId,
    request: req.body,
    originalRequest: preNormalizedBody,
    account: req.account,
  });

  const origin = req.body.origin;
  const timeout = req.body.timeout;

  const startTime = new Date().getTime();

  const isDirectToBullMQ =
    process.env.SEARCH_PREVIEW_TOKEN !== undefined &&
    process.env.SEARCH_PREVIEW_TOKEN === req.body.__searchPreviewToken;

  const { scrapeOptions, internalOptions } = fromV1ScrapeOptions(
    req.body,
    req.body.timeout,
    req.auth.team_id,
  );

  const jobPriority = await getJobPriority({
    team_id: req.auth.team_id,
    basePriority: 10,
  });

  const bullJob = await addScrapeJob(
    {
      url: req.body.url,
      mode: "single_urls",
      team_id: req.auth.team_id,
      scrapeOptions,
      internalOptions: {
        ...internalOptions,
        teamId: req.auth.team_id,
        saveScrapeResultToGCS: process.env.GCS_FIRE_ENGINE_BUCKET_NAME
          ? true
          : false,
        unnormalizedSourceURL: preNormalizedBody.url,
        bypassBilling: isDirectToBullMQ,
        zeroDataRetention,
        teamFlags: req.acuc?.flags ?? null,
      },
      origin,
      integration: req.body.integration,
      startTime: controllerStartTime,
      zeroDataRetention: zeroDataRetention ?? false,
      apiKeyId: req.acuc?.api_key_id ?? null,
    },
    jobId,
    jobPriority,
    isDirectToBullMQ,
    true,
  );
  logger.info(
    "Added scrape job now" + (bullJob ? "" : " (to concurrency queue)"),
  );

  const totalWait =
    (req.body.waitFor ?? 0) +
    (req.body.actions ?? []).reduce(
      (a, x) => (x.type === "wait" ? (x.milliseconds ?? 0) : 0) + a,
      0,
    );

  let doc: Document;
  try {
    doc = await waitForJob(
      bullJob ? bullJob : jobId,
      timeout + totalWait,
      zeroDataRetention ?? false,
      logger,
    );
  } catch (e) {
    logger.error(`Error in scrapeController`, {
      version: "v1",
      error: e,
    });

    if (zeroDataRetention) {
      await scrapeQueue.removeJob(jobId, logger);
    }

    if (e instanceof TransportableError) {
      return res.status(e.code === "SCRAPE_TIMEOUT" ? 408 : 500).json({
        success: false,
        code: e.code,
        error: e.message,
      });
    } else {
      return res.status(500).json({
        success: false,
        code: "UNKNOWN_ERROR",
        error: `(Internal server error) - ${e && e.message ? e.message : e}`,
      });
    }
  }

  logger.info("Done with waitForJob");

  await scrapeQueue.removeJob(jobId, logger);

  logger.info("Removed job from queue");

  if (!req.body.formats.includes("rawHtml")) {
    if (doc && doc.rawHtml) {
      delete doc.rawHtml;
    }
  }

  const totalRequestTime = new Date().getTime() - middlewareStartTime;
  const controllerTime = new Date().getTime() - controllerStartTime;
  logger.info("Request metrics", {
    version: "v1",
    mode: "scrape",
    scrapeId: jobId,
    middlewareStartTime,
    controllerStartTime,
    middlewareTime,
    controllerTime,
    totalRequestTime,
  });

  return res.status(200).json({
    success: true,
    data: doc,
    scrape_id: origin?.includes("website") ? jobId : undefined,
  });
}
