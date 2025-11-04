/**
 * usePolling - Reusable polling hook
 * 
 * Quick Win P2-5: Extract polling pattern used in 5 components
 * ROI: 4.3x (30min to implement, saves 2h in future maintenance)
 * 
 * @example
 * const { isPolling, togglePolling, stopPolling } = usePolling(fetchData, {
 *   interval: 10000,
 *   immediate: true,
 *   enabled: true
 * });
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface UsePollingOptions {
  /** Polling interval in milliseconds (default: 10000) */
  interval?: number;
  /** Whether to call the function immediately on mount (default: true) */
  immediate?: boolean;
  /** Whether polling is enabled (default: true) */
  enabled?: boolean;
  /** Callback when polling errors occur */
  onError?: (error: Error) => void;
}

export interface UsePollingReturn {
  /** Whether polling is currently active */
  isPolling: boolean;
  /** Toggle polling on/off */
  togglePolling: () => void;
  /** Start polling */
  startPolling: () => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Force a single poll execution */
  poll: () => Promise<void>;
}

/**
 * Hook for polling a function at regular intervals
 */
export function usePolling(
  fn: () => Promise<void> | void,
  options: UsePollingOptions = {}
): UsePollingReturn {
  const {
    interval = 10000,
    immediate = true,
    enabled = true,
    onError,
  } = options;

  const [isPolling, setIsPolling] = useState(enabled);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Wrapped poll function with error handling
  const poll = useCallback(async () => {
    if (!mountedRef.current) return;

    try {
      await fn();
    } catch (error) {
      if (mountedRef.current && onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      }
    }
  }, [fn, onError]);

  // Start polling
  const startPolling = useCallback(() => {
    setIsPolling(true);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  // Toggle polling
  const togglePolling = useCallback(() => {
    setIsPolling((prev) => !prev);
  }, []);

  // Setup polling interval
  useEffect(() => {
    mountedRef.current = true;

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start polling if enabled
    if (isPolling && enabled) {
      // Call immediately if requested
      if (immediate) {
        poll();
      }

      // Set up interval
      intervalRef.current = setInterval(poll, interval);
    }

    // Cleanup
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPolling, enabled, interval, immediate, poll]);

  return {
    isPolling,
    togglePolling,
    startPolling,
    stopPolling,
    poll,
  };
}

