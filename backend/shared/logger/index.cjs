/**
 * CommonJS wrapper for shared logger
 * Provides compatibility for services not yet migrated to ESM
 */

// Use dynamic import to load ESM module
let logger;

async function loadLogger() {
  if (!logger) {
    logger = await import('./index.js');
  }
  return logger;
}

// Export factory functions
module.exports = {
  createLogger: function(serviceName, options) {
    return loadLogger().then(m => m.createLogger(serviceName, options));
  },

  createRequestLogger: function(loggerInstance) {
    return loadLogger().then(m => m.createRequestLogger(loggerInstance));
  },

  createChildLogger: function(logger, bindings) {
    return loadLogger().then(m => m.createChildLogger(logger, bindings));
  },
};

// Note: For synchronous CommonJS usage, services should migrate to ESM
// This wrapper is temporary for backward compatibility during migration
