/**
 * Collection Validation Schemas
 *
 * Zod schemas for validating collection-related requests
 */

import { z } from 'zod';

/**
 * Collection name validation
 * - Lowercase letters, numbers, hyphens, underscores only
 * - 1-50 characters
 */
const collectionNameSchema = z
  .string()
  .min(1, 'Collection name is required')
  .max(50, 'Collection name must be 50 characters or less')
  .regex(/^[a-z0-9-_]+$/, 'Collection name must contain only lowercase letters, numbers, hyphens, and underscores');

/**
 * Directory path validation
 * - Must be absolute path
 * - No directory traversal attacks
 */
const directoryPathSchema = z
  .string()
  .min(1, 'Directory path is required')
  .refine((path) => path.startsWith('/'), 'Directory must be an absolute path')
  .refine((path) => !path.includes('..'), 'Directory path cannot contain ".."');

/**
 * Embedding model validation
 */
const embeddingModelSchema = z.enum(['nomic-embed-text', 'mxbai-embed-large', 'embeddinggemma'], {
  errorMap: () => ({ message: 'Invalid embedding model. Must be "nomic-embed-text", "mxbai-embed-large", or "embeddinggemma"' }),
});

/**
 * File types array validation
 */
const fileTypesSchema = z
  .array(z.string().regex(/^[a-z0-9]+$/i, 'File type must be alphanumeric'))
  .min(1, 'At least one file type is required')
  .max(10, 'Maximum 10 file types allowed');

/**
 * Create Collection Request Schema
 */
export const createCollectionSchema = z.object({
  name: collectionNameSchema,
  description: z.string().min(1, 'Description is required').max(200, 'Description must be 200 characters or less'),
  directory: directoryPathSchema,
  embeddingModel: embeddingModelSchema,
  chunkSize: z.number().int().min(128, 'Chunk size must be at least 128').max(2048, 'Chunk size must be at most 2048').default(512),
  chunkOverlap: z.number().int().min(0, 'Chunk overlap cannot be negative').max(512, 'Chunk overlap must be at most 512').default(50),
  fileTypes: fileTypesSchema,
  recursive: z.boolean().default(true),
  enabled: z.boolean().default(true),
  autoUpdate: z.boolean().default(false),
});

/**
 * Update Collection Request Schema
 * All fields optional except name cannot be changed
 */
export const updateCollectionSchema = z.object({
  description: z.string().min(1).max(200).optional(),
  directory: directoryPathSchema.optional(),
  embeddingModel: embeddingModelSchema.optional(),
  chunkSize: z.number().int().min(128).max(2048).optional(),
  chunkOverlap: z.number().int().min(0).max(512).optional(),
  fileTypes: fileTypesSchema.optional(),
  recursive: z.boolean().optional(),
  enabled: z.boolean().optional(),
  autoUpdate: z.boolean().optional(),
});

/**
 * Ingest File Request Schema
 */
export const ingestFileSchema = z.object({
  filePath: z.string().min(1, 'File path is required').refine((path) => !path.includes('..'), 'File path cannot contain ".."'),
});

/**
 * Ingest Directory Request Schema
 */
export const ingestDirectorySchema = z.object({
  directory: directoryPathSchema,
});

/**
 * Query Parameters Schema
 */
export const statsQuerySchema = z.object({
  useCache: z
    .string()
    .optional()
    .transform((val) => val === 'true' || val === '1')
    .pipe(z.boolean()),
});

/**
 * Cache Key Parameter Schema
 */
export const cacheKeySchema = z.object({
  key: z.string().min(1, 'Cache key is required').max(100, 'Cache key must be 100 characters or less'),
});

/**
 * Cache Pattern Query Schema
 */
export const cachePatternSchema = z.object({
  pattern: z.string().min(1).max(100).default('*'),
});

// Type exports for TypeScript inference
export type CreateCollectionRequest = z.infer<typeof createCollectionSchema>;
export type UpdateCollectionRequest = z.infer<typeof updateCollectionSchema>;
export type IngestFileRequest = z.infer<typeof ingestFileSchema>;
export type IngestDirectoryRequest = z.infer<typeof ingestDirectorySchema>;
export type StatsQuery = z.infer<typeof statsQuerySchema>;
export type CacheKeyParam = z.infer<typeof cacheKeySchema>;
export type CachePatternQuery = z.infer<typeof cachePatternSchema>;
