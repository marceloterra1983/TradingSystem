/**
 * Redis Key Schema and Naming Conventions for Telegram Cache
 * 
 * Key Structure:
 * - telegram:msg:{channel_id}:{message_id}          - Message hash (1h TTL)
 * - telegram:dedup:{channel_id}:{message_id}        - Dedup flag (2h TTL)
 * - telegram:channel:{channel_id}:recent            - Sorted set (score: timestamp)
 * 
 * Data Types:
 * - Strings: Message data (JSON serialized)
 * - Sorted Sets: Time-ordered message IDs
 * - Simple strings: Deduplication flags
 */

// TTL Constants (seconds)
export const TTL = {
  HOT_CACHE: 3600,      // 1 hour - message data
  DEDUP_CACHE: 7200,    // 2 hours - deduplication
  API_CACHE: 30,        // 30 seconds - API response cache
};

// Key Prefixes
export const PREFIX = {
  MESSAGE: 'telegram:msg',
  DEDUP: 'telegram:dedup',
  CHANNEL_RECENT: 'telegram:channel',
  API_CACHE: 'telegram:api',
};

/**
 * Generate message key
 * Pattern: telegram:msg:{channel_id}:{message_id}
 * 
 * @param {string} channelId - Telegram channel ID
 * @param {string} messageId - Telegram message ID
 * @returns {string} Redis key
 */
export function messageKey(channelId, messageId) {
  return `${PREFIX.MESSAGE}:${channelId}:${messageId}`;
}

/**
 * Generate deduplication key
 * Pattern: telegram:dedup:{channel_id}:{message_id}
 * 
 * @param {string} channelId - Telegram channel ID
 * @param {string} messageId - Telegram message ID
 * @returns {string} Redis key
 */
export function dedupKey(channelId, messageId) {
  return `${PREFIX.DEDUP}:${channelId}:${messageId}`;
}

/**
 * Generate channel recent messages key
 * Pattern: telegram:channel:{channel_id}:recent
 * 
 * @param {string} channelId - Telegram channel ID
 * @returns {string} Redis key (sorted set)
 */
export function channelRecentKey(channelId) {
  return `${PREFIX.CHANNEL_RECENT}:${channelId}:recent`;
}

/**
 * Generate API cache key
 * Pattern: telegram:api:{endpoint}:{params_hash}
 * 
 * @param {string} endpoint - API endpoint name
 * @param {Object} params - Query parameters
 * @returns {string} Redis key
 */
export function apiCacheKey(endpoint, params = {}) {
  const paramsHash = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  
  return `${PREFIX.API_CACHE}:${endpoint}:${paramsHash}`;
}

/**
 * Validate channel ID format
 * 
 * @param {string} channelId - Channel ID to validate
 * @returns {boolean} True if valid
 */
export function isValidChannelId(channelId) {
  // Telegram channel IDs are negative numbers (e.g., -1001649127710)
  return /^-\d+$/.test(String(channelId));
}

/**
 * Validate message ID format
 * 
 * @param {string} messageId - Message ID to validate
 * @returns {boolean} True if valid
 */
export function isValidMessageId(messageId) {
  // Telegram message IDs are positive integers
  return /^\d+$/.test(String(messageId));
}

/**
 * Parse key to extract components
 * 
 * @param {string} key - Redis key
 * @returns {Object|null} Parsed components or null if invalid
 */
export function parseKey(key) {
  const parts = key.split(':');
  
  if (parts.length < 2 || parts[0] !== 'telegram') {
    return null;
  }
  
  const type = parts[1];
  
  switch (type) {
    case 'msg':
      if (parts.length === 4) {
        return {
          type: 'message',
          channelId: parts[2],
          messageId: parts[3]
        };
      }
      break;
    
    case 'dedup':
      if (parts.length === 4) {
        return {
          type: 'dedup',
          channelId: parts[2],
          messageId: parts[3]
        };
      }
      break;
    
    case 'channel':
      if (parts.length === 4 && parts[3] === 'recent') {
        return {
          type: 'channel_recent',
          channelId: parts[2]
        };
      }
      break;
  }
  
  return null;
}

