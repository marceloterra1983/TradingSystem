import axios, { AxiosInstance, AxiosError } from 'axios';
import { apiConfig, getApiUrl } from '../config/api';

export interface System {
  id: string;
  name: string;
  description?: string;
  url?: string;
  port?: number;
  status?: 'online' | 'offline' | 'maintenance';
  color?: string;
  tags?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Idea {
  id: string;
  title: string;
  description?: string;
  system_id?: string;
  status: 'backlog' | 'in_progress' | 'done' | 'cancelled';
  priority?: 'low' | 'medium' | 'high';
  category?: 'api' | 'frontend' | 'backend' | 'infrastructure';
  assigned_to?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
}

export interface FileMetadata {
  id: string;
  idea_id: string;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path?: string;
  uploaded_by?: string;
  uploaded_at: string;
}

export interface KanbanBoard {
  backlog: Idea[];
  in_progress: Idea[];
  done: Idea[];
  cancelled: Idea[];
}

export interface Statistics {
  systems: {
    total: number;
    by_status: Record<string, number>;
    online_count?: number;
    port_range?: { min: number; max: number };
  };
  ideas: {
    total: number;
    by_status: Record<string, number>;
    by_category?: Record<string, number>;
    by_priority?: Record<string, number>;
    completion_rate?: number;
    recent_activity?: { created_last_7_days: number };
  };
  files: {
    total: number;
    total_size: number;
    total_size_mb?: number;
    by_mime_type: Record<string, { count: number; size?: number }>;
    by_idea?: Record<string, number>;
  };
}

export interface ActivityData {
  date: string;
  systems_created: number;
  ideas_created: number;
  ideas_completed: number;
  files_uploaded: number;
}

export interface DocumentationMetrics {
  metadata: {
    generatedAt: string;
    version: string;
    source: string;
  };
  healthScore: {
    current: number;
    grade: string;
    status: string;
    trend: string;
  };
  freshness: {
    distribution: Array<{
      label: string;
      count: number;
      percentage: number;
    }>;
    outdatedCount: number;
    averageAge: number;
  };
  issues: {
    breakdown: Record<string, number>;
    bySeverity: Record<string, number>;
    total: number;
  };
  coverage: {
    byOwner: Array<{
      owner: string;
      count: number;
      percentage: number;
    }>;
    byCategory: Array<{
      category: string;
      count: number;
      percentage: number;
    }>;
    totalFiles: number;
  };
  historical: Array<{
    date: string;
    healthScore: number;
    issueCount: number;
  }>;
}

export interface SystemHealth {
  id: string;
  name: string;
  status: string;
  last_updated: string;
  health_score: number;
  issues: string[];
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description?: string;
  path?: string;
  method?: string;
  source?: string;
  version?: string;
  score?: number;
}

export interface SearchResponse {
  total: number;
  version?: string;
  results: SearchResult[];
}

export interface SearchSuggestion {
  text: string;
  type?: string;
  source?: string;
  version?: string;
}

// ====================
// Docs Hybrid Search (lexical + vector)
// ====================

export interface DocsHybridItem {
  title: string;
  url: string;
  path: string;
  snippet?: string;
  score: number;
  source: 'hybrid' | 'lexical' | 'rag';
  components: { semantic: boolean; lexical: boolean };
  tags?: string[];
  domain?: string;
  type?: string;
  status?: string;
}

export interface DocsHybridResponse {
  total: number;
  results: DocsHybridItem[];
  alpha: number;
  collection?: string;
}

// ====================
// Docs Facets (domains/types/tags/statuses)
// ====================

export interface DocFacetItem {
  value: string;
  count: number;
}
export interface DocsFacets {
  domains: DocFacetItem[];
  types: DocFacetItem[];
  tags: DocFacetItem[];
  statuses: DocFacetItem[];
}

const STATIC_METRICS_PATHS = [
  '/docs/dashboard/metrics.json',
  '/dashboard/metrics.json',
  '/docs/metrics/index.json',
  '/metrics/index.json',
];

const joinUrl = (base: string, path: string) => {
  const sanitizedBase = base.replace(/\/+$/, '');
  const sanitizedPath = path.replace(/^\/+/, '');
  return `${sanitizedBase}/${sanitizedPath}`;
};

const buildStaticMetricsUrls = (): string[] => {
  const candidates = new Set<string>();
  const normalizedDocsUrl = (apiConfig.docsUrl || '').replace(/\/+$/, '');

  const maybeAddAbsolute = (base: string | null | undefined) => {
    if (!base) return;
    for (const path of ['/dashboard/metrics.json', '/metrics/index.json']) {
      candidates.add(joinUrl(base, path));
    }
  };

  if (typeof window !== 'undefined' && window.location?.origin) {
    const origin = window.location.origin.replace(/\/+$/, '');
    maybeAddAbsolute(`${origin}/docs`);
    maybeAddAbsolute(origin);
  }

  maybeAddAbsolute(normalizedDocsUrl);

  STATIC_METRICS_PATHS.forEach((path) => candidates.add(path));

  return Array.from(candidates);
};

class DocumentationService {
  private client: AxiosInstance;

  constructor() {
    // getApiUrl('documentation') returns '/api/docs' which is proxied to http://localhost:3402 (rag-service)
    // Routes like '/api/v1/docs/facets' will be combined with baseURL to form '/api/docs/api/v1/docs/facets'
    // The Vite proxy strips '/api/docs' and forwards to the backend at http://localhost:3402
    this.client = axios.create({
      baseURL: getApiUrl('documentation'), // '/api/docs'
      timeout: 30000, // Increased to 30s for slow searches
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add timestamp to prevent caching for non-GET requests
        if (config.method !== 'get') {
          config.params = {
            ...config.params,
            _t: Date.now(),
          };
        }
        return config;
      },
      (error) => {
        throw error;
      },
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        console.error('[Documentation API Error]', error.message);
        if (error.response) {
          console.error('Response data:', error.response.data);
          console.error('Response status:', error.response.status);
        }
        throw error;
      },
    );
  }

  // ====================
  // SYSTEMS API
  // ====================

  async getSystems(params?: {
    status?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: System[];
    count: number;
    total: number;
  }> {
    const response = await this.client.get('/api/v1/systems', { params });
    return response.data;
  }

  async getSystemById(id: string): Promise<{ success: boolean; data: System }> {
    const response = await this.client.get(`/api/v1/systems/${id}`);
    return response.data;
  }

  async createSystem(
    system: Omit<System, 'id' | 'created_at' | 'updated_at'>,
  ): Promise<{ success: boolean; data: System }> {
    const response = await this.client.post('/api/v1/systems', system);
    return response.data;
  }

  async updateSystem(
    id: string,
    updates: Partial<Omit<System, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<{ success: boolean; data: System }> {
    const response = await this.client.put(`/api/v1/systems/${id}`, updates);
    return response.data;
  }

  async deleteSystem(
    id: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/api/v1/systems/${id}`);
    return response.data;
  }

  // ====================
  // SEARCH API
  // ====================

  async search(
    query: string,
    params?: {
      type?: string;
      source?: string;
      limit?: number;
      version?: string;
    },
  ): Promise<SearchResponse> {
    const response = await this.client.get('/api/v1/search', {
      params: {
        q: query,
        type: params?.type,
        source: params?.source,
        limit: params?.limit ?? 20,
        version: params?.version,
      },
    });
    return response.data;
  }

  async getSuggestions(query: string, limit = 5): Promise<SearchSuggestion[]> {
    const response = await this.client.get('/api/v1/suggest', {
      params: { q: query, limit },
    });
    return response.data?.suggestions ?? [];
  }

  // ====================
  // DOCS (Markdown) HYBRID SEARCH
  // ====================

  async docsHybridSearch(
    query: string,
    opts?: {
      limit?: number;
      alpha?: number;
      domain?: string;
      type?: string;
      status?: string;
      tags?: string[];
      collection?: string;
    },
  ): Promise<DocsHybridResponse> {
    const params: Record<string, string | number> = { q: query };
    if (opts?.limit) params.limit = opts.limit;
    if (typeof opts?.alpha === 'number') params.alpha = opts.alpha;
    if (opts?.domain) params.domain = opts.domain;
    if (opts?.type) params.type = opts.type;
    if (opts?.status) params.status = opts.status;
    if (opts?.tags?.length) params.tags = opts.tags.join(',');
    if (opts?.collection) params.collection = opts.collection;

    const response = await this.client.get('/api/v1/docs/search-hybrid', {
      params,
    });
    return response.data as DocsHybridResponse;
  }

  async getDocsFacets(query = ''): Promise<DocsFacets> {
    const params: Record<string, string> = {};
    if (query) params.q = query;
    const response = await this.client.get('/api/v1/docs/facets', { params });
    return response.data?.facets as DocsFacets;
  }

  // ====================
  // DOCS (Markdown) LEXICAL SEARCH - fallback when hybrid fails
  // ====================

  async docsLexicalSearch(
    query: string,
    opts?: {
      limit?: number;
      domain?: string;
      type?: string;
      status?: string;
      tags?: string[];
    },
  ): Promise<{
    total: number;
    results: Array<{
      title: string;
      path: string;
      summary?: string;
      tags?: string[];
      domain?: string;
      type?: string;
      status?: string;
      score?: number;
    }>;
  }> {
    const params: Record<string, string | number> = { q: query };
    if (opts?.limit) params.limit = opts.limit;
    if (opts?.domain) params.domain = opts.domain;
    if (opts?.type) params.type = opts.type;
    if (opts?.status) params.status = opts.status;
    if (opts?.tags?.length) params.tags = opts.tags.join(',');

    const response = await this.client.get('/api/v1/docs/search', { params });
    return response.data as {
      total: number;
      results: Array<{
        title: string;
        path: string;
        summary?: string;
        tags?: string[];
        domain?: string;
        type?: string;
        status?: string;
        score?: number;
      }>;
    };
  }

  async getDocContent(docPath: string): Promise<string> {
    if (!docPath) {
      throw new Error('Caminho do documento não informado');
    }

    const stripPrefix = (value: string) => {
      const withoutLeading = value.replace(/^\/+/, '').replace(/^docs\//, '');
      try {
        return decodeURIComponent(withoutLeading);
      } catch {
        return withoutLeading;
      }
    };

    const base = stripPrefix(docPath);
    const segments = base.split('/').filter(Boolean);
    const baseCandidates = new Set<string>();
    if (base) baseCandidates.add(base);
    if (segments.length > 1) {
      baseCandidates.add(segments.slice(1).join('/'));
    }
    baseCandidates.add(`versioned_docs/${base}`);

    const pathCandidates = new Set<string>();
    baseCandidates.forEach((candidate) => {
      if (!candidate) {
        return;
      }
      if (candidate.endsWith('.md') || candidate.endsWith('.mdx')) {
        pathCandidates.add(candidate);
      } else {
        pathCandidates.add(`${candidate}.mdx`);
        pathCandidates.add(`${candidate}.md`);
      }
    });

    let lastError: unknown;
    for (const candidate of pathCandidates) {
      try {
        const response = await this.client.get('/api/v1/docs/content', {
          params: { path: candidate },
        });
        const content = (response.data as { content?: string })?.content;
        if (typeof content === 'string') {
          return content;
        }
        lastError = new Error('Documento retornado sem conteúdo');
      } catch (error) {
        lastError = error;
      }
    }

    if (lastError instanceof Error) {
      throw new Error(
        `Não foi possível carregar conteúdo para ${docPath}: ${lastError.message}`,
      );
    }

    throw new Error(`Não foi possível carregar conteúdo para ${docPath}`);
  }

  // ====================
  // IDEAS API
  // ====================

  async getIdeas(params?: {
    status?: string;
    priority?: string;
    category?: string;
    system_id?: string;
    assigned_to?: string;
    limit?: number;
  }): Promise<{
    success: boolean;
    data: Idea[];
    count: number;
    total: number;
  }> {
    const response = await this.client.get('/api/v1/ideas', { params });
    return response.data;
  }

  async getKanbanBoard(): Promise<{ success: boolean; data: KanbanBoard }> {
    const response = await this.client.get('/api/v1/ideas/kanban');
    return response.data;
  }

  async getIdeaById(id: string): Promise<{ success: boolean; data: Idea }> {
    const response = await this.client.get(`/api/v1/ideas/${id}`);
    return response.data;
  }

  async createIdea(
    idea: Omit<Idea, 'id' | 'created_at' | 'updated_at' | 'completed_at'>,
  ): Promise<{ success: boolean; data: Idea }> {
    const response = await this.client.post('/api/v1/ideas', idea);
    return response.data;
  }

  async updateIdea(
    id: string,
    updates: Partial<Omit<Idea, 'id' | 'created_at'>>,
  ): Promise<{ success: boolean; data: Idea }> {
    const response = await this.client.put(`/api/v1/ideas/${id}`, updates);
    return response.data;
  }

  async deleteIdea(id: string): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/api/v1/ideas/${id}`);
    return response.data;
  }

  // ====================
  // FILES API
  // ====================

  async uploadFiles(
    ideaId: string,
    files: File[],
    uploadedBy?: string,
  ): Promise<{ success: boolean; data: FileMetadata[] }> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });
    if (uploadedBy) {
      formData.append('uploaded_by', uploadedBy);
    }

    const response = await this.client.post(
      `/api/v1/ideas/${ideaId}/files`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    return response.data;
  }

  async getIdeaFiles(
    ideaId: string,
  ): Promise<{ success: boolean; data: FileMetadata[]; count: number }> {
    const response = await this.client.get(`/api/v1/ideas/${ideaId}/files`);
    return response.data;
  }

  async downloadFile(fileId: string): Promise<Blob> {
    const response = await this.client.get(`/api/v1/files/${fileId}`, {
      responseType: 'blob',
    });
    return response.data;
  }

  async getFileMetadata(
    fileId: string,
  ): Promise<{ success: boolean; data: FileMetadata }> {
    const response = await this.client.get(`/api/v1/files/${fileId}/metadata`);
    return response.data;
  }

  async getFileStats(): Promise<{
    success: boolean;
    data: {
      total: number;
      total_size_bytes: number;
      total_size_mb: number;
      by_type: Record<string, number>;
      by_idea: Record<string, number>;
    };
  }> {
    const response = await this.client.get('/api/v1/files/stats');
    return response.data;
  }

  async deleteFile(
    fileId: string,
  ): Promise<{ success: boolean; message: string }> {
    const response = await this.client.delete(`/api/v1/files/${fileId}`);
    return response.data;
  }

  // ====================
  // STATISTICS API
  // ====================

  async getStatistics(): Promise<{
    success: boolean;
    data: Statistics;
    cached?: boolean;
    generated_at?: string;
  }> {
    const response = await this.client.get('/api/v1/stats');
    return response.data;
  }

  async getActivityTimeline(
    days: number = 30,
  ): Promise<{ success: boolean; data: ActivityData[]; cached?: boolean }> {
    const response = await this.client.get('/api/v1/stats/activity', {
      params: { days },
    });
    return response.data;
  }

  async getSystemHealth(): Promise<{
    success: boolean;
    data: {
      systems: SystemHealth[];
      overall_health: string;
    };
  }> {
    const response = await this.client.get('/api/v1/stats/health');
    return response.data;
  }

  /**
   * GET /api/v1/docs/health/dashboard-metrics
   * Comprehensive documentation health metrics for dashboard visualisations.
   */
  async getDocumentationMetrics(): Promise<{
    success: boolean;
    data: DocumentationMetrics;
  }> {
    const response = await this.client.get(
      '/api/v1/docs/health/dashboard-metrics',
    );
    return response.data;
  }

  async getStaticDocumentationMetrics(): Promise<DocumentationMetrics> {
    const candidates = buildStaticMetricsUrls();
    let lastError: Error | null = null;

    try {
      for (const url of candidates) {
        try {
          const response = await fetch(url, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache',
              Accept: 'application/json',
            },
          });

          if (!response.ok) {
            lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
            continue;
          }

          const payload = (await response.json()) as
            | DocumentationMetrics
            | { data?: DocumentationMetrics };

          const data =
            (payload as { data?: DocumentationMetrics })?.data ??
            (payload as DocumentationMetrics);

          if (!data || typeof data !== 'object' || !('healthScore' in data)) {
            lastError = new Error('Invalid fallback metrics payload');
            continue;
          }

          return data as DocumentationMetrics;
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
        }
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }

    throw new Error(
      `Fallback metrics request failed${lastError ? `: ${lastError.message}` : ''}`,
    );
  }

  // ====================
  // HEALTH CHECK
  // ====================

  async healthCheck(): Promise<{
    status: string;
    timestamp?: string;
    version?: string;
    error?: string;
  }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      return { status: 'unhealthy', error: (error as Error).message };
    }
  }
}

export const documentationService = new DocumentationService();
export default documentationService;
