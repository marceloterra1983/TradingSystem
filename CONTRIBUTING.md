# Contributing to TradingSystem

Thank you for your interest in contributing to TradingSystem! This document provides guidelines and best practices for contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Environment Configuration](#️-environment-configuration-critical)
- [Getting Started](#-getting-started)
- [Development Workflow](#-development-workflow)
- [Coding Standards](#-coding-standards)
- [Commit Guidelines](#-commit-guidelines)
- [Pull Request Process](#-pull-request-process)

---

## 🤝 Code of Conduct

- Be respectful and constructive
- Focus on what is best for the project
- Show empathy towards other contributors
- Accept constructive criticism gracefully

---

## ⚠️ Environment Configuration (CRITICAL)

### 🚨 MANDATORY RULE: Centralized .env File

**ALL applications, services, containers, and infrastructure components MUST use the centralized `.env` file from the project root.**

### ❌ NEVER Do This:

```bash
# DON'T create local .env files
my-service/
├── src/
└── .env  ❌ WRONG!
```

### ✅ ALWAYS Do This:

```bash
# Reference root .env file
TradingSystem/
├── .env  ✅ Single source of truth
└── my-service/
    └── src/
        └── config.js  # Loads ../../.env
```

### Implementation Examples

#### For Docker Compose Services:

```yaml
# my-service/docker-compose.yml
services:
  my-service:
    env_file:
      - ../../.env  # ✅ Always point to root
    environment:
      - MY_SERVICE_PORT=${MY_SERVICE_PORT}
```

#### For Node.js/Express Services:

```javascript
// backend/api/my-service/src/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ Load from project root
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

export const config = {
  port: process.env.MY_SERVICE_PORT || 5000,
  // ... other configs
};
```

#### For Vite/React Applications:

```javascript
// frontend/apps/my-app/vite.config.ts
import { defineConfig } from 'vite';

// ✅ Vite automatically loads .env from project root
// No additional configuration needed!

export default defineConfig({
  // ... your config
});
```

### Adding New Environment Variables

When adding new environment variables:

1. **Add to `.env.example`** with placeholder:
   ```bash
   # In .env.example
   MY_NEW_SERVICE_PORT=5000
   MY_NEW_SERVICE_API_KEY=your-api-key-here
   ```

2. **Add to root `.env`** with real value:
   ```bash
   # In .env (not committed)
   MY_NEW_SERVICE_PORT=5000
   MY_NEW_SERVICE_API_KEY=sk-real-key-here
   ```

3. **Update validation script** if required:
   ```bash
   # In scripts/env/validate-env.sh
   REQUIRED_VARS=(
       # ... existing
       "MY_NEW_SERVICE_API_KEY"  # Add if mandatory
   )
   ```

4. **Document in**:
   - Section comment in `.env.example`
   - `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`

5. **Validate**:
   ```bash
   bash scripts/env/validate-env.sh
   ```

**Documentation**: See `docs/context/ops/ENVIRONMENT-CONFIGURATION.md` for complete guide.

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- Docker & Docker Compose
- Git

### Initial Setup

```bash
# 1. Clone repository
git clone https://github.com/marceloterra/TradingSystem.git
cd TradingSystem

# 2. Setup environment (REQUIRED)
bash scripts/env/setup-env.sh

# 3. Validate configuration
bash scripts/env/validate-env.sh

# 4. Install dependencies
# Frontend
cd frontend/apps/dashboard && npm install

# Backend APIs (example)
cd backend/api/workspace && npm install

# 5. Start services
bash scripts/docker/start-stacks.sh
```

---

## 🔄 Development Workflow

### Creating a New Feature

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Add environment variables** (if needed):
   - Update `.env.example` with placeholders
   - Update root `.env` with values
   - Update validation script if required

3. **Develop feature**:
   - Follow coding standards (see below)
   - Write tests
   - Update documentation

4. **Validate**:
   ```bash
   # Environment
   bash scripts/env/validate-env.sh
   
   # Code quality
   npm run lint
   npm run test
   ```

5. **Commit**:
   ```bash
   git add .
   git commit -m "feat: my feature description"
   ```

6. **Create Pull Request**

---

## 🎨 Coding Standards

### TypeScript/JavaScript

- **Style**: 2 spaces, camelCase for variables, PascalCase for components
- **Linter**: ESLint with project config
- **Formatter**: Prettier
- **Conventions**: See `.cursorrules` file

### C# (.NET)

- **Style**: PascalCase, 4 spaces
- **Follow**: `.editorconfig`
- **Platform**: x64 only (ProfitDLL requirement)

### Python

- **Style**: snake_case, Black formatter (88 chars)
- **Type hints**: Required for public functions
- **Docstrings**: Google style

### Environment Variables

**CRITICAL**: Follow centralized `.env` pattern:

```javascript
// ✅ CORRECT
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

// ❌ WRONG
dotenv.config();  // Loads local .env
```

---

## 📝 Commit Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Adding/updating tests
- `chore`: Maintenance tasks

### Examples

```bash
# Feature
git commit -m "feat(dashboard): add new trading chart component"

# Bug fix
git commit -m "fix(api): correct CORS configuration for production"

# Documentation
git commit -m "docs(environment): update .env configuration guide"

# Environment config
git commit -m "chore(env): consolidate API variables in root .env"
```

### Environment-Related Commits

When making changes to environment configuration:

```bash
# Adding new variables
git commit -m "chore(env): add MY_SERVICE_PORT to centralized .env"

# Updating .env.example
git commit -m "docs(env): add new service variables to .env.example"

# Migration
git commit -m "refactor(env): migrate service-name to use root .env"
```

---

## 🔍 Pull Request Process

### Before Creating PR

1. **Environment validation**:
   ```bash
   bash scripts/env/validate-env.sh
   ```

2. **Code quality**:
   ```bash
   npm run lint
   npm run test
   ```

3. **Documentation**:
   - Update relevant docs
   - Add/update code comments
   - Update `.env.example` if new variables

4. **Test locally**:
   ```bash
   # Test affected services
   npm run dev
   ```

### PR Checklist

- [ ] Code follows project coding standards
- [ ] All tests pass
- [ ] Documentation updated (if applicable)
- [ ] `.env.example` updated with new variables (if any)
- [ ] No local `.env` files created
- [ ] Environment variables validated
- [ ] Commit messages follow conventional commits
- [ ] PR description explains what and why

### PR Title Format

Use conventional commit format:

```
feat(scope): add feature description
fix(scope): fix bug description
docs(scope): update documentation
```

---

## 🏗️ Creating New Services

### Step-by-Step Guide

#### 1. Plan Your Service

- Define purpose and scope
- List required environment variables
- Choose technology stack

#### 2. Add Environment Variables

```bash
# Edit .env.example (template for all)
nano .env.example

# Add your variables in appropriate section:
# ==============================================================================
# 🌐 MY NEW SERVICE
# ==============================================================================
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=your-api-key-here
MY_SERVICE_DB_HOST=localhost
```

```bash
# Edit root .env (actual values)
nano .env

# Add real values:
MY_SERVICE_PORT=6000
MY_SERVICE_API_KEY=sk-real-key-abc123
MY_SERVICE_DB_HOST=localhost
```

#### 3. Create Service Structure

```bash
# Example for Node.js API
mkdir -p backend/api/my-service/src
cd backend/api/my-service

# Initialize
npm init -y
npm install express dotenv
```

#### 4. Configure to Load Root .env

```javascript
// backend/api/my-service/src/config.js
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ✅ MANDATORY: Load from project root
const projectRoot = path.resolve(__dirname, '../../../../');
dotenv.config({ path: path.join(projectRoot, '.env') });

export const config = {
  port: process.env.MY_SERVICE_PORT || 6000,
  apiKey: process.env.MY_SERVICE_API_KEY,
  dbHost: process.env.MY_SERVICE_DB_HOST || 'localhost',
};
```

#### 5. Create Docker Compose (if needed)

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
      - NODE_ENV=${NODE_ENV:-production}
```

#### 6. Validate

```bash
# Validate environment
bash scripts/env/validate-env.sh

# Test service
npm run dev

# Test Docker (if applicable)
docker-compose -f infrastructure/compose/docker-compose.my-service.yml config
```

#### 7. Document

- Add service to `infrastructure/README.md`
- Add to `docs/context/backend/api/` (if backend)
- Add to `docs/context/frontend/` (if frontend)
- Update this CONTRIBUTING.md if new patterns

---

## 🔧 Development Tools

### Environment Management Scripts

```bash
# Setup new environment
bash scripts/env/setup-env.sh

# Validate configuration
bash scripts/env/validate-env.sh

# Migrate existing .env files
bash scripts/env/migrate-env.sh
```

### Docker Compose

```bash
# Start specific stack
docker-compose -f infrastructure/compose/docker-compose.*.yml up -d

# Start all stacks
bash scripts/docker/start-stacks.sh

# View logs
docker-compose -f infrastructure/compose/docker-compose.*.yml logs -f
```

---

## 📚 Documentation Requirements

### For New Features

1. **Code Documentation**:
   - JSDoc for functions
   - Comments for complex logic
   - README in service directory

2. **User Documentation**:
   - Update relevant docs in `docs/context/`
   - Add examples
   - Update API documentation

3. **Environment Documentation**:
   - Comment new variables in `.env.example`
   - Update `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
   - Add to variable mapping table

### Documentation Standards

- Use Markdown
- Include YAML frontmatter for docs in `docs/context/`
- Add PlantUML diagrams for architecture
- Follow structure in `docs/DOCUMENTATION-STANDARD.md`

---

## 🐛 Reporting Issues

### Bug Reports

Include:
- Description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Relevant logs
- `.env` configuration (WITHOUT sensitive values!)

### Feature Requests

Include:
- Use case description
- Proposed solution
- Required environment variables (if any)
- Impact on existing features

---

## ✅ Review Checklist

Before submitting PR, ensure:

### Environment Variables
- [ ] No local `.env` files created
- [ ] New variables added to `.env.example`
- [ ] New variables added to root `.env`
- [ ] Service configured to load from root `.env`
- [ ] Validation script updated (if mandatory variables)
- [ ] `bash scripts/env/validate-env.sh` passes

### Code Quality
- [ ] Follows project coding standards
- [ ] No linter errors
- [ ] Tests pass
- [ ] No console.log() in production code
- [ ] Error handling implemented

### Documentation
- [ ] Code documented (JSDoc/comments)
- [ ] User documentation updated
- [ ] `.env.example` commented
- [ ] CHANGELOG updated (if applicable)

### Testing
- [ ] Feature tested locally
- [ ] Docker services tested (if applicable)
- [ ] No breaking changes (or documented)

---

## 🚫 Common Mistakes to Avoid

### ❌ Creating Local .env Files

**DON'T**:
```bash
cd backend/api/my-service
touch .env  # ❌ NEVER!
```

**DO**:
```bash
# Add to root .env.example and .env
nano .env.example
nano .env
```

### ❌ Hardcoding Configuration

**DON'T**:
```javascript
const PORT = 3000;  // ❌ Hardcoded
```

**DO**:
```javascript
const PORT = process.env.MY_SERVICE_PORT || 3000;  // ✅ From .env
```

### ❌ Committing Secrets

**DON'T**:
```bash
git add .env  # ❌ Contains secrets!
```

**DO**:
```bash
git add .env.example  # ✅ Only template
# .env is in .gitignore automatically
```

### ❌ Skipping Validation

**DON'T**:
```bash
# Start without validating
npm run dev  # ❌ May fail with missing vars
```

**DO**:
```bash
# Always validate first
bash scripts/env/validate-env.sh  # ✅ Catches errors early
npm run dev
```

---

## 📖 Additional Resources

### Documentation

- **Environment Guide**: `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`
- **Migration Guide**: `docs/context/ops/COMPLETE-ENV-CONSOLIDATION-GUIDE.md`
- **Infrastructure**: `infrastructure/README.md`
- **Frontend**: `frontend/README.md`
- **CLAUDE.md**: Complete guide for AI assistants (also valid for humans!)

### Architecture

- **System Overview**: `SYSTEM-OVERVIEW.md`
- **Directory Structure**: `docs/DIRECTORY-STRUCTURE.md`
- **ADRs**: `docs/context/backend/architecture/decisions/`

### Tools

- **Environment Scripts**: `scripts/env/`
- **Docker Scripts**: `scripts/docker/`
- **Startup Scripts**: `scripts/startup/`
- **Database Scripts**: `scripts/database/`
- **Maintenance Scripts**: `scripts/maintenance/`

---

## 🎯 Quick Reference

### I want to...

**...add a new service**:
1. Add variables to `.env.example` and `.env`
2. Create service with config loading from root
3. Validate with `scripts/env/validate-env.sh`
4. Document in appropriate `docs/context/` location

**...modify existing service**:
1. Update variables in root `.env` (not local!)
2. Validate changes
3. Test service
4. Update documentation

**...configure for production**:
1. Copy `.env.example` to server
2. Rename to `.env`
3. Configure production values
4. `chmod 600 .env`
5. Validate before deploy

**...troubleshoot environment issues**:
1. Check `.env` exists: `ls -la .env`
2. Validate: `bash scripts/env/validate-env.sh`
3. Check service config loads from root
4. Review `docs/context/ops/ENVIRONMENT-CONFIGURATION.md`

---

## 🙏 Thank You!

Your contributions make TradingSystem better! If you have questions:

1. Check documentation in `docs/context/`
2. Review existing code for patterns
3. Ask in pull request or issue

**Remember**: Use centralized `.env` file - this is non-negotiable! 🎯

---

**Last Updated**: 2025-10-15  
**Version**: 2.1  
**Maintained By**: DevOps Team
