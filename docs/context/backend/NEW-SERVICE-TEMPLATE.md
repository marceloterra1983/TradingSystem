---
title: New Backend Service Template
sidebar_position: 100
tags: [backend, template, guide, configuration]
domain: backend
type: reference
summary: Complete template for creating new backend services with proper .env configuration
status: active
last_review: "2025-10-17"
---

# New Backend Service Template

## 🚨 BEFORE YOU START

**READ THIS FIRST**: [`Guia de Configuração do Ambiente`](../ops/ENVIRONMENT-CONFIGURATION.md)

**CRITICAL RULE**: Your service MUST use the centralized `.env` file from project root. **NO local `.env` files!**

---

## 📋 Checklist for New Service

### Phase 1: Planning
- [ ] Define service purpose and scope
- [ ] List required environment variables
- [ ] Choose port number (coordinate with team)
- [ ] Review existing services for patterns

### Phase 2: Environment Configuration
- [ ] Add variables to **root** `.env.example` (with placeholders)
- [ ] Add variables to **root** `.env` (with real values)
- [ ] **VERIFY**: No local `.env` file created
- [ ] Update `scripts/env/validate-env.sh` (if mandatory variables)

### Phase 3: Service Implementation
- [ ] Create service directory: `backend/api/{service-name}/`
- [ ] Copy this template as starting point
- [ ] Implement config loader (see template below)
- [ ] Add dependencies to `package.json`
- [ ] Implement core functionality

### Phase 4: Testing & Validation
- [ ] Run validation: `bash scripts/env/validate-env.sh`
- [ ] Test service locally: `npm run dev`
- [ ] Verify environment loads: Check console logs
- [ ] Test endpoints with curl/Postman

### Phase 5: Documentation
- [ ] Create service README
- [ ] Document in `docs/context/backend/api/`
- [ ] Update `tools/README.md` (port table)
- [ ] Add to main README service list

---

## 🏗️ Service Template (Node.js/Express)

### Directory Structure

```
backend/api/my-service/
├── src/
│   ├── config.js         ⭐ Environment loader
│   ├── server.js         # Main server
│   ├── routes.js         # API routes
│   ├── logger.js         # Logging
│   └── middleware/       # Custom middleware
├── tests/
│   └── server.test.js
├── package.json
├── README.md
└── Dockerfile (if needed)
```

### 1. config.js (MANDATORY PATTERN)

```javascript
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ MANDATORY: Load from project root (4 levels up from src/)
const projectRoot = path.resolve(__dirname, '../../../../');
const envPath = path.join(projectRoot, '.env');

console.log(`[CONFIG] Loading environment from: ${envPath}`);
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error(`[CONFIG] ⚠️  Failed to load .env: ${result.error.message}`);
  console.error('[CONFIG] Service will use process environment variables only');
}

// Helper to get env variable with default
const env = (key, defaultValue) => {
  const value = process.env[key];
  if (value === undefined || value === '') {
    if (defaultValue === undefined) {
      throw new Error(`Required environment variable ${key} is not set`);
    }
    return defaultValue;
  }
  return value;
};

// Service configuration
export const config = {
  server: {
    port: Number(env('MY_SERVICE_PORT', 6000)),
    host: env('MY_SERVICE_HOST', '0.0.0.0'),
  },
  api: {
    // Required variable (no default)
    key: env('MY_SERVICE_API_KEY'),
  },
  database: {
    host: env('QUESTDB_HOST', 'localhost'),
    httpPort: Number(env('QUESTDB_HTTP_PORT', 9000)),
    user: env('QUESTDB_USER', 'admin'),
    password: env('QUESTDB_PASSWORD', 'quest'),
  },
  cors: {
    origin: env('CORS_ORIGIN', 'http://localhost:3103,http://localhost:3004'),
  },
  logging: {
    level: env('LOG_LEVEL', 'info'),
  },
  rateLimit: {
    windowMs: Number(env('RATE_LIMIT_WINDOW_MS', 60000)),
    max: Number(env('RATE_LIMIT_MAX', 120)),
  },
};

// Validate configuration
export function validateConfig(logger) {
  const required = ['MY_SERVICE_API_KEY'];
  const missing = [];

  for (const key of required) {
    if (!process.env[key] || process.env[key] === 'your-api-key-here') {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    const error = `Missing required environment variables: ${missing.join(', ')}`;
    logger.error(error);
    throw new Error(error);
  }

  logger.info('✓ Configuration validated successfully');
}
```

### 2. server.js

```javascript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import { config, validateConfig } from './config.js';
import { logger } from './logger.js';

// Validate configuration on startup
validateConfig(logger);

const app = express();
const PORT = config.server.port;

// Middleware
app.use(helmet());
app.use(express.json());

// CORS
const corsOrigins = config.cors.origin.split(',').map(o => o.trim());
app.use(cors({ origin: corsOrigins }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
});
app.use(limiter);

// Routes
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'my-service',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, config.server.host, () => {
  logger.info(`My Service started on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
```

### 3. package.json

```json
{
  "name": "my-service",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "node src/server.js",
    "start": "NODE_ENV=production node src/server.js",
    "test": "jest"
  },
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "dotenv": "^16.0.0",
    "express-rate-limit": "^7.0.0",
    "pino": "^8.0.0"
  }
}
```

### 4. README.md (service-specific)

```markdown
# My Service

## Configuration

All configuration is in **root `.env` file**.

### Required Variables

- `MY_SERVICE_PORT` - Service port (default: 6000)
- `MY_SERVICE_API_KEY` - API authentication key

### Optional Variables

- `LOG_LEVEL` - Logging level (default: info)
- `CORS_ORIGIN` - Allowed origins

See root `.env.example` for complete configuration.

## Running

\`\`\`bash
# From service directory
npm install
npm run dev

# Service will load .env from: TradingSystem/.env
\`\`\`
```

---

## 🐳 Docker Compose Template

```yaml
# tools/compose/docker-compose.my-service.yml
version: '3.8'

services:
  my-service:
    container_name: api-my-service
    build:
      context: ../../backend/api/my-service
      dockerfile: Dockerfile
    restart: unless-stopped
    # ✅ MANDATORY: Reference root .env
    env_file:
      - ../../.env
    ports:
      - "${MY_SERVICE_PORT}:${MY_SERVICE_PORT}"
    environment:
      # Only override specific values if needed
      - NODE_ENV=${NODE_ENV:-production}
    networks:
      - backend-apis
    labels:
      - "com.tradingsystem.stack=backend-apis"
      - "com.tradingsystem.service=my-service"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:${MY_SERVICE_PORT}/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

networks:
  backend-apis:
    driver: bridge

# NO volumes needed for .env - it's mounted via env_file
```

---

## 📝 Environment Variables to Add

### In Root `.env.example`

```bash
# ==============================================================================
# 🌐 MY NEW SERVICE (Port 6000)
# ==============================================================================
# Description of what this service does

# Required
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=your-api-key-here

# Optional
MY_SERVICE_DB_HOST=localhost
MY_SERVICE_ENABLE_CACHE=true
```

### In Root `.env`

```bash
# Real values (not committed)
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=sk-real-api-key-abc123
MY_SERVICE_DB_HOST=localhost
MY_SERVICE_ENABLE_CACHE=true
```

---

## ✅ Validation

After creating your service:

```bash
# 1. Validate environment
bash scripts/env/validate-env.sh

# 2. Test config loading
cd backend/api/my-service
npm run dev
# Should see: [CONFIG] Loading environment from: /path/to/TradingSystem/.env

# 3. Test endpoint
curl http://localhost:6000/health

# 4. Test Docker (if created)
docker-compose -f tools/compose/docker-compose.my-service.yml config
docker-compose -f tools/compose/docker-compose.my-service.yml up -d
```

---

## 🚫 NEVER Do This

```javascript
// ❌ WRONG - Loading local .env
import 'dotenv/config';

// ❌ WRONG - No path specified
dotenv.config();

// ❌ WRONG - Hardcoded values
const PORT = 6000;
const API_KEY = 'hardcoded';

// ❌ WRONG - Creating local .env
touch .env
```

```yaml
# ❌ WRONG - Local env file in compose
services:
  my-service:
    env_file:
      - .env  # Wrong! Should be ../../.env
```

---

## 📚 See Also

- **Main ENV Rules**: [`Guia de Configuração do Ambiente`](../ops/ENVIRONMENT-CONFIGURATION.md)
- **Backend ENV Rules**: [`Checklist de Variáveis`](../ops/ENVIRONMENT-CONFIGURATION.md)
- **Complete Guide**: [`docs/context/ops/ENVIRONMENT-CONFIGURATION.md`](../ops/ENVIRONMENT-CONFIGURATION.md)
- **CONTRIBUTING**: [Guia de Contribuição](https://github.com/marceloterra/TradingSystem/blob/main/CONTRIBUTING.md)

---

**Template Version**: 1.0  
**Last Updated**: 2025-10-15  
**Mandatory Pattern Since**: v2.1
