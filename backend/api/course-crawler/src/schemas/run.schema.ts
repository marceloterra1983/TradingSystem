import { z } from "zod";

/**
 * Schema for creating a new run
 */
export const CreateRunSchema = z.object({
  courseId: z.string().uuid("Invalid course ID format"),
});

export type CreateRunInput = z.infer<typeof CreateRunSchema>;

/**
 * Schema for run ID parameter
 */
export const RunIdSchema = z.string().uuid("Invalid run ID format");

/**
 * Schema for run status filter
 */
export const RunStatusSchema = z.enum([
  "queued",
  "running",
  "success",
  "failed",
  "cancelled",
]);

export type RunStatus = z.infer<typeof RunStatusSchema>;
