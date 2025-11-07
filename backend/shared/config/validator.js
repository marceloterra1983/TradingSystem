/**
 * Environment Variables Validator
 *
 * Validates required environment variables on service startup.
 * Fails fast with clear error messages if critical variables are missing.
 *
 * Usage:
 *   import { validateEnv } from '@backend/shared/config/validator';
 *
 *   validateEnv({
 *     required: ['DATABASE_URL', 'PORT'],
 *     optional: ['LOG_LEVEL'],
 *     logger,
 *   });
 */

/**
 * Validation error class
 */
export class EnvValidationError extends Error {
  constructor(message, missingVars = []) {
    super(message);
    this.name = 'EnvValidationError';
    this.missingVars = missingVars;
  }
}

/**
 * Validate environment variables
 *
 * @param {object} options - Validation options
 * @param {string[]} options.required - Required environment variables
 * @param {string[]} options.optional - Optional variables (documented but not enforced)
 * @param {object} options.logger - Logger instance
 * @param {boolean} options.strict - Throw error on missing required vars (default: true)
 * @throws {EnvValidationError} If required variables are missing and strict mode is enabled
 * @returns {object} Validation result { valid, missing, warnings }
 */
export function validateEnv(options = {}) {
  const {
    required = [],
    optional = [],
    logger,
    strict = true,
  } = options;

  const missing = [];
  const warnings = [];

  // Check required variables
  required.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === '') {
      missing.push(key);
    }
  });

  // Check optional variables (warn if missing)
  optional.forEach(key => {
    if (!process.env[key] || process.env[key].trim() === '') {
      warnings.push(`Optional env var not set: ${key}`);
    }
  });

  // Log results
  if (logger) {
    if (missing.length > 0) {
      logger.error({ missing }, 'Missing required environment variables');
    }

    if (warnings.length > 0) {
      logger.warn({ warnings }, 'Optional environment variables not set');
    }

    if (missing.length === 0 && warnings.length === 0) {
      logger.info('Environment validation passed');
    }
  }

  // Throw error if strict mode and missing required vars
  if (strict && missing.length > 0) {
    const errorMsg = `Missing required environment variables: ${missing.join(', ')}`;
    throw new EnvValidationError(errorMsg, missing);
  }

  return {
    valid: missing.length === 0,
    missing,
    warnings,
  };
}

/**
 * Validate and parse port number
 *
 * @param {string} envKey - Environment variable name (e.g., 'PORT')
 * @param {number} defaultPort - Default port if not set
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum port number (default: 1)
 * @param {number} options.max - Maximum port number (default: 65535)
 * @param {object} options.logger - Logger instance
 * @throws {EnvValidationError} If port is invalid
 * @returns {number} Validated port number
 */
export function validatePort(envKey, defaultPort, options = {}) {
  const {
    min = 1,
    max = 65535,
    logger,
  } = options;

  const value = process.env[envKey];

  if (!value || value.trim() === '') {
    logger?.debug({ envKey, defaultPort }, 'Using default port');
    return defaultPort;
  }

  const port = Number(value);

  if (isNaN(port) || !Number.isInteger(port) || port < min || port > max) {
    const errorMsg = `Invalid port for ${envKey}: ${value} (must be integer between ${min} and ${max})`;
    throw new EnvValidationError(errorMsg);
  }

  logger?.debug({ envKey, port }, 'Port validated');
  return port;
}

/**
 * Validate and parse boolean
 *
 * @param {string} envKey - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @param {object} options - Validation options
 * @param {object} options.logger - Logger instance
 * @returns {boolean} Parsed boolean value
 */
export function validateBoolean(envKey, defaultValue = false, options = {}) {
  const { logger } = options;
  const value = process.env[envKey];

  if (!value || value.trim() === '') {
    logger?.debug({ envKey, defaultValue }, 'Using default boolean value');
    return defaultValue;
  }

  const normalized = value.toLowerCase().trim();

  if (['true', '1', 'yes'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no'].includes(normalized)) {
    return false;
  }

  logger?.warn({ envKey, value }, 'Invalid boolean value, using default');
  return defaultValue;
}

/**
 * Validate and parse integer
 *
 * @param {string} envKey - Environment variable name
 * @param {number} defaultValue - Default value if not set
 * @param {object} options - Validation options
 * @param {number} options.min - Minimum value
 * @param {number} options.max - Maximum value
 * @param {object} options.logger - Logger instance
 * @throws {EnvValidationError} If value is invalid
 * @returns {number} Parsed integer value
 */
export function validateInteger(envKey, defaultValue, options = {}) {
  const { min, max, logger } = options;
  const value = process.env[envKey];

  if (!value || value.trim() === '') {
    logger?.debug({ envKey, defaultValue }, 'Using default integer value');
    return defaultValue;
  }

  const parsed = Number(value);

  if (isNaN(parsed) || !Number.isInteger(parsed)) {
    throw new EnvValidationError(`Invalid integer for ${envKey}: ${value}`);
  }

  if (min !== undefined && parsed < min) {
    throw new EnvValidationError(`${envKey} must be >= ${min}, got ${parsed}`);
  }

  if (max !== undefined && parsed > max) {
    throw new EnvValidationError(`${envKey} must be <= ${max}, got ${parsed}`);
  }

  logger?.debug({ envKey, value: parsed }, 'Integer validated');
  return parsed;
}

/**
 * Validate enum value
 *
 * @param {string} envKey - Environment variable name
 * @param {string[]} allowedValues - Array of allowed values
 * @param {string} defaultValue - Default value if not set
 * @param {object} options - Validation options
 * @param {object} options.logger - Logger instance
 * @param {boolean} options.caseSensitive - Case-sensitive comparison (default: false)
 * @throws {EnvValidationError} If value is invalid
 * @returns {string} Validated enum value
 */
export function validateEnum(envKey, allowedValues, defaultValue, options = {}) {
  const { logger, caseSensitive = false } = options;
  const value = process.env[envKey];

  if (!value || value.trim() === '') {
    logger?.debug({ envKey, defaultValue }, 'Using default enum value');
    return defaultValue;
  }

  const compareValue = caseSensitive ? value : value.toLowerCase();
  const compareAllowed = caseSensitive ? allowedValues : allowedValues.map(v => v.toLowerCase());

  if (!compareAllowed.includes(compareValue)) {
    throw new EnvValidationError(
      `Invalid value for ${envKey}: ${value} (allowed: ${allowedValues.join(', ')})`
    );
  }

  logger?.debug({ envKey, value }, 'Enum value validated');
  return caseSensitive ? value : value.toLowerCase();
}

/**
 * Validate URL
 *
 * @param {string} envKey - Environment variable name
 * @param {string} defaultValue - Default URL if not set
 * @param {object} options - Validation options
 * @param {string[]} options.allowedProtocols - Allowed protocols (default: ['http:', 'https:'])
 * @param {object} options.logger - Logger instance
 * @throws {EnvValidationError} If URL is invalid
 * @returns {string} Validated URL
 */
export function validateUrl(envKey, defaultValue, options = {}) {
  const { allowedProtocols = ['http:', 'https:'], logger } = options;
  const value = process.env[envKey];

  if (!value || value.trim() === '') {
    logger?.debug({ envKey, defaultValue }, 'Using default URL');
    return defaultValue;
  }

  try {
    const url = new URL(value);

    if (!allowedProtocols.includes(url.protocol)) {
      throw new EnvValidationError(
        `Invalid protocol for ${envKey}: ${url.protocol} (allowed: ${allowedProtocols.join(', ')})`
      );
    }

    logger?.debug({ envKey, url: value }, 'URL validated');
    return value;
  } catch (error) {
    throw new EnvValidationError(`Invalid URL for ${envKey}: ${value} - ${error.message}`);
  }
}

/**
 * Validate database connection string
 *
 * @param {string} envKey - Environment variable name
 * @param {object} options - Validation options
 * @param {object} options.logger - Logger instance
 * @param {boolean} options.required - Whether database URL is required (default: true)
 * @throws {EnvValidationError} If connection string is invalid
 * @returns {string|null} Validated connection string or null if not required and not provided
 */
export function validateDatabaseUrl(envKey, options = {}) {
  const { logger, required = true } = options;
  const value = process.env[envKey];

  if (!value || value.trim() === '') {
    if (required) {
      throw new EnvValidationError(`Missing required database URL: ${envKey}`);
    }
    return null;
  }

  // Basic validation: starts with postgres:// or postgresql://
  if (!value.startsWith('postgres://') && !value.startsWith('postgresql://')) {
    throw new EnvValidationError(
      `Invalid database URL for ${envKey}: must start with postgres:// or postgresql://`
    );
  }

  // Warn if password is in plain text
  if (value.includes('@') && !value.includes('***')) {
    logger?.warn({ envKey }, 'Database URL contains plain text password');
  }

  logger?.debug({ envKey }, 'Database URL validated');
  return value;
}

/**
 * Predefined validation schemas for common services
 */
export const commonSchemas = {
  /**
   * Workspace API schema
   */
  workspaceApi: {
    required: [
      'PORT',
      'LOG_LEVEL',
      'DB_STRATEGY',
    ],
    optional: [
      'CORS_ORIGIN',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX',
      'TIMESCALEDB_HOST',
      'TIMESCALEDB_PORT',
      'TIMESCALEDB_USER',
      'TIMESCALEDB_PASSWORD',
      'TIMESCALEDB_DATABASE',
    ],
  },

  /**
   * TP Capital API schema
   */
  tpCapitalApi: {
    required: [
      'PORT',
      'LOG_LEVEL',
      'TIMESCALE_POSTGRES_HOST',
      'TIMESCALE_POSTGRES_PORT',
      'TIMESCALE_POSTGRES_USER',
      'TIMESCALE_POSTGRES_PASSWORD',
      'TIMESCALE_POSTGRES_DATABASE',
      'TELEGRAM_GATEWAY_URL',
      'TELEGRAM_SIGNALS_CHANNEL_ID',
    ],
    optional: [
      'CORS_ORIGIN',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX',
      'TELEGRAM_GATEWAY_PORT',
    ],
  },

  /**
   * Documentation API schema
   */
  documentationApi: {
    required: [
      'PORT',
      'LOG_LEVEL',
      'DATABASE_URL',
    ],
    optional: [
      'CORS_ORIGIN',
      'RATE_LIMIT_WINDOW_MS',
      'RATE_LIMIT_MAX',
      'OPENAI_API_KEY',
    ],
  },

};

/**
 * Validate service configuration using predefined schema
 *
 * @param {string} schemaName - Name of predefined schema (e.g., 'workspaceApi')
 * @param {object} options - Validation options
 * @param {object} options.logger - Logger instance
 * @param {boolean} options.strict - Throw error on missing vars (default: true)
 * @returns {object} Validation result
 */
export function validateServiceConfig(schemaName, options = {}) {
  const schema = commonSchemas[schemaName];

  if (!schema) {
    throw new Error(`Unknown schema: ${schemaName}`);
  }

  return validateEnv({
    required: schema.required,
    optional: schema.optional,
    ...options,
  });
}

// CommonJS compatibility
export default {
  validateEnv,
  validatePort,
  validateBoolean,
  validateInteger,
  validateEnum,
  validateUrl,
  validateDatabaseUrl,
  validateServiceConfig,
  commonSchemas,
  EnvValidationError,
};
