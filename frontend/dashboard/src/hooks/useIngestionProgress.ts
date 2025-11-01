/**
 * useIngestionProgress Hook
 * 
 * Connects to SSE endpoint for real-time ingestion progress updates
 * Manages connection lifecycle, events, and error handling
 * 
 * @module hooks/useIngestionProgress
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Progress Data
 */
export interface IngestionProgress {
  filesProcessed: number;
  filesTotal: number;
  chunksCreated: number;
  progress: number; // 0-100
  currentFile?: string;
}

/**
 * Log Entry
 */
export interface IngestionLogEntry {
  id?: number;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'success';
  message: string;
  files_processed?: number;
  chunks_created?: number;
  current_file?: string;
  progress?: number;
}

/**
 * Job Status
 */
export type IngestionJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

/**
 * Hook State
 */
export interface UseIngestionProgressReturn {
  // State
  progress: IngestionProgress;
  logs: IngestionLogEntry[];
  status: IngestionJobStatus | null;
  isConnected: boolean;
  isComplete: boolean;
  error: string | null;
  
  // Actions
  cancel: () => Promise<void>;
  reconnect: () => void;
  clearLogs: () => void;
}

/**
 * useIngestionProgress Hook
 */
export function useIngestionProgress(jobId: string | null): UseIngestionProgressReturn {
  const [progress, setProgress] = useState<IngestionProgress>({
    filesProcessed: 0,
    filesTotal: 0,
    chunksCreated: 0,
    progress: 0,
  });
  
  const [logs, setLogs] = useState<IngestionLogEntry[]>([]);
  const [status, setStatus] = useState<IngestionJobStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const maxReconnectAttempts = 5;

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (!jobId) return;

    // Clear existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = `/api/v1/rag/ingestion/stream/${jobId}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.onopen = () => {
      console.log('[SSE] Connected to ingestion stream', { jobId });
      setIsConnected(true);
      setError(null);
      reconnectAttemptsRef.current = 0;
    };

    // Connected event
    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('[SSE] Connection confirmed', data);
    });

    // History event (existing logs)
    eventSource.addEventListener('history', (event) => {
      const data = JSON.parse(event.data);
      setLogs(data.logs || []);
    });

    // Job status event
    eventSource.addEventListener('job-status', (event) => {
      const job = JSON.parse(event.data);
      setStatus(job.status);
      setProgress({
        filesProcessed: job.files_processed || 0,
        filesTotal: job.files_total || 0,
        chunksCreated: job.chunks_created || 0,
        progress: calculateProgress(job.files_processed || 0, job.files_total || 0),
      });
    });

    // Start event
    eventSource.addEventListener('start', (event) => {
      const data = JSON.parse(event.data);
      setStatus('PROCESSING');
      setProgress({
        filesProcessed: 0,
        filesTotal: data.filesTotal || 0,
        chunksCreated: 0,
        progress: 0,
      });
    });

    // Progress event
    eventSource.addEventListener('progress', (event) => {
      const data = JSON.parse(event.data);
      setProgress({
        filesProcessed: data.filesProcessed || 0,
        filesTotal: data.filesTotal || 0,
        chunksCreated: data.chunksCreated || 0,
        progress: data.progress || 0,
        currentFile: data.currentFile,
      });
    });

    // Log event
    eventSource.addEventListener('log', (event) => {
      const logEntry = JSON.parse(event.data);
      setLogs((prev) => [logEntry, ...prev].slice(0, 500)); // Keep last 500 logs
    });

    // Complete event
    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      setStatus('COMPLETED');
      setProgress({
        filesProcessed: data.filesProcessed || 0,
        filesTotal: data.filesTotal || 0,
        chunksCreated: data.chunksCreated || 0,
        progress: 100,
      });
      
      // Close connection after completion
      setTimeout(() => {
        eventSource.close();
        setIsConnected(false);
      }, 1000);
    });

    // Error event
    eventSource.addEventListener('error', (event: any) => {
      if (event.data) {
        try {
          const data = JSON.parse(event.data);
          setError(data.error || 'Unknown error');
          setStatus('FAILED');
        } catch {
          // Ignore parse errors
        }
      }
    });

    // Cancelled event
    eventSource.addEventListener('cancelled', (event) => {
      const data = JSON.parse(event.data);
      setStatus('CANCELLED');
      setError(data.reason || 'Job cancelled');
      
      setTimeout(() => {
        eventSource.close();
        setIsConnected(false);
      }, 1000);
    });

    // Connection error (network issues)
    eventSource.onerror = (event) => {
      console.error('[SSE] Connection error', { jobId, event });
      setIsConnected(false);

      // Auto-reconnect with exponential backoff
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;

        console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      } else {
        setError('Falha na conexão após múltiplas tentativas');
        eventSource.close();
      }
    };
  }, [jobId]);

  /**
   * Cancel ingestion job
   */
  const cancel = useCallback(async () => {
    if (!jobId) return;

    try {
      const response = await fetch(`/api/v1/rag/ingestion/cancel/${jobId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by user' }),
      });

      if (!response.ok) {
        throw new Error('Failed to cancel job');
      }

      setError('Job cancelado pelo usuário');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to cancel');
    }
  }, [jobId]);

  /**
   * Reconnect to stream
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect]);

  /**
   * Clear logs
   */
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Connect when jobId changes
  useEffect(() => {
    if (jobId) {
      connect();
    }

    // Cleanup on unmount or jobId change
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      setIsConnected(false);
      setError(null);
    };
  }, [jobId, connect]);

  const isComplete = status === 'COMPLETED' || status === 'FAILED' || status === 'CANCELLED';

  return {
    progress,
    logs,
    status,
    isConnected,
    isComplete,
    error,
    cancel,
    reconnect,
    clearLogs,
  };
}

/**
 * Calculate progress percentage
 */
function calculateProgress(processed: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(100, Math.round((processed / total) * 100));
}

