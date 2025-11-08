import { z } from 'zod';

export const jobSchema = z.object({
  id: z.string().min(3),
  platform: z.string().min(2),
  start_urls: z.array(z.string().url()).min(1),
  auth: z.object({
    method: z.union([
      z.literal('none'),
      z.literal('form'),
      z.literal('cookie'),
      z.literal('bearer'),
      z.literal('oauth2'),
      z.literal('sso'),
    ]),
    owner_login: z.boolean().optional(),
    credentials_env: z
      .object({
        username: z.string().optional(),
        password: z.string().optional(),
      })
      .optional(),
    session_store: z
      .object({
        enabled: z.boolean(),
        path: z.string(),
        encrypt_with_env: z.string(),
      })
      .optional(),
  }),
  selectors: z.record(z.any()),
  scroll: z
    .object({
      enabled: z.boolean(),
      step: z.number().optional(),
      delay_ms: z.number().optional(),
      max_scrolls: z.number().optional(),
    })
    .optional(),
  output: z.object({
    format: z.array(z.union([z.literal('json'), z.literal('md')])).min(1),
    directory: z.string(),
  }),
});

export type JobPayload = z.infer<typeof jobSchema>;
