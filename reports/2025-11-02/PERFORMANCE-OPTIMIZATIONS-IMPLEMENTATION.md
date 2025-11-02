# 🚀 Performance Optimizations - Implementation Guide

**Based on:** PERFORMANCE-AUDIT-REPORT-2025-11-02.md  
**Priority:** P0 + P1 Optimizations  
**Target:** 29x Performance Improvement

---

## 🎯 Performance Goals

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Sync Time (5 channels) | 35s | 1.2s | **29x faster** |
| Database Queries/Sync | 2500 | 50 | **50x fewer** |
| Bundle Size | 1.3MB | 650KB | **50% smaller** |
| API Response | 17ms | 17ms | Already excellent |

---

## 🔴 P0-1: Bulk Database Inserts (50x Faster!)

### Problem
```javascript
// CURRENT: One-by-one inserts
for (const msg of messages) {
  await db.query(`INSERT ...`, [...]);  // 500 individual queries!
}
// Time: 5 seconds for 500 messages
```

### Solution

**File:** `backend/api/telegram-gateway/src/db/messagesRepository.js`

```javascript
/**
 * Save messages in bulk (50x faster than one-by-one)
 * 
 * Uses PostgreSQL batch INSERT with transaction for atomicity
 * Handles up to 10,000 messages per call (chunked internally)
 */
export const saveMessages = async (messages, logger) => {
  if (!messages || messages.length === 0) return 0;
  
  const db = await getPool(logger);
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // PostgreSQL parameter limit: ~65,000
    // With 9 params per message: max batch = 7000 messages
    // Use conservative chunk size of 500
    const CHUNK_SIZE = 500;
    let totalSaved = 0;
    
    for (let i = 0; i < messages.length; i += CHUNK_SIZE) {
      const chunk = messages.slice(i, i + CHUNK_SIZE);
      
      // Build VALUES clause: ($1,$2,...), ($10,$11,...), ...
      const values = chunk.map((msg, idx) => {
        const base = idx * 9 + 1;
        return `($${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6}, $${base+7}, $${base+8})`;
      }).join(', ');
      
      // Flatten parameters: [msg1.field1, msg1.field2, ..., msg2.field1, msg2.field2, ...]
      const flatParams = chunk.flatMap(msg => [
        msg.channelId,
        msg.messageId,
        msg.text || '',
        msg.date,
        'mtproto',
        'channel_post',
        msg.mediaType || null,
        msg.status || 'received',
        JSON.stringify({
          fromId: msg.fromId,
          isForwarded: msg.isForwarded,
          replyTo: msg.replyTo,
          views: msg.views,
        })
      ]);
      
      // Bulk INSERT with ON CONFLICT
      const result = await client.query(`
        INSERT INTO messages (
          channel_id,
          message_id,
          text,
          telegram_date,
          source,
          message_type,
          media_type,
          status,
          metadata
        )
        VALUES ${values}
        ON CONFLICT (channel_id, message_id) DO NOTHING
        RETURNING id
      `, flatParams);
      
      totalSaved += result.rowCount;
      
      logger?.debug?.(
        { chunkSize: chunk.length, savedInChunk: result.rowCount, totalSaved },
        '[BulkInsert] Chunk processed'
      );
    }
    
    await client.query('COMMIT');
    
    logger?.info?.(
      { totalMessages: messages.length, savedCount: totalSaved },
      '[BulkInsert] Bulk insert complete'
    );
    
    return totalSaved;
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger?.error?.({ err: error, messageCount: messages.length }, '[BulkInsert] Failed, rolled back');
    throw error;
  } finally {
    client.release();
  }
};
```

**Performance:**
- **Before:** 5000ms (500 individual INSERTs)
- **After:** 100ms (1 batch INSERT)
- **Speedup:** **50x faster!**

---

## 🔴 P0-2: Fix N+1 Query (5x Faster!)

### Problem
```javascript
// CURRENT: One query per channel
for (const channelId of channelsToSync) {
  const result = await db.query(`
    SELECT MAX(message_id) FROM messages WHERE channel_id = $1
  `, [channelId]);
  // 5 channels = 5 queries
}
```

### Solution

**File:** `backend/api/telegram-gateway/src/routes/telegramGateway.js`

```javascript
// BEFORE the loop:
// Batch query for all channels at once
const lastMsgResults = await db.query(`
  SELECT 
    channel_id,
    MAX(CAST(message_id AS BIGINT)) as last_message_id
  FROM messages
  WHERE channel_id = ANY($1::text[])
  GROUP BY channel_id
`, [channelsToSync]);

// Create lookup map for O(1) access
const lastMessageMap = new Map(
  lastMsgResults.rows.map(row => [
    row.channel_id,
    Number(row.last_message_id) || 0
  ])
);

// IN the loop:
for (const channelId of channelsToSync) {
  // Get from map instead of querying database
  const lastMessageId = lastMessageMap.get(channelId) || 0;
  
  req.log.info({ channelId, limit, lastMessageId }, '[SyncMessages] Fetching messages from channel');
  
  // ... rest of logic
}
```

**Performance:**
- **Before:** 50ms (5 queries × 10ms)
- **After:** 10ms (1 query)
- **Speedup:** **5x faster!**

---

## 🟡 P1-1: Scrypt Caching (96x Faster!)

### Problem
```javascript
// CURRENT: Scrypt runs on every instantiation
constructor(encryptionKey) {
  this.encryptionKey = crypto.scryptSync(encryptionKey, 'salt', 32);
  // Takes 96ms EVERY TIME!
}
```

### Solution

**File:** `backend/api/telegram-gateway/src/services/SecureSessionStorage.js`

```javascript
// Module-level cache (shared across all instances)
let cachedEncryptionKey = null;
let cachedKeySource = null;

export class SecureSessionStorage {
  constructor(encryptionKey = process.env.TELEGRAM_SESSION_ENCRYPTION_KEY) {
    if (!encryptionKey) {
      throw new Error(
        'TELEGRAM_SESSION_ENCRYPTION_KEY is required. Generate one with: openssl rand -hex 32'
      );
    }
    
    if (encryptionKey.length < 32) {
      throw new Error('TELEGRAM_SESSION_ENCRYPTION_KEY must be at least 32 characters');
    }
    
    this.algorithm = 'aes-256-gcm';
    
    // Check cache first (only derive key once!)
    if (cachedKeySource === encryptionKey && cachedEncryptionKey) {
      this.encryptionKey = cachedEncryptionKey;  // ✅ Use cached (< 1ms)
    } else {
      // Derive key (slow, but only once!)
      this.encryptionKey = crypto.scryptSync(encryptionKey, 'telegram-gateway-salt', 32);
      
      // Cache for future instances
      cachedEncryptionKey = this.encryptionKey;
      cachedKeySource = encryptionKey;
    }
    
    // ... rest of constructor
  }
  
  // ... rest of class
}
```

**Performance:**
- **First instantiation:** 96ms (same as before)
- **Subsequent instantiations:** <1ms
- **Speedup:** **96x faster** after first call!

---

## 🟡 P1-2: Parallel Channel Sync (3x Faster!)

### Problem
```javascript
// CURRENT: Sequential processing
for (const channelId of channelsToSync) {
  await syncChannel(channelId);  // Wait for each!
}
// 5 channels × 2s = 10s total
```

### Solution

**Install dependency:**
```bash
cd backend/api/telegram-gateway
npm install p-limit
```

**File:** `backend/api/telegram-gateway/src/routes/telegramGateway.js`

```javascript
import pLimit from 'p-limit';

telegramGatewayRouter.post('/sync-messages', requireApiKey, async (req, res, next) => {
  // ... auth logic ...
  
  const { limit = 500, channels, concurrency = 3 } = req.body;
  
  // ... get channelsToSync ...
  
  const { getDatabasePool } = await import('../db/messagesRepository.js');
  const db = await getDatabasePool(req.log);
  
  const { DistributedLock } = await import('../db/distributedLock.js');
  const lockManager = new DistributedLock(db, req.log);
  
  // Create concurrency limiter (max 3 simultaneous channel syncs)
  const concurrencyLimiter = pLimit(concurrency);
  
  // Get last message IDs for ALL channels in one query (fix N+1)
  const lastMsgResults = await db.query(`
    SELECT channel_id, MAX(CAST(message_id AS BIGINT)) as last_message_id
    FROM messages
    WHERE channel_id = ANY($1::text[])
    GROUP BY channel_id
  `, [channelsToSync]);
  
  const lastMessageMap = new Map(
    lastMsgResults.rows.map(r => [r.channel_id, Number(r.last_message_id) || 0])
  );
  
  // Sync channels in parallel (with concurrency limit)
  const syncPromises = channelsToSync.map(channelId =>
    concurrencyLimiter(async () => {
      // Try to acquire distributed lock
      const lockKey = `sync:channel:${channelId}`;
      const lockAcquired = await lockManager.tryAcquire(lockKey);
      
      if (!lockAcquired) {
        req.log.warn({ channelId }, '[SyncMessages] Sync already in progress, skipping');
        return {
          channelId,
          messagesSynced: 0,
          messagesSaved: 0,
          skipped: true,
          reason: 'Sync already in progress'
        };
      }
      
      try {
        const lastMessageId = lastMessageMap.get(channelId) || 0;
        
        req.log.info({ channelId, limit, lastMessageId }, '[SyncMessages] Fetching messages');
        
        // Fetch messages from Telegram
        const messages = await telegramClient.getMessages(channelId, { 
          limit,
          minId: lastMessageId > 0 ? lastMessageId : undefined
        });
        
        req.log.info({ channelId, messageCount: messages.length }, '[SyncMessages] Messages fetched');
        
        // Transform and save
        const { saveMessages } = await import('../db/messagesRepository.js');
        
        const messagesToSave = messages.map(msg => {
          // Normalize channelId
          let normalizedChannelId = msg.channelId || channelId;
          if (normalizedChannelId && !normalizedChannelId.startsWith('-')) {
            normalizedChannelId = channelId;
          }
          
          return {
            channelId: normalizedChannelId,
            messageId: msg.id.toString(),
            text: msg.text,
            date: new Date(msg.date * 1000),
            fromId: msg.fromId,
            mediaType: msg.mediaType,
            isForwarded: msg.isForwarded,
            replyTo: msg.replyTo,
            views: msg.views,
            status: 'received',
          };
        });
        
        const savedCount = await saveMessages(messagesToSave, req.log);
        
        req.log.info(
          { channelId, savedCount, fetchedCount: messages.length },
          '[SyncMessages] Messages saved'
        );
        
        return {
          channelId,
          messagesSynced: messages.length,
          messagesSaved: savedCount,
          latestMessageId: messages[0]?.id || null,
        };
        
      } catch (channelError) {
        req.log.error({ channelId, err: channelError }, '[SyncMessages] Failed to sync channel');
        return {
          channelId,
          messagesSynced: 0,
          error: channelError.message,
        };
      } finally {
        // ALWAYS release lock
        await lockManager.release(lockKey);
      }
    })
  );
  
  // Wait for all channel syncs to complete (in parallel!)
  const channelsSynced = await Promise.all(syncPromises);
  
  const totalMessagesSynced = channelsSynced.reduce((sum, c) => sum + (c.messagesSynced || 0), 0);
  const totalMessagesSaved = channelsSynced.reduce((sum, c) => sum + (c.messagesSaved || 0), 0);
  
  // ... response logic
});
```

**Performance:**
- **Before:** 10s (5 channels sequential × 2s each)
- **After:** 3.3s (5 channels ÷ 3 concurrency × 2s)
- **Speedup:** **3x faster!**

---

## 📊 Expected Performance After All Optimizations

### Sync Performance Timeline

**Before (Current):**
```
1. Get last message IDs:  5 queries × 10ms = 50ms
2. Fetch from Telegram:   5 channels × 2s = 10s (sequential)
3. Save to database:      2500 msgs × 10ms = 25s (individual inserts)
4. Lock operations:       5 × 10ms = 50ms
───────────────────────────────────────────────────────
TOTAL: ~35 seconds
```

**After (Optimized):**
```
1. Get last message IDs:  1 query = 10ms                (5x faster)
2. Fetch from Telegram:   10s ÷ 3 = 3.3s (parallel ×3)  (3x faster)
3. Save to database:      2500 msgs ÷ 50 = 500ms (bulk) (50x faster!)
4. Lock operations:       5 × 10ms = 50ms               (same)
───────────────────────────────────────────────────────
TOTAL: ~3.9 seconds  (9x faster!)
```

### Performance Comparison

| Operation | Before | After | Speedup |
|-----------|--------|-------|---------|
| DB Queries | 2505 | 51 | **49x fewer** |
| Sync Time | 35s | 3.9s | **9x faster** |
| Throughput | 71 msgs/s | 641 msgs/s | **9x higher** |

---

## 🔧 Installation & Deployment

### Step 1: Install Dependencies

```bash
cd /home/marce/Projetos/TradingSystem/backend/api/telegram-gateway
npm install p-limit
```

### Step 2: Apply Code Changes

1. Update `messagesRepository.js` (bulk insert)
2. Update `telegramGateway.js` (parallel sync + batch query)
3. Update `SecureSessionStorage.js` (scrypt caching)

### Step 3: Test Performance

```bash
# Benchmark BEFORE
time curl -X POST \
  -H "X-API-Key: f7b22c498bd7527a7d114481015326736f0a94a58ec7c4e6e7157d6d2b36bd85" \
  http://localhost:4010/api/telegram-gateway/sync-messages

# Apply changes and restart

# Benchmark AFTER
time curl -X POST \
  -H "X-API-Key: f7b22c498bd7527a7d114481015326736f0a94a58ec7c4e6e7157d6d2b36bd85" \
  http://localhost:4010/api/telegram-gateway/sync-messages

# Expected: 35s → 4s (9x improvement!)
```

### Step 4: Monitor Metrics

```bash
# Check Prometheus metrics
curl http://localhost:4010/metrics | grep telegram_gateway_sync_duration

# Check database query performance
docker exec -i data-timescale psql -U timescale -d tradingsystem -c \
  "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY total_time DESC LIMIT 10;"
```

---

## 📈 Expected ROI

| Investment | Return | ROI |
|------------|--------|-----|
| 7 hours implementation | 9x faster sync | **1286%** |
| $0 infrastructure cost | 50x fewer queries | **Infinite** |
| 1 sprint effort | Better user experience | **Priceless** |

**Conclusion:** **Excellent ROI** - 7 hours for 9x performance improvement!

---

## ✅ Implementation Checklist

### Pre-Implementation
- [ ] Review performance audit report
- [ ] Understand current bottlenecks
- [ ] Create performance baseline (benchmark current sync time)
- [ ] Set up monitoring (Prometheus/Grafana)

### Implementation
- [ ] Install `p-limit` dependency
- [ ] Update `messagesRepository.js` (bulk insert)
- [ ] Update `telegramGateway.js` (N+1 fix + parallel sync)
- [ ] Update `SecureSessionStorage.js` (scrypt caching)
- [ ] Write unit tests for new logic
- [ ] Update integration tests

### Validation
- [ ] Benchmark sync time (should be ~4s)
- [ ] Check database query count (should be ~50)
- [ ] Monitor memory usage (should be same or lower)
- [ ] Test with 10+ channels (scalability)
- [ ] Verify distributed locks still work
- [ ] Check Prometheus metrics

### Deployment
- [ ] Deploy to staging
- [ ] Run load tests (100 concurrent requests)
- [ ] Monitor for 24 hours
- [ ] Review performance dashboards
- [ ] Get approval for production
- [ ] Deploy to production
- [ ] Monitor for 48 hours

---

**Implementation Owner:** Backend Team  
**Estimated Effort:** 7 hours (P0 only) or 23 hours (P0 + P1)  
**Expected Performance:** 9x faster sync, 50x fewer database queries

**Status:** Ready for implementation  
**Priority:** P0 (High impact, low effort - **do it now!**)

