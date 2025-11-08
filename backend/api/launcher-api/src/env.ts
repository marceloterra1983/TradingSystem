import { z } from "zod";

const EnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(3909),
  TOKEN: z.string().min(8, "LAUNCHER_API_TOKEN must be set").optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
});

export const env = EnvSchema.parse({
  PORT: process.env.LAUNCHER_API_PORT,
  TOKEN: process.env.LAUNCHER_API_TOKEN,
  LOG_LEVEL: process.env.LAUNCHER_API_LOG_LEVEL,
});
