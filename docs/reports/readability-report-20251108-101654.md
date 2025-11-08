# Documentation Readability Analysis Report

**Date**: 2025-11-08 10:16:54
**Files Analyzed**: 287
**Average Score**: 14.7

## Summary

- **Files Needing Improvement**: 287 (100.0%)
- **Excellent Readability (>= 70)**: 0
- **Good Readability (60-69)**: 0
- **Needs Improvement (< 60)**: 287

## Score Distribution

| Range | Level | Count |
|-------|-------|-------|
| 90-100 | Very Easy | 0 |
| 80-89 | Easy | 0 |
| 70-79 | Fairly Easy | 0 |
| 60-69 | Standard | 0 |
| 50-59 | Fairly Difficult | 1 |
| 30-49 | Difficult | 37 |
| 0-29 | Very Difficult | 249 |

## Files Needing Most Improvement


### 1. apps/tp-capital/plan-implementation-complete.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1900 words, 163 sentences
- **Avg Words/Sentence**: 11.7
- **Long Sentences**: 13
- **Passive Voice**: 3 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 13 long sentences (> 25 words)

**Long Sentence Examples**:
- (28 words) ---
title: Plan Implementation Complete
tags: [tp-capital, autonomous-stack, deployment]
domain: bac...
- (45 words) js`
- ✅ Circuit breaker ativo (timeout 5s, threshold 50%)
- ✅ Retry logic com exponential backoff

#...
- (33 words) resolveNeonConfig() 
  : resolveTimescaleConfig();
```

**Connection via PgBouncer:**
- Host: `tp-ca...

### 2. reference/adrs/ADR-005-test-coverage-strategy.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 2458 words, 241 sentences
- **Avg Words/Sentence**: 10.2
- **Long Sentences**: 18
- **Passive Voice**: 2 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 18 long sentences (> 25 words)

**Long Sentence Examples**:
- (28 words) 8% to 80% across backend and frontend"
status: proposed
tags: [architecture, testing, quality, ci-cd...
- (40 words) 8% to 80% across backend and frontend"
owner: ArchitectureGuild
lastReviewed: "2025-11-02"
last_revi...
- (30 words) md):
- **Quality Grade:** C (Needs significant improvement)
- **Priority:** P1 (Critical)
- **Effort...

### 3. reference/adrs/009-tp-capital-neon-vs-timescale.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1142 words, 54 sentences
- **Avg Words/Sentence**: 21.1
- **Long Sentences**: 15
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)
- Reduce 15 long sentences (> 25 words)

**Long Sentence Examples**:
- (77 words) ---
title: "ADR-009: TP-Capital Database Choice - Neon vs TimescaleDB"
tags: [adr, architecture, dat...
- (52 words) 000 sinais/dia
- Dashboard queries: ~240 req/min (1 req/15s)

**Queries típicas:**
```sql
-- Dashboa...
- (65 words) Arquitetura

| Aspecto | TimescaleDB | Neon | Vantagem |
|---------|-------------|------|----------|...

### 4. reference/adrs/ADR-003-api-gateway-implementation.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1179 words, 55 sentences
- **Avg Words/Sentence**: 21.4
- **Long Sentences**: 11
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)
- Reduce 11 long sentences (> 25 words)

**Long Sentence Examples**:
- (130 words) ---
title: "ADR-003: API Gateway Implementation for Centralized Authentication and Routing"
date: 20...
- (30 words) **Security Gaps:**
   - No inter-service authentication (services trust each other blindly)
   - Inc...
- (26 words) **Operational Complexity:**
   - CORS configuration duplicated across 6+ services
   - Rate limiting...

### 5. reference/architecture/containerization.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1231 words, 90 sentences
- **Avg Words/Sentence**: 13.7
- **Long Sentences**: 11
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 11 long sentences (> 25 words)

**Long Sentence Examples**:
- (50 words) ---
title: Estratégia de Containerização
description: Estratégia de containerização para serviços Tr...
- (37 words) js: **3 de 6 rodando** (50%)

- ✅ **Workspace API** (Port 3200) - CRUD Idea Bank
- ✅ **TP Capital** ...
- (29 words) **Workspace API** (Port 3200) - **ALTA PRIORIDADE**

**Justificativa**:

- ✅ Stateless API (CRUD sim...

### 6. reference/adrs/rag-services/ADR-002-file-watcher-auto-ingestion.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1068 words, 69 sentences
- **Avg Words/Sentence**: 15.5
- **Long Sentences**: 9
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 9 long sentences (> 25 words)

**Long Sentence Examples**:
- (118 words) ---
title: "ADR-002: File Watcher Auto-Ingestion Architecture"
sidebar_position: 2
description: "Dec...
- (93 words) Verify changes in dashboard

This creates:
- **Human error**: Forgotten ingestions lead to stale sea...
- (158 words) js service using Chokidar library, monitors configured directories

**Pros**:
- ✅ Real-time detectio...

### 7. reference/adrs/rag-services/ADR-001-redis-caching-strategy.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 867 words, 42 sentences
- **Avg Words/Sentence**: 20.6
- **Long Sentences**: 7
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)
- Reduce 7 long sentences (> 25 words)

**Long Sentence Examples**:
- (103 words) ---
title: "ADR-001: Redis Caching Strategy for Collection Stats"
sidebar_position: 1
description: "...
- (252 words) )

This resulted in:
- **20ms response times** for simple collection lists
- **Increased load** on Q...
- (33 words) ts`):
```typescript
export class CacheService {
  private redisClient: RedisClientType | null = null...

### 8. tools/security-config/p0-security-implementation.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 310 words, 23 sentences
- **Avg Words/Sentence**: 13.5
- **Long Sentences**: 3
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences

**Long Sentence Examples**:
- (32 words) js`
- **Security:** Constant-time comparison (prevents timing attacks)
- **Protection:** All `/sync-...
- (32 words) env << 'EOF'
TELEGRAM_SESSION_ENCRYPTION_KEY=9df9d6d129462c5ac7201268740fcf2cc69cb5621d3cec9e91d79ed...
- (46 words) md`

---

## ✅ Security Improvements

| Aspect | Before | After |
|--------|--------|-------|
| Sess...

### 9. tools/rag/integration-guide-rag-crud.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 892 words, 80 sentences
- **Avg Words/Sentence**: 11.2
- **Long Sentences**: 5
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences

**Long Sentence Examples**:
- (103 words) tsx (por volta da linha 500-600):

```tsx
// Exemplo de onde adicionar:
<CollapsibleCard
  id="inges...
- (166 words) **Verificar imports:**
Certifique-se que todos os componentes estão acessíveis:
- ✅ CollectionsManag...
- (42 words) /CollectionsManagementCard';
```

### Problema: "Modelos não aparecem no seletor"

**Causa:** Backen...

### 10. tools/docker/container-inventory.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 311 words, 11 sentences
- **Avg Words/Sentence**: 28.3
- **Long Sentences**: 5
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)

**Long Sentence Examples**:
- (46 words) "
tags:
  - tools
  - docker
  - ops
owner: OpsGuild
lastReviewed: '2025-11-02'
---
# 📊 Inventário d...
- (34 words) | Container | Imagem | Status | Tipo |
|-----------|--------|--------|------|
| `data-questdb` | `qu...
- (81 words) ` | ⏱️ 12 horas | ✅ Healthy |

---

## 🕷️ FIRECRAWL (Web Scraping)

| Container | Imagem | Status | ...

### 11. tools/documentation/docusaurus/ports-strategy.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 483 words, 45 sentences
- **Avg Words/Sentence**: 10.7
- **Long Sentences**: 4
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences

**Long Sentence Examples**:
- (54 words) 0

---

## 🎯 Estratégia Unificada

### Porta Padrão: **3400**

A porta **3400** é o padrão oficial e...
- (71 words) yml up -d documentation
```

- **NGINX** servindo build estático
- **Build otimizado** (`docs/build/...
- (140 words) json`

```json
{
  "id": "docusaurus",
  "port": 3400,
  "start": "npm start -- --port 3400"
}
```

...

### 12. tools/documentation/docusaurus/quick-commands.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1341 words, 116 sentences
- **Avg Words/Sentence**: 11.6
- **Long Sentences**: 12
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 12 long sentences (> 25 words)

**Long Sentence Examples**:
- (153 words) "
tags:
  - tools
  - docusaurus
  - scripts
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Quick C...
- (48 words) docusaurus build

npm run docs:build
```

---

### Update Dependencies

```bash
cd /home/marce/Proje...
- (35 words) {md,mdx} 2>/dev/null
```

---

## 📊 Health Check

### Quick Health Check

```bash
cd /home/marce/Pro...

### 13. tools/documentation/docusaurus/deployment-guide.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1659 words, 136 sentences
- **Avg Words/Sentence**: 12.2
- **Long Sentences**: 15
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 15 long sentences (> 25 words)

**Long Sentence Examples**:
- (85 words) "
tags:
  - tools
  - docusaurus
  - deployment
owner: DocsOps
lastReviewed: '2025-11-02'
---
# Docu...
- (71 words) Copy to Web Server

**Option A: Local NGINX**

```bash
# Copy build to NGINX directory
sudo cp -r bu...
- (36 words) html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_head...

### 14. tools/runtime/python/bash-vs-venv.md

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 628 words, 44 sentences
- **Avg Words/Sentence**: 14.3
- **Long Sentences**: 7
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 7 long sentences (> 25 words)

**Long Sentence Examples**:
- (32 words) ---
title: "Bash Vs Venv"
tags: [documentation]
domain: devops
type: guide
summary: "Documentation f...
- (32 words) ---

## 🎯 Como Funciona Agora

### **Clicar no "+" (Novo Terminal):**

```
Clique no "+" → Abre bash...
- (47 words) venv**

- **Ícone:** 🐍 Cobra verde
- **Ativação:** Clique na ▼ → Selecione "venv"
- **Uso:** Desenvo...

### 15. reports/governance-status.mdx

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 89 words, 4 sentences
- **Avg Words/Sentence**: 22.2
- **Long Sentences**: 1
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)

**Long Sentence Examples**:
- (61 words) 485Z**

## Freshness Distribution
| Status | Count |
|--------|-------|
| Healthy | 68 |
| Warning |...

### 16. database/overview.mdx

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 941 words, 24 sentences
- **Avg Words/Sentence**: 39.2
- **Long Sentences**: 9
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)
- Reduce 9 long sentences (> 25 words)

**Long Sentence Examples**:
- (105 words) ### Current Architecture

- **TimescaleDB (Production)**  
  Primary relational storage for TP Capit...
- (46 words) json`  
  Limitations: No concurrency, no transactions, file-based writes  
  Status: ⚠️ Active (MVP...
- (73 words) ✅ **Workspace API** – Containerized with TimescaleDB hypertables

**Pending Migrations**:

- ⏳ **Ide...

### 17. api/alert-router.mdx

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1301 words, 47 sentences
- **Avg Words/Sentence**: 27.7
- **Long Sentences**: 15
- **Passive Voice**: 5 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)
- Reduce 15 long sentences (> 25 words)

**Long Sentence Examples**:
- (57 words) ---
title: Alert Router
sidebar_label: Alert Router
sidebar_position: 4
description: Prometheus aler...
- (80 words) ### Key Features

- **Automated Issue Creation**: Creates GitHub issues for firing alerts
- **Issue ...
- (44 words) js, Octokit (GitHub API), Pino |

## Architecture

```
┌──────────────────────────────────────────┐
...

### 18. api/documentation-api.mdx

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 778 words, 29 sentences
- **Avg Words/Sentence**: 26.8
- **Long Sentences**: 10
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)
- Reduce 10 long sentences (> 25 words)

**Long Sentence Examples**:
- (26 words) tags:
  - api
  - documentation
  - search
  - crud
owner: DocsOps
lastReviewed: '2025-10-26'
slug: ...
- (75 words) ### Key Features

- **Multi-tenancy**: Manage multiple documentation systems with isolated namespace...
- (71 words) local/api/documentation` |
| **Repository** | `backend/api/documentation-api/` |
| **Database** | Qu...

### 19. api/data-capture.mdx

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 661 words, 26 sentences
- **Avg Words/Sentence**: 25.4
- **Long Sentences**: 4
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Break down long sentences (average > 20 words)

**Long Sentence Examples**:
- (142 words) NET 8 / C#
- **Port**: 3100
- **Base URL**: `http://localhost:3100/api`
- **Status**: MVP (planned i...
- (42 words) yaml`
- Redoc URL: `/redoc/data-capture` (once automated build exists)
- Source code: `backend/servi...
- (173 words) /tools/trading/profitdll/assets-format`
- TODO: Link official ProfitDLL PDF manual once added to rep...

### 20. api/telegram-gateway-api.mdx

- **Score**: 0 (Very Difficult (College graduate))
- **Metrics**: 1157 words, 67 sentences
- **Avg Words/Sentence**: 17.3
- **Long Sentences**: 13
- **Passive Voice**: 0 occurrences

**Recommendations**:
- Simplify complex sentences
- Reduce 13 long sentences (> 25 words)

**Long Sentence Examples**:
- (46 words) ---
title: Telegram Gateway API
sidebar_label: Telegram Gateway API
sidebar_position: 9
description:...
- (78 words) ### Key Features

- **Message Retrieval**: Query messages with filtering by channel, date range, and...
- (43 words) js, Pino, Prometheus Client |

## Architecture

```
┌───────────────────────────────────────────────...


## Improvement Guidelines

### Target Readability Scores
- **Technical Documentation**: 60-70 (Standard - Fairly Easy)
- **User Guides**: 70-80 (Fairly Easy - Easy)
- **Tutorials**: 80-90 (Easy - Very Easy)

### Writing Tips
1. **Shorten Sentences**: Aim for 15-20 words per sentence
2. **Use Active Voice**: Replace "was done by" with "did"
3. **Simplify Vocabulary**: Use common words over technical jargon where possible
4. **Break Paragraphs**: Keep paragraphs under 3-4 sentences
5. **Add Examples**: Concrete examples improve understanding
6. **Use Lists**: Break complex information into bullet points

---

*Generated by Documentation Readability Analyzer*
