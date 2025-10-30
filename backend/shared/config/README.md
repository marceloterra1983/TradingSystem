# TradingSystem Shared Configuration

Centralized environment loading and validation for all TradingSystem services.

## Features

- ✅ **Centralized .env Loading**: Loads from project root (single source of truth)
- ✅ **Environment Validation**: Validates required variables on startup
- ✅ **Type Coercion**: Safely parse ports, booleans, integers, enums
- ✅ **URL Validation**: Validate database URLs and HTTP endpoints
- ✅ **Predefined Schemas**: Common validation schemas for all services
- ✅ **Fail Fast**: Clear error messages for missing/invalid configuration

## Installation

```bash
cd backend/shared/config
npm install dotenv
```

## Usage

### Load Environment

```javascript
// At the top of your entry point (server.js, index.js)
import '@backend/shared/config/load-env.js';
// Now process.env is populated from root .env

// Or CommonJS
require('@backend/shared/config/load-env.cjs');
```

**Loaded Files (in order)**:
1. `config/container-images.env` (container image tags)
2. `config/.env.defaults` (default values)
3. `.env` (project root)
4. `.env.local` (local overrides - gitignored)
5. Service-specific `.env` (deprecated, but supported for migration)

### Validate Environment

```javascript
import { validateEnv } from '@backend/shared/config/validator';
import { createLogger } from '@backend/shared/logger';

const logger = createLogger('my-service');

// Validate required variables
validateEnv({
  required: ['PORT', 'DATABASE_URL', 'LOG_LEVEL'],
  optional: ['CORS_ORIGIN'],
  logger,
});

// Service starts only if all required vars are present
```

### Use Predefined Schemas

```javascript
import { validateServiceConfig } from '@backend/shared/config/validator';

// Validate using predefined schema
validateServiceConfig('workspaceApi', { logger });

// Available schemas:
// - workspaceApi
// - tpCapitalApi
// - documentationApi
// - serviceLauncherApi
```

### Type-Safe Parsing

```javascript
import {
  validatePort,
  validateBoolean,
  validateInteger,
  validateEnum,
  validateUrl,
} from '@backend/shared/config/validator';

// Port validation
const port = validatePort('PORT', 3000, { logger });
// Returns: 3000 if PORT is not set or invalid

// Boolean validation
const corsDisabled = validateBoolean('DISABLE_CORS', false, { logger });
// Accepts: 'true', '1', 'yes', 'false', '0', 'no'

// Integer with range validation
const poolSize = validateInteger('DB_POOL_SIZE', 10, {
  min: 1,
  max: 100,
  logger,
});

// Enum validation
const logLevel = validateEnum('LOG_LEVEL', ['trace', 'debug', 'info', 'warn', 'error'], 'info', {
  logger,
  caseSensitive: false,
});

// URL validation
const databaseUrl = validateUrl('DATABASE_URL', 'postgres://localhost:5432/db', {
  allowedProtocols: ['postgres:', 'postgresql:'],
  logger,
});
```

## Environment File Structure

### Root .env (Single Source of Truth)

```bash
# DO NOT commit this file to version control!
# Copy from .env.example and fill in your values

# === Service Ports ===
WORKSPACE_API_PORT=3200
TP_CAPITAL_PORT=4005
DOCUMENTATION_API_PORT=3400
SERVICE_LAUNCHER_PORT=3500

# === Logging ===
LOG_LEVEL=info
NODE_ENV=development
PRETTY_LOGS=true

# === Databases ===
TIMESCALE_POSTGRES_HOST=localhost
TIMESCALE_POSTGRES_PORT=5432
TIMESCALE_POSTGRES_USER=postgres
TIMESCALE_POSTGRES_PASSWORD=your_password_here
TIMESCALE_POSTGRES_DATABASE=tradingsystem

# === CORS ===
CORS_ORIGIN=http://localhost:3103,http://localhost:3400,http://localhost:3401
DISABLE_CORS=false

# === Rate Limiting ===
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120

# === Telegram ===
TELEGRAM_GATEWAY_URL=http://localhost:4006
TELEGRAM_SIGNALS_CHANNEL_ID=-1001234567890
```

### .env.example (Template)

```bash
# Copy this file to .env and fill in your values
# DO NOT commit .env to version control!

# Service Ports
WORKSPACE_API_PORT=3200
TP_CAPITAL_PORT=4005
# ... (document all variables)

# Sensitive Data (replace with real values)
TIMESCALE_POSTGRES_PASSWORD=changeme
OPENAI_API_KEY=sk-proj-...
```

## Validation Schemas

### Workspace API Schema

```javascript
{
  required: [
    'PORT',
    'LOG_LEVEL',
    'DB_STRATEGY',  // 'timescaledb' or 'lowdb'
  ],
  optional: [
    'CORS_ORIGIN',
    'TIMESCALEDB_HOST',
    'TIMESCALEDB_PORT',
    'TIMESCALEDB_USER',
    'TIMESCALEDB_PASSWORD',
    'TIMESCALEDB_DATABASE',
  ],
}
```

### TP Capital API Schema

```javascript
{
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
  ],
}
```

## Error Handling

```javascript
import { validateEnv, EnvValidationError } from '@backend/shared/config/validator';

try {
  validateEnv({
    required: ['DATABASE_URL', 'PORT'],
    logger,
  });
} catch (error) {
  if (error instanceof EnvValidationError) {
    console.error('Configuration error:', error.message);
    console.error('Missing variables:', error.missingVars);
    process.exit(1);
  }
  throw error;
}
```

**Output Example**:
```
Configuration error: Missing required environment variables: DATABASE_URL, PORT
Missing variables: [ 'DATABASE_URL', 'PORT' ]
```

## Best Practices

1. **Load environment FIRST**:
   ```javascript
   // ✅ GOOD - Load env before any imports
   import '@backend/shared/config/load-env.js';
   import { createLogger } from '@backend/shared/logger';

   // ❌ BAD - Logger imports before env is loaded
   import { createLogger } from '@backend/shared/logger';
   import '@backend/shared/config/load-env.js';
   ```

2. **Validate BEFORE starting server**:
   ```javascript
   import '@backend/shared/config/load-env.js';
   import { validateServiceConfig } from '@backend/shared/config/validator';
   import { createLogger } from '@backend/shared/logger';

   const logger = createLogger('my-service');

   // Validate BEFORE creating Express app
   validateServiceConfig('workspaceApi', { logger });

   const app = express();
   // ... rest of server setup
   ```

3. **Use type-safe helpers**:
   ```javascript
   // ✅ GOOD - Type-safe with validation
   const port = validatePort('PORT', 3000, { logger });

   // ❌ BAD - No validation, may crash
   const port = Number(process.env.PORT) || 3000;
   ```

4. **Document all variables in .env.example**:
   ```bash
   # Document what each variable does
   # BAD_VARIABLE=value

   # ✅ GOOD
   # Database connection string
   # Format: postgres://user:password@host:port/database
   DATABASE_URL=postgres://localhost:5432/tradingsystem
   ```

5. **Never commit secrets**:
   ```bash
   # .gitignore
   .env
   .env.local
   .env.*.local
   ```

## Migration Guide

### Before (service-specific .env)

```javascript
// apps/my-service/.env
PORT=3000
DATABASE_URL=postgres://localhost:5432/db

// apps/my-service/src/server.js
import dotenv from 'dotenv';
dotenv.config();  // Loads from service directory

const port = process.env.PORT || 3000;
```

### After (shared config)

```javascript
// Remove apps/my-service/.env (delete file)

// Move variables to root .env
// /TradingSystem/.env
MY_SERVICE_PORT=3000
DATABASE_URL=postgres://localhost:5432/db

// apps/my-service/src/server.js
import '@backend/shared/config/load-env.js';
import { validatePort } from '@backend/shared/config/validator';

const port = validatePort('MY_SERVICE_PORT', 3000, { logger });
```

## Troubleshooting

### "Missing required environment variables"

1. Check if `.env` exists in project root
2. Ensure variable name matches exactly (case-sensitive)
3. Check if variable value is not empty

### "Cannot find module 'dotenv'"

```bash
# Install dotenv in service directory
cd apps/my-service
npm install dotenv

# Or add to backend/shared/config/package.json
cd backend/shared/config
npm install dotenv
```

### Variables not loading

1. Ensure `load-env.js` is imported **first** in entry point
2. Check file paths (should be in project root, not service directory)
3. Verify no syntax errors in `.env` file

## Security

1. **Never commit .env** - Add to `.gitignore`
2. **Use encrypted secrets** in production (AWS Secrets Manager, Vault, etc.)
3. **Rotate secrets** regularly (quarterly recommended)
4. **Limit access** to `.env` file (chmod 600)
5. **Audit env vars** - Remove unused variables

## Environment-Specific Configuration

### Development

```bash
# .env (development)
NODE_ENV=development
LOG_LEVEL=debug
PRETTY_LOGS=true
DATABASE_URL=postgres://localhost:5432/tradingsystem_dev
```

### Production

```bash
# .env (production)
NODE_ENV=production
LOG_LEVEL=info
PRETTY_LOGS=false
DATABASE_URL=postgres://prod-host:5432/tradingsystem
```

### Docker

```bash
# docker-compose.yml
services:
  workspace-api:
    env_file:
      - ../../.env  # Load from project root
    environment:
      - NODE_ENV=production  # Override specific vars
```

## Future Enhancements

- [ ] Encrypted secrets at rest
- [ ] Secret rotation automation
- [ ] Environment variable encryption/decryption
- [ ] AWS Secrets Manager integration
- [ ] HashiCorp Vault integration
- [ ] Doppler.com integration
