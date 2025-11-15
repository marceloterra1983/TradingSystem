import axios, { AxiosInstance } from 'axios';

/**
 * Course Crawler API Client
 *
 * Connects to course-crawler-api (port 3601) for:
 * - Course credentials management
 * - Run scheduling and execution
 * - Artifact retrieval (Markdown/JSON outputs)
 */

const resolveApiBaseUrl = (): string => {
  const explicit = import.meta.env.VITE_COURSE_CRAWLER_API_URL?.trim();
  if (explicit) {
    return explicit;
  }

  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/apps/course-crawler')) {
      return '/api/course-crawler';
    }
  }

  // Fallback to relative paths so nginx inside course-crawler-ui proxies to the API
  return '';
};

const API_BASE_URL = resolveApiBaseUrl();

class CourseCrawlerAPI {
  private client: AxiosInstance;
  private token: string | null = null;
  private loginPromise: Promise<string | null> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for JWT authentication
    this.client.interceptors.request.use(
      async (config) => {
        // Skip auth for /auth endpoints
        if (config.url?.startsWith('/auth')) {
          return config;
        }

        // Get token (auto-login if needed)
        const token = await this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retried, try to get new token
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          this.token = null; // Clear invalid token
          const newToken = await this.getToken();
          if (newToken) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          }
        }

        console.error('[API Error]', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get JWT token (auto-login with default credentials)
   */
  private async getToken(): Promise<string | null> {
    if (this.token) {
      return this.token;
    }

    if (!this.loginPromise) {
      this.loginPromise = this.performLogin().finally(() => {
        this.loginPromise = null;
      });
    }

    return this.loginPromise;
  }

  private async performLogin(): Promise<string | null> {
    try {
      const username =
        import.meta.env.VITE_COURSE_CRAWLER_ADMIN_USERNAME ||
        import.meta.env.VITE_COURSE_CRAWLER_ADMIN_USERNAME_DEFAULT ||
        'admin';
      const password =
        import.meta.env.VITE_COURSE_CRAWLER_ADMIN_PASSWORD ||
        import.meta.env.VITE_COURSE_CRAWLER_ADMIN_PASSWORD_DEFAULT ||
        'changeme';

      const response = await this.client.post('/auth/login', {
        username,
        password,
      });

      this.token = response.data.token;
      return this.token;
    } catch (error) {
      console.error('[Auth] Failed to auto-login:', error);
      return null;
    }
  }

  // ============================================================================
  // COURSES & CREDENTIALS
  // ============================================================================

  /**
   * List all courses with credentials
   */
  async getCourses() {
    const response = await this.client.get('/courses');
    return response.data;
  }

  /**
   * Get single course by ID
   */
  async getCourse(courseId: string) {
    const response = await this.client.get(`/courses/${courseId}`);
    return response.data;
  }

  /**
   * Create new course with credentials
   */
  async createCourse(data: {
    name: string;
    baseUrl: string;
    username: string;
    password: string;
    targetUrls?: string[];
  }) {
    const response = await this.client.post('/courses', data);
    return response.data;
  }

  /**
   * Update course credentials
   */
  async updateCourse(courseId: string, data: Partial<{
    name: string;
    baseUrl: string;
    username: string;
    password: string;
    targetUrls?: string[];
  }>) {
    const response = await this.client.put(`/courses/${courseId}`, data);
    return response.data;
  }

  /**
   * Delete course and credentials
   */
  async deleteCourse(courseId: string) {
    const response = await this.client.delete(`/courses/${courseId}`);
    return response.data;
  }

  /**
   * Get course password (decrypted)
   */
  async getCoursePassword(courseId: string) {
    const response = await this.client.get(`/courses/${courseId}/password`);
    return response.data.password;
  }

  // ============================================================================
  // RUNS & EXECUTIONS
  // ============================================================================

  /**
   * List all runs (ordered by creation date, limited to 200)
   */
  async getRuns() {
    const response = await this.client.get('/runs');
    return response.data;
  }

  /**
   * Get single run by ID
   */
  async getRun(runId: string) {
    const response = await this.client.get(`/runs/${runId}`);
    return response.data;
  }

  /**
   * Schedule new run for a course (enqueues immediately)
   */
  async scheduleRun(courseId: string) {
    const response = await this.client.post(`/courses/${courseId}/runs`);
    return response.data;
  }

  /**
   * Cancel a queued or running run
   */
  async cancelRun(runId: string) {
    const response = await this.client.delete(`/runs/${runId}`);
    return response.data;
  }

  // ============================================================================
  // ARTIFACTS & OUTPUTS
  // ============================================================================

  /**
   * List artifacts for a run (directory tree structure)
   */
  async getArtifacts(runId: string) {
    const response = await this.client.get(`/runs/${runId}/artifacts`);
    return response.data;
  }

  /**
   * Get raw artifact content by path
   */
  async getArtifactContent(runId: string, artifactPath: string) {
    const response = await this.client.get(`/runs/${runId}/artifacts/raw`, {
      params: { path: artifactPath }
    });
    return response.data;
  }

  // ============================================================================
  // HEALTH & STATUS
  // ============================================================================

  /**
   * Check API health
   */
  async getHealth() {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Get worker status (detailed health check)
   */
  async getWorkerStatus() {
    const response = await this.client.get('/health/worker');
    return response.data;
  }
}

// Singleton instance
export const api = new CourseCrawlerAPI();

// Types
export interface Course {
  id: string;
  name: string;
  baseUrl: string;
  username: string;
  password?: string; // Optional - only returned when explicitly requested (encrypted)
  hasPassword?: boolean; // Indicates if password exists
  targetUrls?: string[]; // Optional list of target URLs
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  courseId: string;
  status: 'queued' | 'running' | 'success' | 'failed' | 'cancelled';
  outputsDir: string | null;
  metrics: Record<string, unknown> | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  courseName?: string;
  courseBaseUrl?: string;
}

export interface Artifact {
  path: string;
  type: 'directory' | 'file';
}
