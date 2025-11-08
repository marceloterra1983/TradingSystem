import { z } from "zod";

/**
 * Schema for creating a new course
 */
export const CreateCourseSchema = z.object({
  name: z
    .string()
    .min(1, "Course name is required")
    .max(255, "Course name too long"),
  baseUrl: z.string().url("Invalid base URL format"),
  username: z
    .string()
    .min(1, "Username is required")
    .max(255, "Username too long"),
  password: z.string().min(1, "Password is required"),
  targetUrls: z
    .array(z.string().url("Invalid target URL format"))
    .min(1, "At least one target URL is required"),
});

export type CreateCourseInput = z.infer<typeof CreateCourseSchema>;

/**
 * Schema for updating an existing course
 */
export const UpdateCourseSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    baseUrl: z.string().url().optional(),
    username: z.string().min(1).max(255).optional(),
    password: z.string().min(1).optional(),
    targetUrls: z.array(z.string().url()).min(1).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

export type UpdateCourseInput = z.infer<typeof UpdateCourseSchema>;

/**
 * Schema for course ID parameter
 */
export const CourseIdSchema = z.string().uuid("Invalid course ID format");
