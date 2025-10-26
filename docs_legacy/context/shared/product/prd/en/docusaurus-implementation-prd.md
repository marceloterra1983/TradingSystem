---
title: PRD Docusaurus Implementation
sidebar_position: 30
tags: [docusaurus, documentation, react, migration, prd]
domain: shared
type: prd
summary: Implement Docusaurus as a modern documentation platform, replacing MkDocs with advanced features, better UX, and native React integration
status: active
last_review: "2025-10-17"
language: en
---

# PRD: Docusaurus Implementation

## Metadata

-   **Author:** Docs / Ops
-   **Date:** 2025-10-10
-   **Status:** Draft
-   **Priority:** P1
-   **Version:** 1.0.0

## Executive Summary

Migrate TradingSystem's technical documentation from MkDocs to Docusaurus, leveraging its React-based architecture, superior performance, and modern user experience. 🐳 **Docker-first implementation** ensures consistent deployment, easy maintenance, and production-ready infrastructure from day one.

Docusaurus offers instant hot reload, MDX (Markdown + JSX), native versioning, robust i18n, and perfect integration with the React ecosystem already used in the project.

**Key Benefits:**

-   🐳 **Docker-first:** Containerized deployment with docker-compose
-   ⚡ Superior performance (build 3-5x faster than MkDocs)
-   🎨 Modern UI/UX with React components
-   📦 Integrated documentation versioning
-   🌍 Native and robust i18n (PT/EN)
-   🔍 Algolia DocSearch (free for open source)
-   🧩 MDX: interactive React components in Markdown
-   🚀 Optimized deploy (static site generation)

## Problem Statement

### Current Context

We currently use MkDocs Material for technical documentation. While functional, it presents limitations:

1. **Misaligned technology:** Python-based while project is React/TypeScript
2. **Limited customization:** Difficult to create interactive components
3. **Performance:** Slow builds (0.68s current, may scale poorly)
4. **Manual versioning:** No native version support
5. **Complex i18n:** Requires plugins and manual configuration
6. **Frontend integration:** Doesn't share components with React Dashboard

### User Pain Points

-   **Developers:** Need to learn Python/Jinja2 to customize docs
-   **Ops:** Deploy requires separate Python environment
-   **Product:** Difficult to create interactive demos and reusable components
-   **End users:** Inferior search experience, no hot reload during dev

## Objectives and Non-Objectives

### Objectives

1. ✅ Migrate all documentation from MkDocs to Docusaurus
2. ✅ Implement custom theme aligned with Dashboard design system
3. ✅ Configure i18n for PT/EN with complete translations
4. ✅ Integrate Algolia DocSearch for advanced search
5. ✅ Create reusable MDX components (diagrams, code examples, API docs)
6. ✅ Configure versioning (v1.0, v2.0, latest, next)
7. ✅ Optimize build and deploy (< 30s build time)
8. ✅ Document contribution process (writer's guide)

### Non-Objectives

-   ❌ Rewrite existing content (migration only)
-   ❌ Implement blog (may be phase 2)
-   ❌ Integrate inline comments/feedback (may be phase 2)
-   ❌ Create automated API docs via TypeDoc/Swagger (may be phase 2)

## Functional Requirements

### FR1: Navigation Structure

**Priority:** P0
**Description:** Maintain current structure (Frontend, Backend, Ops, Shared) with sidebar navigation.

**Acceptance Criteria:**

-   Sidebar with collapsible categories
-   Breadcrumbs on all pages
-   Keyboard navigation (← →)
-   TOC (Table of Contents) on the right
-   Global search with shortcut (Ctrl/Cmd + K)

### FR2: i18n Support (PT/EN)

**Priority:** P0
**Description:** Bilingual documentation with language selector.

**Acceptance Criteria:**

-   Language selector in header
-   Separate routes: `/pt/`, `/en/`
-   Fallback to EN when PT translation doesn't exist
-   UI translation (sidebar, footer, buttons)
-   Permalink preserved between languages

### FR3: Versioning

**Priority:** P1
**Description:** Support for multiple documentation versions.

**Acceptance Criteria:**

-   Versions: `latest`, `2.1`, `2.0`, `1.0`
-   Version selector in header
-   Alert banner on old versions
-   URL structure: `/docs/2.1/frontend/overview`
-   Redirect `/docs/` → `/docs/latest/`

### FR4: MDX Components

**Priority:** P1
**Description:** Reusable React components in Markdown.

**Acceptance Criteria:**

-   `<Tabs>` for multi-language code
-   `<Admonition>` for notes/warnings/tips
-   `<CodeBlock>` with syntax highlighting + copy button
-   `<ApiEndpoint>` for API documentation
-   `<Diagram>` for Mermaid diagrams
-   `<VideoEmbed>` for tutorials

### FR5: Algolia DocSearch

**Priority:** P1
**Description:** Advanced search with automatic indexing.

**Acceptance Criteria:**

-   Integration with Algolia DocSearch (free for open source)
-   Search in PT and EN
-   Real-time suggestions
-   Keyboard navigation (↑ ↓ Enter)
-   Categorization by section (Frontend, Backend, etc.)

### FR6: Dark/Light Themes

**Priority:** P1
**Description:** Dark mode support with persistence.

**Acceptance Criteria:**

-   Dark/light toggle in header
-   localStorage persistence
-   System preference detection
-   Smooth transition (CSS transitions)
-   Colors aligned with Dashboard (Indigo/Cyan)

### FR7: SEO and Metadata

**Priority:** P2
**Description:** Search engine optimization.

**Acceptance Criteria:**

-   Meta tags (title, description, keywords)
-   Open Graph tags for sharing
-   Sitemap.xml generated automatically
-   robots.txt configured
-   Canonical URLs

## Non-Functional Requirements

### NFR1: Performance

-   **Build time:** < 30s for full build
-   **Hot reload:** < 200ms during development
-   **First contentful paint:** < 1.5s
-   **Time to interactive:** < 3s
-   **Lighthouse score:** > 90 (Performance, Accessibility, SEO)

### NFR2: Accessibility

-   **WCAG 2.1 Level AA** compliance
-   Full keyboard navigation
-   Screen reader friendly
-   Adequate color contrast (4.5:1 minimum)
-   Visible focus indicators

### NFR3: Compatibility

-   **Browsers:** Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
-   **Mobile:** iOS Safari 14+, Chrome Android 90+
-   **Responsive:** Mobile-first (320px+)

### NFR4: Maintainability

-   Setup documentation (README.md)
-   Automatic migration scripts (MkDocs → Docusaurus)
-   Contribution guide (CONTRIBUTING.md)
-   Automated CI/CD pipeline
-   Mandatory code review for config changes

### NFR5: Security

-   MDX content sanitization (XSS prevention)
-   CSP (Content Security Policy) headers
-   HTTPS only
-   Audited dependencies (npm audit)

## Architecture and Technology

### Technology Stack

```yaml
Core:
  - Docusaurus: ^3.5.2
  - React: ^18.3.1
  - TypeScript: ^5.6.0
  - Node.js: ^20.18.0

Plugins:
  - @docusaurus/plugin-content-docs: docs management
  - @docusaurus/plugin-content-blog: (future)
  - @docusaurus/plugin-sitemap: SEO
  - @docusaurus/theme-classic: base theme
  - @docusaurus/theme-search-algolia: search

Customization:
  - Tailwind CSS: utility-first CSS
  - Prism: syntax highlighting
  - Mermaid: diagrams
  - React Icons: iconography

Build & Deploy:
  - Docker: 🐳 containerized deployment (primary)
  - docker-compose: orchestration
  - npm/pnpm: package manager
  - GitHub Actions: CI/CD
  - Multi-stage builds: optimized production images
```

### Directory Structure

```
docs/
├── docusaurus.config.ts        # Main config
├── sidebars.ts                 # Sidebar navigation
├── src/
│   ├── components/             # React components
│   │   ├── ApiEndpoint/
│   │   ├── Diagram/
│   │   ├── CodeBlock/
│   │   └── Tabs/
│   ├── css/                    # Custom styles
│   │   └── custom.css
│   └── pages/                  # Standalone pages (Home)
│       └── index.tsx
├── docs/                       # Main documentation
│   ├── frontend/
│   ├── backend/
│   ├── ops/
│   └── shared/
├── i18n/                       # Translations
│   ├── pt/
│   └── en/
├── versioned_docs/             # Old versions
│   ├── version-2.1/
│   ├── version-2.0/
│   └── version-1.0/
├── versioned_sidebars/
├── static/                     # Static assets
│   ├── img/
│   ├── fonts/
│   └── downloads/
└── package.json
```

### 🐳 Docker Architecture

**docker-compose.yml**

```yaml
version: "3.8"

services:
    docusaurus:
        build:
            context: .
            dockerfile: Dockerfile
        container_name: tradingsystem-docs
        ports:
            - "3000:3000"
        volumes:
            - ./docs:/app/docs
            - ./src:/app/src
            - ./static:/app/static
            - ./i18n:/app/i18n
            - ./sidebars.ts:/app/sidebars.ts
            - ./docusaurus.config.ts:/app/docusaurus.config.ts
            - node_modules:/app/node_modules
        environment:
            - NODE_ENV=development
            - CHOKIDAR_USEPOLLING=true
        restart: unless-stopped
        networks:
            - tradingsystem

    docusaurus-prod:
        build:
            context: .
            dockerfile: Dockerfile.prod
            target: production
        container_name: tradingsystem-docs-prod
        ports:
            - "3000:80"
        restart: unless-stopped
        networks:
            - tradingsystem

networks:
    tradingsystem:
        external: true
```

**Dockerfile (Development)**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start dev server with hot reload
CMD ["npm", "start", "--", "--host", "0.0.0.0", "--poll"]
```

**Dockerfile.prod (Production - Multi-stage)**

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Stage 2: Production
FROM nginx:alpine AS production

COPY --from=builder /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**nginx.conf**

```nginx
server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

## Migration Plan

### Phase 1: Initial Setup (Week 1)

-   [ ] 🐳 Create `Dockerfile` and `docker-compose.yml`
-   [ ] 🐳 Configure Docker volumes for hot reload
-   [ ] Install Docusaurus in `/docs-new` directory
-   [ ] Configure TypeScript + ESLint + Prettier
-   [ ] Create directory structure
-   [ ] Configure i18n (PT/EN)
-   [ ] Implement custom theme (colors, fonts)
-   [ ] 🐳 Test Docker development environment

### Phase 2: Content Migration (Week 2-3)

-   [ ] Automatic conversion script (MkDocs → Docusaurus)
-   [ ] Migrate Frontend docs (30 files)
-   [ ] Migrate Backend docs (45 files)
-   [ ] Migrate Ops docs (20 files)
-   [ ] Migrate Shared docs (15 files)
-   [ ] Review internal links (broken links check)

### Phase 3: MDX Components (Week 4)

-   [ ] Create `<Tabs>` component
-   [ ] Create `<Admonition>` component
-   [ ] Create `<CodeBlock>` component
-   [ ] Create `<ApiEndpoint>` component
-   [ ] Create `<Diagram>` component (Mermaid)
-   [ ] Document usage of each component

### Phase 4: Search and Versioning (Week 5)

-   [ ] Apply for Algolia DocSearch (open source)
-   [ ] Configure Algolia indexing
-   [ ] Create version `2.1` (current)
-   [ ] Create version `2.0` (legacy)
-   [ ] Configure old version banner

### Phase 5: Deploy and CI/CD (Week 6)

-   [ ] Configure GitHub Actions (build + deploy)
-   [ ] 🐳 Create multi-stage `Dockerfile.prod` (build + nginx)
-   [ ] 🐳 Configure Docker registry (GitHub Container Registry)
-   [ ] 🐳 Setup production docker-compose with health checks
-   [ ] Configure domain/subdomain
-   [ ] SSL/TLS certificates (Let's Encrypt)
-   [ ] Automated smoke tests

### Phase 6: Launch (Week 7)

-   [ ] Final testing (cross-browser, mobile)
-   [ ] Lighthouse audit (> 90 score)
-   [ ] Document CONTRIBUTING.md
-   [ ] Team training
-   [ ] Go-live + monitoring

## Success Metrics

### Performance Metrics

| Metric              | Baseline (MkDocs) | Target (Docusaurus) | Measurement    |
| ------------------- | ----------------- | ------------------- | -------------- |
| Build time          | 0.68s             | < 30s (full docs)   | CI logs        |
| Hot reload          | N/A               | < 200ms             | Dev experience |
| First paint         | ~2s               | < 1.5s              | Lighthouse     |
| Time to interactive | ~3.5s             | < 3s                | Lighthouse     |
| Lighthouse score    | N/A               | > 90                | CI audit       |

### Adoption Metrics

| Metric               | Target    | Timeline | Measurement       |
| -------------------- | --------- | -------- | ----------------- |
| Docs page views      | +30%      | 1 month  | Google Analytics  |
| Search queries       | 100/day   | 1 month  | Algolia Dashboard |
| Avg session duration | > 3 min   | 1 month  | Analytics         |
| Bounce rate          | < 40%     | 1 month  | Analytics         |
| Contributors         | 3+ people | 3 months | Git commits       |

## Risks and Mitigations

### R1: Migration Complexity

**Probability:** High
**Impact:** High
**Mitigation:**

-   Automatic conversion script (MkDocs → Docusaurus)
-   Incremental migration (one section at a time)
-   Keep MkDocs running until complete migration
-   Rollback plan (revert commits)

### R2: Team Learning Curve

**Probability:** Medium
**Impact:** Medium
**Mitigation:**

-   Document detailed CONTRIBUTING.md
-   2h training for team
-   Ready-to-use templates (ADR, PRD, Guide)
-   Pair programming on first contributions

### R3: Production Performance

**Probability:** Low
**Impact:** High
**Mitigation:**

-   Load testing before go-live
-   CDN for assets (Cloudflare)
-   Lazy loading of images
-   Automatic code splitting
-   Monitoring (Sentry + Google Analytics)

## Technical Decisions

### TD1: Docusaurus vs VitePress vs Nextra

**Decision:** Docusaurus
**Rationale:**

-   Better React/TypeScript integration (already used in the project)
-   Native MDX support (interactive components)
-   Robust i18n and versioning (out-of-the-box)
-   Larger community and ecosystem
-   Better documentation and support
-   Proven track record (Meta, Supabase, Stripe)

### TD2: TypeScript Config (Strict Mode)

**Decision:** `strict: true` + `noUncheckedIndexedAccess: true`
**Rationale:**

-   Type safety in components and config
-   Prevent runtime errors
-   Better IDE autocomplete
-   Aligned with project standards

### TD3: 🐳 Docker vs Native Installation

**Decision:** Docker-first with docker-compose
**Rationale:**

-   **Consistency:** Same environment in dev, staging, and production
-   **Isolation:** No conflicts with host system Node.js versions
-   **Portability:** Easy to run on any machine (Windows, macOS, Linux)
-   **CI/CD Ready:** Direct integration with GitHub Actions and registries
-   **Production-grade:** Multi-stage builds for optimized images
-   **Hot Reload:** Configured with volumes and polling for real-time updates

**Implementation:**

-   Development: `docker-compose up` with volumes for hot reload
-   Production: Multi-stage Dockerfile (build → nginx) with 80% smaller image
-   Registry: GitHub Container Registry for versioned images

### TD4: Algolia DocSearch vs Self-hosted (was TD3)

**Decision:** Algolia DocSearch (free tier) via Docker
**Rationale:**

-   Free for open source
-   Superior UX (instant search, keyboard nav)
-   No infrastructure to maintain
-   Auto-indexing via crawler
-   Multi-language support

### TD5: Deployment Strategy (was TD4)

**Decision:** 🐳 Docker + GitHub Actions + Self-hosted
**Rationale:**

-   Full control over infrastructure
-   No vendor lock-in (Vercel/Netlify)
-   Cost: $0 (runs on existing infra)
-   Easy rollback with Docker tags
-   Integrated with existing TradingSystem Docker network

## Appendix

### A. MkDocs → Docusaurus Conversion Script

````python
# scripts/migrate-mkdocs-to-docusaurus.py
import os
import re
from pathlib import Path

def convert_admonitions(content):
    # MkDocs: !!! note → Docusaurus: :::note
    content = re.sub(r'!!! (\w+)\s+"([^"]+)"', r':::\1 \2', content)
    content = re.sub(r'!!!', r':::', content)
    return content

def convert_code_blocks(content):
    # MkDocs: ```python {.line-numbers} → Docusaurus: ```python showLineNumbers
    content = re.sub(r'```(\w+)\s+{\.line-numbers}', r'```\1 showLineNumbers', content)
    return content

def migrate_file(mkdocs_path, docusaurus_path):
    with open(mkdocs_path, 'r', encoding='utf-8') as f:
        content = f.read()

    content = convert_admonitions(content)
    content = convert_code_blocks(content)

    os.makedirs(os.path.dirname(docusaurus_path), exist_ok=True)
    with open(docusaurus_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Run migration
for md_file in Path('docs/content').rglob('*.md'):
    target = Path('docs-new/docs') / md_file.relative_to('docs/content')
    migrate_file(md_file, target)
````

### B. 🐳 Docker Commands Quick Reference

**Development:**

```bash
# Start dev server with hot reload
docker-compose up docusaurus

# Rebuild after dependency changes
docker-compose build docusaurus
docker-compose up docusaurus

# Access container shell
docker exec -it tradingsystem-docs sh

# View logs
docker-compose logs -f docusaurus
```

**Production:**

```bash
# Build production image
docker build -f Dockerfile.prod -t tradingsystem-docs:latest .

# Run production container
docker-compose up docusaurus-prod

# Build multi-stage with cache
docker build -f Dockerfile.prod \
  --target production \
  --cache-from tradingsystem-docs:latest \
  -t tradingsystem-docs:v2.1.0 .

# Push to registry
docker tag tradingsystem-docs:latest ghcr.io/your-org/tradingsystem-docs:latest
docker push ghcr.io/your-org/tradingsystem-docs:latest
```

**Maintenance:**

```bash
# Clean old images
docker image prune -a --filter "until=24h"

# Update dependencies
docker-compose run --rm docusaurus npm update

# Check image size
docker images tradingsystem-docs

# Inspect container
docker inspect tradingsystem-docs
```

### C. Useful Resources

-   [Docusaurus Official Docs](https://docusaurus.io/docs)
-   [MDX Documentation](https://mdxjs.com/)
-   [Algolia DocSearch](https://docsearch.algolia.com/)
-   [React Icons](https://react-icons.github.io/react-icons/)
-   [Tailwind CSS](https://tailwindcss.com/docs)
-   [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
-   [Multi-stage Builds](https://docs.docker.com/build/building/multi-stage/)

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)

**Last updated:** 2025-10-10
