import { Pool, type PoolClient, type QueryConfig, type QueryResult } from "pg";
import { env } from "../config/environment.js";
import {
  createCircuitBreaker,
  createDbFallback,
  dbBreakerConfig,
} from "../lib/circuit-breaker.js";

const rawPool = new Pool({
  connectionString: env.COURSE_CRAWLER_DATABASE_URL,
  max: 20, // Increased from default 10
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Wrap query operations with circuit breaker
const protectedQuery = createCircuitBreaker(
  async (text: string | QueryConfig, params?: unknown[]) => {
    return rawPool.query(text, params);
  },
  dbBreakerConfig,
);

// Fallback for circuit breaker
protectedQuery.fallback(createDbFallback());

// Export wrapped pool with circuit breaker protection
export const pool = {
  async query<T>(
    text: string | QueryConfig,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    return protectedQuery.fire(text, params) as Promise<QueryResult<T>>;
  },
  async connect(): Promise<PoolClient> {
    return rawPool.connect();
  },
  async end(): Promise<void> {
    return rawPool.end();
  },
};

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
  timeoutMs = 30000, // 30 seconds default timeout
): Promise<T> {
  console.log("[DB] 🔄 Starting transaction...");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("[DB] ✅ Transaction BEGIN executed");

    // Add timeout to prevent hanging transactions
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const result = await Promise.race([handler(client), timeoutPromise]);
    console.log("[DB] ✅ Transaction handler completed");

    await client.query("COMMIT");
    console.log("[DB] ✅ Transaction COMMIT executed");
    return result as T;
  } catch (error) {
    console.error("[DB] ❌ Transaction error, rolling back:", error);
    await client.query("ROLLBACK");
    console.log("[DB] ✅ Transaction ROLLBACK executed");
    throw error;
  } finally {
    client.release();
    console.log("[DB] ✅ Client released");
  }
}
