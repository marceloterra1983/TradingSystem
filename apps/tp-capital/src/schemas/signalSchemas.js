/**
 * Zod Validation Schemas for Trading Signals
 */

import { z } from 'zod';

/**
 * Schema for getting signals (query params)
 */
export const GetSignalsQuerySchema = z.object({
  limit: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(1000))
    .optional(),
  
  channel: z.string()
    .min(1)
    .max(100)
    .optional(),
  
  type: z.string()
    .min(1)
    .max(50)
    .optional(),
  
  search: z.string()
    .min(1)
    .max(100)
    .optional(),
  
  from: z.string()
    .or(z.number())
    .transform((val) => {
      if (typeof val === 'number') return val;
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) return parsed;
      return Date.parse(val);
    })
    .optional(),
  
  to: z.string()
    .or(z.number())
    .transform((val) => {
      if (typeof val === 'number') return val;
      const parsed = parseInt(val, 10);
      if (!isNaN(parsed)) return parsed;
      return Date.parse(val);
    })
    .optional(),
});

/**
 * Schema for deleting signal (request body)
 */
export const DeleteSignalSchema = z.object({
  ingestedAt: z.string()
    .min(1, 'ingestedAt is required')
    .refine(
      (val) => !isNaN(Date.parse(val)),
      'ingestedAt must be a valid ISO 8601 datetime'
    ),
});

/**
 * Schema for sync messages request
 */
export const SyncMessagesSchema = z.object({
  limit: z.number()
    .int()
    .positive()
    .max(1000)
    .optional()
    .default(500),
  
  channelId: z.string()
    .regex(/^-?\d+$/)
    .optional(),
});

