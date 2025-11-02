/**
 * Zod Validation Schemas for Telegram Channels
 */

import { z } from 'zod';

/**
 * Schema for creating a new Telegram channel
 */
export const CreateChannelSchema = z.object({
  label: z.string()
    .min(1, 'Label is required')
    .max(100, 'Label must be at most 100 characters')
    .trim(),
  
  channel_id: z.string()
    .regex(/^-?\d+$/, 'Channel ID must be a valid Telegram channel ID (numeric string)')
    .refine(
      (id) => id.startsWith('-100') || id.length <= 15,
      'Channel ID should start with -100 for supergroups/channels'
    ),
  
  channel_type: z.enum(['source', 'destination'])
    .default('source'),
  
  description: z.string()
    .max(500, 'Description must be at most 500 characters')
    .trim()
    .optional()
    .default(''),
});

/**
 * Schema for updating a Telegram channel
 */
export const UpdateChannelSchema = z.object({
  label: z.string()
    .min(1)
    .max(100)
    .trim()
    .optional(),
  
  channel_id: z.string()
    .regex(/^-?\d+$/)
    .optional(),
  
  channel_type: z.enum(['source', 'destination'])
    .optional(),
  
  description: z.string()
    .max(500)
    .trim()
    .optional(),
  
  status: z.enum(['active', 'inactive', 'deleted'])
    .optional(),
  
  signal_count: z.number()
    .int()
    .nonnegative()
    .optional(),
  
  last_signal: z.string()
    .datetime()
    .or(z.date())
    .optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

/**
 * Schema for channel ID parameter
 */
export const ChannelIdParamSchema = z.object({
  id: z.string()
    .min(1, 'Channel ID is required'),
});

/**
 * Schema for getting channels (query params)
 */
export const GetChannelsQuerySchema = z.object({
  limit: z.string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive().max(1000))
    .optional()
    .default('100'),
  
  channel_type: z.enum(['source', 'destination'])
    .optional(),
  
  status: z.enum(['active', 'inactive', 'deleted'])
    .optional()
    .default('active'),
});

