import { Pool, type PoolClient } from 'pg';
import { env } from '../config/environment.js';

export const pool = new Pool({
  connectionString: env.COURSE_CRAWLER_DATABASE_URL,
});

export async function withTransaction<T>(
  handler: (client: PoolClient) => Promise<T>,
  timeoutMs = 30000, // 30 seconds default timeout
): Promise<T> {
  console.log('[DB] 🔄 Starting transaction...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('[DB] ✅ Transaction BEGIN executed');

    // Add timeout to prevent hanging transactions
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Transaction timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    const result = await Promise.race([handler(client), timeoutPromise]);
    console.log('[DB] ✅ Transaction handler completed');

    await client.query('COMMIT');
    console.log('[DB] ✅ Transaction COMMIT executed');
    return result as T;
  } catch (error) {
    console.error('[DB] ❌ Transaction error, rolling back:', error);
    await client.query('ROLLBACK');
    console.log('[DB] ✅ Transaction ROLLBACK executed');
    throw error;
  } finally {
    client.release();
    console.log('[DB] ✅ Client released');
  }
}
