import type { Request, Response } from 'express';
import { logger } from '../logger.js';
import { env } from '../config/env.js';

export function handleWebhook(req: Request, res: Response) {
  if (env.TOKEN) {
    const provided =
      req.header('x-waha-token') || req.header('X-WAHA-TOKEN') || '';
    if (provided !== env.TOKEN) {
      logger.warn({ provided }, 'Webhook rejected due to invalid token');
      return res.status(401).json({ message: 'Invalid webhook token' });
    }
  }

  const payload = req.body ?? {};
  const event = payload.event ?? 'unknown';
  const session = payload.session ?? payload?.data?.session ?? 'unknown';

  logger.info({ event, session, payload }, 'WAHA webhook received');
  return res.status(204).send();
}
