# Backend Services - Environment Configuration Rules

## ⚠️ CRITICAL RULE

**ALL backend services, APIs, and microservices MUST use the centralized `.env` file from the project root.**

**NEVER create local `.env` files in service directories!**

---

## ✅ Correct Pattern for New Services

### Step 1: Add Variables to Root `.env.example`

```bash
# Edit TradingSystem/.env.example

# ==============================================================================
# 🌐 MY NEW SERVICE
# ==============================================================================
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=your-api-key-here
MY_SERVICE_DB_CONNECTION=postgresql://localhost:5432/mydb
```

### Step 2: Add to Root `.env`

```bash
# Edit TradingSystem/.env (with real values)
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=sk-real-key-abc123
MY_SERVICE_DB_CONNECTION=postgresql://localhost:5432/tradingsystem
```

### Step 3: Create Service with Proper Config

**For Node.js/Express Services**:

```javascript
// backend/api/my-service/src/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ MANDATORY: Load from project root (4 levels up)
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Now use process.env normally
export const config = {
  server: {
    port: Number(process.env.MY_SERVICE_PORT || 6000),
  },
  api: {
    key: process.env.MY_SERVICE_API_KEY,
  },
  database: {
    connection: process.env.MY_SERVICE_DB_CONNECTION,
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3103',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validation
if (!config.api.key || config.api.key === 'your-api-key-here') {
  throw new Error('MY_SERVICE_API_KEY must be configured in root .env');
}
```

**For Python Services** (when implemented):

```python
# backend/services/my-service/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# ✅ MANDATORY: Load from project root
project_root = Path(__file__).parent.parent.parent.parent
env_path = project_root / '.env'
load_dotenv(dotenv_path=env_path)

class Config:
    PORT = int(os.getenv('MY_SERVICE_PORT', 6000))
    API_KEY = os.getenv('MY_SERVICE_API_KEY')
    DB_CONNECTION = os.getenv('MY_SERVICE_DB_CONNECTION')
    
    @classmethod
    def validate(cls):
        if not cls.API_KEY or cls.API_KEY == 'your-api-key-here':
            raise ValueError('MY_SERVICE_API_KEY must be set in root .env')
```

### Step 4: Docker Compose (if applicable)

```yaml
# infrastructure/compose/docker-compose.my-service.yml
version: '3.8'

services:
  my-service:
    build:
      context: ../../backend/api/my-service
    # ✅ MANDATORY: Reference root .env
    env_file:
      - ../../.env
    ports:
      - "${MY_SERVICE_PORT}:${MY_SERVICE_PORT}"
    environment:
      # Only override specific values if needed
      - NODE_ENV=${NODE_ENV:-production}
      - LOG_LEVEL=${LOG_LEVEL:-info}
```

### Step 5: Validate

```bash
# From project root
bash scripts/env/validate-env.sh

# Test service
cd backend/api/my-service
npm run dev

# Should see: ✓ Loaded environment from: /path/to/TradingSystem/.env
```

---

## ❌ WRONG Patterns - Avoid These!

### ❌ Creating Local .env

```bash
# DON'T DO THIS!
cd backend/api/my-service
touch .env  # ❌ NEVER!
```

### ❌ Loading Local .env

```javascript
// ❌ WRONG - Loads local .env
import 'dotenv/config';
```

```javascript
// ❌ WRONG - Loads from current directory
dotenv.config();
```

```javascript
// ❌ WRONG - Hardcoded relative path
dotenv.config({ path: './.env' });
```

### ❌ Hardcoding Values

```javascript
// ❌ WRONG
const PORT = 3000;
const API_KEY = 'hardcoded-key';
```

---

## 🔍 Existing Service Examples

### B3 API ✅

```javascript
// frontend/apps/b3-market-data/src/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

// Uses: B3_API_PORT, QUESTDB_HTTP_URL, CORS_ORIGIN, etc.
```

### Library/Idea Bank API ✅

```javascript
// backend/api/workspace/src/config.js
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename_config = fileURLToPath(import.meta.url);
const __dirname_config = dirname(__filename_config);
const projectRoot = join(__dirname_config, '../../../../');
dotenv.config({ path: join(projectRoot, '.env') });

// Uses: LIBRARY_PORT, QUESTDB_HOST, CORS_ORIGIN, etc.
```

**Reference these as templates for new services!**

---

## 📋 Checklist for New Services

When creating a new backend service:

### Environment Setup
- [ ] Variables added to root `.env.example` (with placeholders)
- [ ] Variables added to root `.env` (with real values)
- [ ] **NO** local `.env` file created
- [ ] Service config loads from root `.env` (4 levels up: `../../../../.env`)
- [ ] Validation script updated (if mandatory variables)

### Code Configuration
- [ ] `config.js` or `config.py` loads from project root
- [ ] All config values from `process.env` (Node) or `os.getenv` (Python)
- [ ] No hardcoded values
- [ ] Proper defaults for optional variables
- [ ] Validation for required variables

### Docker Integration
- [ ] `docker-compose.yml` uses `env_file: - ../../.env`
- [ ] Only override specific values in `environment:` if needed
- [ ] Tested with `docker-compose config`

### Documentation
- [ ] Service documented in `backend/api/{service}/README.md`
- [ ] Variables documented in `.env.example` comments
- [ ] Added to `docs/context/backend/api/`

### Validation
- [ ] `bash scripts/env/validate-env.sh` passes
- [ ] Service starts without errors
- [ ] Environment variables load correctly (check logs)

---

## 🔧 Path Calculation

Services at different depths need different paths:

| Service Location | Levels Up | Path to Root |
|------------------|-----------|--------------|
| `backend/api/{service}/src/` | 4 | `../../../../.env` |
| `backend/services/{service}/` | 3 | `../../../.env` |
| `backend/shared/` | 2 | `../../.env` |
| `frontend/apps/{app}/` | 3 | `../../../.env` |

**Always verify by logging the resolved path!**

```javascript
const projectRoot = path.resolve(__dirname, '../../../../');
const envPath = path.join(projectRoot, '.env');
console.log('Loading .env from:', envPath);
dotenv.config({ path: envPath });
```

---

## 🚨 Common Mistakes

### Mistake 1: Creating Local .env

**Problem**: Developer creates `backend/api/my-service/.env`

**Impact**:
- Breaks centralized configuration
- Creates configuration drift
- Secrets may be scattered
- Harder to manage in production

**Solution**: Delete local `.env`, use root `.env`

### Mistake 2: Using dotenv Without Path

**Problem**:
```javascript
import 'dotenv/config';  // ❌ Loads .env from CWD
```

**Impact**: May load wrong `.env` or none at all

**Solution**:
```javascript
// ✅ Always specify path to root
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });
```

### Mistake 3: Forgetting to Update .env.example

**Problem**: Add variable only to `.env`, not `.env.example`

**Impact**:
- New developers miss the variable
- Template is incomplete
- CI/CD may fail

**Solution**: Always update BOTH files

---

## 📚 Documentation References

- **Main Guide**: `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
- **Migration Guide**: `docs/context/ops/COMPLETE-ENV-CONSOLIDATION-GUIDE.md`
- **Contributing**: `CONTRIBUTING.md`
- **Scripts**: `scripts/env/`

---

## ✅ Summary

**Golden Rule**: **ONE `.env` file in project root for EVERYTHING!**

```bash
TradingSystem/
├── .env  ⭐ The ONLY .env file allowed
├── .env.example  ⭐ Template for all services
└── {any-service}/
    └── config.{js|py}  # Loads from root .env
```

**When in doubt**: Check existing services (B3 API, Workspace) as reference!

---

**Last Updated**: 2025-10-15  
**Mandatory Since**: v2.1  
**Enforcement**: Code review + CI/CD validation

