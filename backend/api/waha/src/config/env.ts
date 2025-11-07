import { z } from 'zod';

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3908),
  TOKEN: z
    .string()
    .trim()
    .optional()
    .transform((value) => (value ? value.trim() : undefined)),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info')
});

export const env = EnvSchema.parse({
  PORT: process.env.WAHA_WEBHOOK_PORT,
  TOKEN: process.env.WAHA_WEBHOOK_TOKEN,
  LOG_LEVEL: process.env.WAHA_WEBHOOK_LOG_LEVEL
});
