/**
 * useContainerStatus Hook
 *
 * React hook for checking if a database tool container is running.
 * Uses simple HTTP health checks to verify container availability.
 */

import { useState, useEffect, useCallback, useRef } from "react";

export interface UseContainerStatusResult {
  isRunning: boolean;
  isLoading: boolean;
  hasChecked: boolean;
  error: string | null;
  checkStatus: () => Promise<void>;
}

/**
 * Check if a container is running by attempting to fetch its health endpoint
 */
async function checkContainerHealth(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    try {
      // Use no-cors mode to avoid cross-origin failures.
      // A resolved fetch means the service responded (even if opaque), so consider it running.
      await fetch(url, {
        method: "GET",
        mode: "no-cors",
        signal: controller.signal,
        cache: "no-cache",
      });
      return true;
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    // Network failures (connection refused), aborts, or other fetch errors mean the service isn't reachable yet.
    if (error instanceof DOMException && error.name === "AbortError") {
      return false;
    }
    if (error instanceof TypeError) {
      return false;
    }

    return false;
  }
}

/**
 * Hook to check if a database container is running
 */
export function useContainerStatus(
  containerName: "pgadmin" | "pgweb" | "adminer" | "questdb" | null,
  healthCheckUrl: string | null,
): UseContainerStatusResult {
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasChecked, setHasChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!containerName || !healthCheckUrl) {
      setIsRunning(false);
      setIsLoading(false);
      setError(null);
      setHasChecked(true);
      return;
    }

    setIsRunning(false);
    setIsLoading(true);
    setError(null);
    setHasChecked(false);
  }, [containerName, healthCheckUrl]);

  const checkStatus = useCallback(async () => {
    if (!containerName || !healthCheckUrl) {
      setIsRunning(false);
      setIsLoading(false);
      setHasChecked(true);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const running = await checkContainerHealth(healthCheckUrl);
      setIsRunning(running);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setIsRunning(false);
    } finally {
      setIsLoading(false);
      setHasChecked(true);
    }
  }, [containerName, healthCheckUrl]);

  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Initial check
    checkStatus();

    // Only set up polling if we have valid container info
    if (containerName && healthCheckUrl) {
      intervalRef.current = setInterval(checkStatus, 10000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [containerName, healthCheckUrl, checkStatus]);

  return {
    isRunning,
    isLoading,
    hasChecked,
    error,
    checkStatus,
  };
}
