# 🚨 Environment Configuration - MANDATORY RULES

> **CRITICAL: Read this BEFORE creating any new service, API, or application!**

---

## 🎯 The Golden Rule

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ⚠️  ALL SERVICES MUST USE THE CENTRALIZED .env FROM ROOT  ⚠️  │
│                                                                 │
│  ❌ NEVER create local .env files                              │
│  ✅ ALWAYS reference TradingSystem/.env                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Quick Reference

### Adding New Service?

```bash
# 1. Add variables to root .env.example
nano .env.example

# 2. Add values to root .env  
nano .env

# 3. Configure service to load from root
# See examples below

# 4. NEVER create local .env!
```

### Node.js Service?

```javascript
// backend/api/my-service/src/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });
```

### Python Service?

```python
# backend/services/my-service/config.py
from pathlib import Path
from dotenv import load_dotenv

project_root = Path(__file__).parent.parent.parent.parent
load_dotenv(dotenv_path=project_root / '.env')
```

### Vite/React App?

```javascript
// No configuration needed!
// Vite automatically loads .env from project root
const apiUrl = import.meta.env.VITE_API_URL;
```

### Docker Compose?

```yaml
# infrastructure/compose/docker-compose.my-service.yml
services:
  my-service:
    env_file:
      - ../../.env  # Always point to root
```

---

## 📖 Full Documentation

- **Complete Guide**: [`docs/context/ops/ENVIRONMENT-CONFIGURATION.md`](docs/context/ops/ENVIRONMENT-CONFIGURATION.md)
- **Backend Rules**: [`backend/ENV-CONFIGURATION-RULES.md`](backend/ENV-CONFIGURATION-RULES.md)
- **Contributing**: [`CONTRIBUTING.md`](CONTRIBUTING.md)
- **CLAUDE.md**: For AI assistants (section: Development Guidelines)

---

## ⚡ Quick Commands

```bash
# Setup new environment
bash scripts/env/setup-env.sh

# Validate configuration
bash scripts/env/validate-env.sh

# Migrate existing .env files
bash scripts/env/migrate-env.sh
```

---

## 🚫 What NOT to Do

```bash
# ❌ DON'T create local .env
touch backend/api/my-service/.env

# ❌ DON'T load without path
dotenv.config();

# ❌ DON'T hardcode values
const PORT = 3000;

# ❌ DON'T commit .env
git add .env
```

---

**This is a MANDATORY project standard enforced in code review.**

**Questions?** See documentation links above or ask in PR.

