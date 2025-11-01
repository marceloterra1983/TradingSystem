/**
 * Collection Types
 *
 * TypeScript interfaces for RAG collections and models
 * Matches backend API contracts
 *
 * @module types/collections
 */

/**
 * Embedding model information
 */
export interface EmbeddingModel {
  name: string;
  dimensions: number;
  description: string;
  isDefault: boolean;
  available: boolean;
  capabilities?: string[];
  performance?: 'fast' | 'balanced' | 'quality';
  useCase?: string;
}

/**
 * Collection configuration
 */
export interface Collection {
  name: string;
  description: string;
  directory: string;
  embeddingModel: 'nomic-embed-text' | 'mxbai-embed-large' | 'embeddinggemma';
  chunkSize: number;
  chunkOverlap: number;
  fileTypes: string[];
  recursive: boolean;
  enabled: boolean;
  autoUpdate: boolean;
  stats?: CollectionStats;
}

/**
 * Collection statistics from Qdrant
 */
export interface CollectionStats {
  vectorsCount: number;
  pointsCount: number;
  segmentsCount: number;
  status: string;
  config?: any;
  totalFiles?: number;
  indexedFiles?: number;
  pendingFiles?: number;
  orphanChunks?: number;
  chunkCount?: number;
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId?: string;
    version: string;
  };
}

/**
 * Collection list response
 */
export interface CollectionsListResponse {
  collections: Collection[];
  total: number;
}

/**
 * Models list response
 */
export interface ModelsListResponse {
  models: EmbeddingModel[];
  total: number;
  available: number;
  default: string;
}

/**
 * Create collection request
 */
export interface CreateCollectionRequest {
  name: string;
  description: string;
  directory: string;
  embeddingModel: 'nomic-embed-text' | 'mxbai-embed-large' | 'embeddinggemma';
  chunkSize?: number;
  chunkOverlap?: number;
  fileTypes?: string[];
  recursive?: boolean;
  enabled?: boolean;
  autoUpdate?: boolean;
}

/**
 * Update collection request
 * Note: directory and embeddingModel are immutable after creation
 */
export interface UpdateCollectionRequest {
  description?: string;
  // directory is immutable - cannot be changed after creation
  // embeddingModel is immutable - cannot be changed after creation
  chunkSize?: number;
  chunkOverlap?: number;
  fileTypes?: string[];
  recursive?: boolean;
  enabled?: boolean;
  autoUpdate?: boolean;
}

/**
 * Ingestion job response
 */
export interface IngestionJobResponse {
  jobId: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  message: string;
}

/**
 * Collection operation response
 */
export interface CollectionOperationResponse {
  collection?: Collection;
  message: string;
  job?: IngestionJobResponse;
}

/**
 * Delete collection response
 */
export interface DeleteCollectionResponse {
  message: string;
  deletedCollection: {
    name: string;
    stats: {
      vectorsCount: number;
      pointsCount: number;
    } | null;
  };
}

/**
 * Form validation errors
 */
export interface FormErrors {
  [field: string]: string;
}

/**
 * Collection form state
 */
export interface CollectionFormState {
  name: string;
  description: string;
  directory: string;
  embeddingModel: 'nomic-embed-text' | 'mxbai-embed-large' | 'embeddinggemma';
  chunkSize: number;
  chunkOverlap: number;
  fileTypes: string[];
  recursive: boolean;
  enabled: boolean;
  autoUpdate: boolean;
}

/**
 * Collection action types
 */
export type CollectionAction =
  | 'create'
  | 'edit'
  | 'delete'
  | 'clone'
  | 'ingest'
  | 'clean-orphans';

/**
 * Collection dialog mode
 */
export type CollectionDialogMode = 'create' | 'edit' | 'clone';

/**
 * Collection sort field
 */
export type CollectionSortField =
  | 'name'
  | 'model'
  | 'directory'
  | 'chunks'
  | 'documents'
  | 'orphans';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Collection filter
 */
export interface CollectionFilter {
  search?: string;
  model?: string;
  enabled?: boolean;
  autoUpdate?: boolean;
}

/**
 * Collection sort
 */
export interface CollectionSort {
  field: CollectionSortField;
  direction: SortDirection;
}

/**
 * Bulk action
 */
export interface BulkAction {
  type: 'delete' | 'reingest' | 'enable' | 'disable';
  collectionNames: string[];
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    ingestion: {
      status: 'healthy' | 'unhealthy';
      url: string;
    };
    fileWatcher: {
      status: 'active' | 'inactive';
      enabled: boolean;
      watchedDirectories: number;
      eventsProcessed: number;
    };
    collections: {
      total: number;
      enabled: number;
      autoUpdate: number;
    };
  };
}
