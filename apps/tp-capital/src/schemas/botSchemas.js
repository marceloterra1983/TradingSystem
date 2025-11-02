/**
 * Zod Validation Schemas for Telegram Bots
 */

import { z } from 'zod';

/**
 * Schema for creating a new Telegram bot
 */
export const CreateBotSchema = z.object({
  username: z.string()
    .min(5, 'Username must be at least 5 characters')
    .max(32, 'Username must be at most 32 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .trim(),
  
  token: z.string()
    .min(40, 'Bot token must be at least 40 characters')
    .max(200, 'Bot token is too long')
    .regex(/^\d+:[A-Za-z0-9_-]+$/, 'Invalid bot token format'),
  
  bot_type: z.enum(['Sender', 'Forwarder', 'Ingestion', 'Monitor'])
    .default('Sender'),
  
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .default(''),
});

/**
 * Schema for updating a Telegram bot
 */
export const UpdateBotSchema = z.object({
  username: z.string()
    .min(5)
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/)
    .trim()
    .optional(),
  
  token: z.string()
    .min(40)
    .max(200)
    .regex(/^\d+:[A-Za-z0-9_-]+$/)
    .optional(),
  
  bot_type: z.enum(['Sender', 'Forwarder', 'Ingestion', 'Monitor'])
    .optional(),
  
  description: z.string()
    .max(500)
    .trim()
    .optional(),
  
  status: z.enum(['active', 'inactive', 'deleted'])
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

/**
 * Schema for bot ID parameter
 */
export const BotIdParamSchema = z.object({
  id: z.string()
    .min(1, 'Bot ID is required'),
});

