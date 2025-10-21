/**
 * Port Health Check Utility
 * Checks if a service is reachable on a given URL
 */

export type PortStatus = 'online' | 'offline' | 'checking';

export interface HealthCheckResult {
  status: PortStatus;
  responseTime?: number;
  lastChecked: string;
  error?: string;
}

/**
 * Check if a port/service is accessible
 * @param url - The URL to check (e.g., http://localhost:3000)
 * @param timeout - Timeout in milliseconds (default: 5000ms)
 * @returns Health check result
 */
export async function checkPortHealth(
  url: string,
  timeout: number = 5000
): Promise<HealthCheckResult> {
  const startTime = Date.now();
  const lastChecked = new Date().toISOString();

  try {
    // Create an AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Try to fetch with HEAD request first (lighter), fallback to GET
    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors', // Allow checking services without CORS
      cache: 'no-cache',
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    // In no-cors mode, we get opaque responses
    // If fetch succeeds without error, service is likely online
    return {
      status: 'online',
      responseTime,
      lastChecked,
    };
  } catch (error: unknown) {
    const responseTime = Date.now() - startTime;
    const typedError = error as { name?: string; message?: string };
    const errorName = typedError?.name;
    const errorMessage = typedError?.message;

    // If it's a timeout or network error, service is offline
    if (errorName === 'AbortError') {
      return {
        status: 'offline',
        responseTime,
        lastChecked,
        error: 'Timeout',
      };
    }

    // For no-cors mode, TypeError usually means network error
    if (errorName === 'TypeError') {
      return {
        status: 'offline',
        responseTime,
        lastChecked,
        error: 'Network error',
      };
    }

    // Other errors - still consider offline
    return {
      status: 'offline',
      responseTime,
      lastChecked,
      error: errorMessage || 'Unknown error',
    };
  }
}

/**
 * Check multiple ports in parallel
 * @param urls - Array of URLs to check
 * @returns Map of URL to health check result
 */
export async function checkMultiplePorts(
  urls: string[]
): Promise<Map<string, HealthCheckResult>> {
  const results = await Promise.all(
    urls.map(async (url) => {
      const result = await checkPortHealth(url);
      return [url, result] as [string, HealthCheckResult];
    })
  );

  return new Map(results);
}

/**
 * Alternative check for services that might not respond to HTTP
 * (like database ports on TCP)
 * This is a simplified check - just attempts connection
 */
export async function checkTcpPort(
  host: string,
  port: number
): Promise<HealthCheckResult> {
  const lastChecked = new Date().toISOString();
  const url = `http://${host}:${port}`;

  try {
    // For TCP services, we'll just try to connect
    // This is a best-effort check using fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      mode: 'no-cors',
    });

    clearTimeout(timeoutId);

    return {
      status: 'online',
      lastChecked,
    };
  } catch (error) {
    // For TCP services that don't speak HTTP, we might get errors
    // but the connection might still be open
    // In browser, we can't reliably check TCP ports
    return {
      status: 'offline',
      lastChecked,
      error: 'Cannot verify TCP port from browser',
    };
  }
}
