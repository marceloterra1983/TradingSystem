/**
 * Distributed Lock using PostgreSQL Advisory Locks
 *
 * Prevents concurrent execution of critical sections (e.g., channel synchronization)
 * using PostgreSQL's advisory lock mechanism.
 *
 * Advisory locks are fast, session-scoped, and automatically released on connection close.
 *
 * Usage:
 *   const lock = new DistributedLock(pool, logger);
 *   const acquired = await lock.tryAcquire('sync:channel:-1001234567');
 *   if (!acquired) {
 *     throw new Error('Sync already in progress');
 *   }
 *   try {
 *     // ... critical section ...
 *   } finally {
 *     await lock.release('sync:channel:-1001234567');
 *   }
 */
export class DistributedLock {
  constructor(pool, logger) {
    this.pool = pool;
    this.logger = logger;

    // Track locks held by this instance
    this.heldLocks = new Map(); // Map<lockId, key>
  }

  /**
   * Convert string key to PostgreSQL lock ID (64-bit integer)
   *
   * Uses FNV-1a hash algorithm for consistent hashing
   */
  hashKey(key) {
    const FNV_PRIME = 0x01000193;
    const FNV_OFFSET = 0x811c9dc5;

    let hash = FNV_OFFSET;

    for (let i = 0; i < key.length; i++) {
      hash ^= key.charCodeAt(i);
      hash = Math.imul(hash, FNV_PRIME);
    }

    // Convert to positive 32-bit integer
    return Math.abs(hash | 0);
  }

  /**
   * Try to acquire lock (non-blocking)
   *
   * Returns true if lock acquired, false if already held by another process
   *
   * @param {string} key - Lock key (e.g., 'sync:channel:-1001234567')
   * @returns {Promise<boolean>} - True if acquired, false if already locked
   */
  async tryAcquire(key) {
    const lockId = this.hashKey(key);

    this.logger?.debug?.({ key, lockId }, "[Lock] Attempting to acquire");

    try {
      const result = await this.pool.query(
        "SELECT pg_try_advisory_lock($1) as acquired",
        [lockId],
      );

      const acquired = result.rows[0].acquired;

      if (acquired) {
        this.heldLocks.set(lockId, key);
        this.logger?.info?.({ key, lockId }, "[Lock] Acquired");
      } else {
        this.logger?.warn?.(
          { key, lockId },
          "[Lock] Already held by another process",
        );
      }

      return acquired;
    } catch (error) {
      this.logger?.error?.(
        { err: error, key, lockId },
        "[Lock] Failed to acquire",
      );
      throw error;
    }
  }

  /**
   * Acquire lock with retry (blocking with timeout)
   *
   * Waits up to timeoutMs for lock to become available, retrying every 100ms
   *
   * @param {string} key - Lock key
   * @param {number} timeoutMs - Maximum wait time in milliseconds (default: 30 seconds)
   * @returns {Promise<boolean>} - True if acquired
   * @throws {Error} - If timeout exceeded
   */
  async acquire(key, timeoutMs = 30000) {
    const lockId = this.hashKey(key);
    const startTime = Date.now();

    this.logger?.info?.(
      { key, lockId, timeoutMs },
      "[Lock] Attempting to acquire with retry",
    );

    while (Date.now() - startTime < timeoutMs) {
      const acquired = await this.tryAcquire(key);

      if (acquired) {
        return true;
      }

      // Wait 100ms before retrying
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    const elapsed = Date.now() - startTime;
    throw new Error(
      `Failed to acquire lock for ${key} after ${elapsed}ms (timeout: ${timeoutMs}ms)`,
    );
  }

  /**
   * Release lock
   *
   * Safe to call even if lock is not held (no-op)
   *
   * @param {string} key - Lock key to release
   */
  async release(key) {
    const lockId = this.hashKey(key);

    if (!this.heldLocks.has(lockId)) {
      this.logger?.debug?.(
        { key, lockId },
        "[Lock] Lock not held, skipping release",
      );
      return;
    }

    try {
      const result = await this.pool.query(
        "SELECT pg_advisory_unlock($1) as released",
        [lockId],
      );

      const released = result.rows[0].released;

      if (released) {
        this.heldLocks.delete(lockId);
        this.logger?.info?.({ key, lockId }, "[Lock] Released");
      } else {
        this.logger?.warn?.(
          { key, lockId },
          "[Lock] Failed to release (not held)",
        );
      }
    } catch (error) {
      this.logger?.error?.(
        { err: error, key, lockId },
        "[Lock] Error releasing lock",
      );
      throw error;
    }
  }

  /**
   * Release all locks held by this instance
   *
   * Should be called on graceful shutdown
   */
  async releaseAll() {
    if (this.heldLocks.size === 0) {
      this.logger?.debug?.("[Lock] No locks to release");
      return;
    }

    this.logger?.info?.(
      { lockCount: this.heldLocks.size },
      "[Lock] Releasing all held locks",
    );

    const keys = Array.from(this.heldLocks.values());

    for (const key of keys) {
      try {
        await this.release(key);
      } catch (error) {
        this.logger?.error?.(
          { err: error, key },
          "[Lock] Failed to release lock during cleanup",
        );
      }
    }

    this.heldLocks.clear();
  }

  /**
   * Get list of currently held locks
   */
  getHeldLocks() {
    return Array.from(this.heldLocks.values());
  }

  /**
   * Check if a specific lock is held by this instance
   */
  isHeld(key) {
    const lockId = this.hashKey(key);
    return this.heldLocks.has(lockId);
  }
}
