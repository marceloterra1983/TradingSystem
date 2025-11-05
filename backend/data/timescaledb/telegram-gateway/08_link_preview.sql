-- ==============================================================================
-- 08_link_preview.sql
-- ==============================================================================
-- Purpose: Document metadata.linkPreview structure for social media link previews
-- Author: TradingSystem Development Team
-- Date: 2025-11-04
-- ==============================================================================

-- The 'metadata' column (JSONB) in telegram_gateway.messages already exists
-- This migration just documents the linkPreview structure

-- ==============================================================================
-- METADATA STRUCTURE DOCUMENTATION
-- ==============================================================================

COMMENT ON COLUMN telegram_gateway.messages.metadata IS 
'JSONB field containing message metadata:
- sync: { syncedAt: timestamp, reason: string }
- photo: { channelId, messageId, photoId, accessHash, hasPhoto }
- replyTo: { messageId: number, text: string }
- linkPreview: {
    type: "twitter" | "youtube" | "instagram" | "generic",
    url: string,
    fetchedAt: timestamp,
    
    -- Twitter-specific fields:
    tweetId: string,
    text: string,
    author: {
      id: string,
      name: string,
      username: string,
      profileImage: string
    },
    createdAt: timestamp,
    metrics: {
      likes: number,
      retweets: number,
      replies: number
    },
    media: {
      type: "photo" | "video",
      url: string,
      thumbnail: string (video only)
    },
    
    -- YouTube-specific fields:
    videoId: string,
    title: string,
    author: {
      name: string,
      url: string
    },
    thumbnail: {
      url: string,
      width: number,
      height: number
    },
    embedHtml: string,
    
    -- Instagram-specific fields:
    postId: string,
    postType: "post" | "reel",
    title: string,
    author: {
      name: string,
      url: string
    },
    thumbnail: {
      url: string,
      width: number,
      height: number
    },
    basic: boolean (true if no API token configured),
    
    -- Generic link fields (Open Graph metadata):
    title: string,
    description: string,
    image: string,
    siteName: string,
    domain: string (extracted from URL)
  }
';

-- ==============================================================================
-- INDEXES FOR LINK PREVIEW QUERIES
-- ==============================================================================

-- Index for queries filtering by presence of link preview
CREATE INDEX IF NOT EXISTS idx_messages_has_link_preview 
ON telegram_gateway.messages ((metadata->'linkPreview')) 
WHERE metadata ? 'linkPreview';

-- Index for queries filtering by link preview type (Twitter, YouTube, etc.)
CREATE INDEX IF NOT EXISTS idx_messages_link_preview_type 
ON telegram_gateway.messages ((metadata->'linkPreview'->'type'))
WHERE metadata->'linkPreview' IS NOT NULL;

-- Index for queries filtering by Twitter tweets with media
CREATE INDEX IF NOT EXISTS idx_messages_twitter_with_media 
ON telegram_gateway.messages ((metadata->'linkPreview'->'media'))
WHERE metadata->'linkPreview'->>'type' = 'twitter' 
  AND metadata->'linkPreview'->'media' IS NOT NULL;

-- ==============================================================================
-- QUERY EXAMPLES
-- ==============================================================================

-- Query 1: Count messages with link previews by type
/*
SELECT 
  metadata->'linkPreview'->>'type' AS preview_type,
  COUNT(*) AS count
FROM telegram_gateway.messages
WHERE metadata ? 'linkPreview'
GROUP BY metadata->'linkPreview'->>'type'
ORDER BY count DESC;
*/

-- Query 2: Get all Twitter links from the last 7 days
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS twitter_url,
  metadata->'linkPreview'->'author'->>'username' AS twitter_author,
  metadata->'linkPreview'->'metrics'->>'likes' AS likes,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'twitter'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
*/

-- Query 3: Get Twitter links with high engagement (>1000 likes)
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS twitter_url,
  metadata->'linkPreview'->'author'->>'username' AS twitter_author,
  (metadata->'linkPreview'->'metrics'->>'likes')::INTEGER AS likes,
  (metadata->'linkPreview'->'metrics'->>'retweets')::INTEGER AS retweets,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'twitter'
  AND (metadata->'linkPreview'->'metrics'->>'likes')::INTEGER > 1000
ORDER BY (metadata->'linkPreview'->'metrics'->>'likes')::INTEGER DESC
LIMIT 50;
*/

-- Query 4: Get all messages with Twitter videos
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS twitter_url,
  metadata->'linkPreview'->'media'->>'url' AS video_url,
  metadata->'linkPreview'->'media'->>'thumbnail' AS video_thumbnail,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'twitter'
  AND metadata->'linkPreview'->'media'->>'type' = 'video'
ORDER BY created_at DESC;
*/

-- ==============================================================================
-- PERFORMANCE NOTES
-- ==============================================================================

-- 1. JSONB indexing: GIN indexes are ideal for JSONB queries
-- 2. Expression indexes: We index specific JSONB paths for faster queries
-- 3. Partial indexes: Indexes only include rows where linkPreview exists
-- 4. Cast performance: Casting JSONB to INTEGER/TEXT has minimal overhead

-- ==============================================================================
-- MAINTENANCE
-- ==============================================================================

-- Monitor index usage (run periodically)
/*
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan AS scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'telegram_gateway'
  AND tablename = 'messages'
  AND indexname LIKE 'idx_messages_link_%'
ORDER BY idx_scan DESC;
*/

-- Query 5: Get all YouTube videos from the last 7 days
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS youtube_url,
  metadata->'linkPreview'->>'title' AS video_title,
  metadata->'linkPreview'->'author'->>'name' AS channel_name,
  metadata->'linkPreview'->'thumbnail'->>'url' AS thumbnail_url,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'youtube'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
*/

-- Query 6: Count link previews by type
/*
SELECT 
  metadata->'linkPreview'->>'type' AS link_type,
  COUNT(*) AS count
FROM telegram_gateway.messages
WHERE metadata ? 'linkPreview'
GROUP BY metadata->'linkPreview'->>'type'
ORDER BY count DESC;
*/

-- Query 7: Get all Instagram posts and reels from the last 7 days
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS instagram_url,
  metadata->'linkPreview'->>'postType' AS post_type,
  metadata->'linkPreview'->>'title' AS post_title,
  metadata->'linkPreview'->'author'->>'name' AS author_name,
  metadata->'linkPreview'->'thumbnail'->>'url' AS thumbnail_url,
  metadata->'linkPreview'->>'basic' AS is_basic_preview,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'instagram'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
*/

-- Query 8: Get Instagram reels only
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS reel_url,
  metadata->'linkPreview'->>'postId' AS post_id,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'instagram'
  AND metadata->'linkPreview'->>'postType' = 'reel'
ORDER BY created_at DESC
LIMIT 20;
*/

-- Query 9: Get all generic link previews from the last 7 days
/*
SELECT 
  channel_id,
  message_id,
  text,
  metadata->'linkPreview'->>'url' AS link_url,
  metadata->'linkPreview'->>'title' AS link_title,
  metadata->'linkPreview'->>'domain' AS domain,
  metadata->'linkPreview'->>'siteName' AS site_name,
  metadata->'linkPreview'->>'image' AS image_url,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->>'type' = 'generic'
  AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
*/

-- Query 10: Get all link previews with images
/*
SELECT 
  channel_id,
  message_id,
  metadata->'linkPreview'->>'type' AS link_type,
  metadata->'linkPreview'->>'url' AS url,
  metadata->'linkPreview'->>'title' AS title,
  metadata->'linkPreview'->>'image' AS image_url,
  created_at
FROM telegram_gateway.messages
WHERE metadata->'linkPreview'->'image' IS NOT NULL
  AND metadata->'linkPreview'->>'image' != ''
ORDER BY created_at DESC
LIMIT 50;
*/

-- ==============================================================================
-- FUTURE EXTENSIONS
-- ==============================================================================

-- Future support for additional link types:
-- - TikTok: videoId, author, music, likes, views
-- - LinkedIn: postId, author, engagement

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================

