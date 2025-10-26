# Proposal: Docker Security & Performance Optimization

## Why

A análise do **docker-health-optimizer** agent revelou problemas críticos na infraestrutura Docker do projeto que requerem ação imediata:

### Problemas Críticos Identificados

1. **SEGURANÇA CRÍTICA**: Senhas hardcoded expostas em compose files
   - Arquivo: `tools/compose/docker-compose.database.yml:12`
   - Senha PostgreSQL: `axA7d0kgjBezRw0mRlj9tOnHRBKgmZsL` (hardcoded)
   - **Violação**: CLAUDE.md requer "Never commit credentials"
   - **Risco**: Senha exposta no git history, acesso não autorizado ao banco

2. **Inconsistência de Configuração**: Carregamento misto de environment files
   - Alguns compose files usam `../../config/docker.env`
   - Projeto requer: "ALL containers MUST reference root .env" (CLAUDE.md)
   - **Impacto**: Configuração fragmentada, dificulta manutenção

3. **Desperdício de Recursos**: ~5GB recuperáveis em recursos órfãos
   - 27 volumes dangling (~800MB)
   - 17 imagens dangling (~3.5GB)
   - Múltiplas networks órfãs
   - **Impacto**: Espaço em disco desperdiçado, builds lentos

4. **Despreparado para Produção**: Sem estratégia de imagens otimizadas
   - Imagens atuais: 481MB (workspace), 424MB (tp-capital)
   - Sem Dockerfile.prod multi-stage
   - **Impacto**: Impossível fazer deploy eficiente no futuro

## What Changes

### 1. CRÍTICO: Segurança (Prioridade Máxima)

#### 1.1 Remover Senhas Hardcoded
- **BREAKING**: Substituir `POSTGRES_PASSWORD: axA7d0kgjBezRw0mRlj9tOnHRBKgmZsL`
- Por: `POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}`
- Validar que `.env` possui a variável necessária
- Testar reconexão de todos serviços dependentes

#### 1.2 Padronizar Carregamento de ENV
- **BREAKING**: Mudar `env_file: ../../config/docker.env`
- Para: `env_file: ../../.env` (padrão do projeto)
- Aplicar em TODOS compose files:
  - `tools/compose/docker-compose.database.yml`
  - `tools/compose/docker-compose.apps.yml`
  - `tools/compose/docker-compose.docs.yml`
  - `tools/compose/docker-compose.infrastructure.yml`
  - `tools/compose/docker-compose.firecrawl.yml`
  - `tools/monitoring/docker-compose.yml`

### 2. IMPORTANTE: Otimização de Recursos

#### 2.1 Limpeza de Volumes Dangling
- Executar `docker volume prune -f`
- Liberar ~800MB
- Validar zero volumes ativos removidos

#### 2.2 Limpeza de Images Dangling
- Executar `docker image prune -f`
- Liberar ~3.5GB
- Validar zero imagens em uso removidas

#### 2.3 Limpeza de Networks Órfãs
- Executar `docker network prune -f`
- Remover networks sem containers ativos

### 3. PREPARAÇÃO: Dockerfiles de Produção

#### 3.1 Criar Multi-Stage Dockerfiles
- `backend/api/workspace/Dockerfile.prod`
- `apps/tp-capital/api/Dockerfile.prod`

**Características:**
- Base: `node:18-alpine` (vs `node:18` atual)
- Multi-stage build (dependencies → builder → production)
- Production deps only (~120MB vs ~300MB)
- Non-root user (nodejs:1001)
- Healthcheck integrado
- Tamanho final: ~200MB (vs 481MB atual = 58% menor)

#### 3.2 Adicionar .dockerignore
- `backend/api/workspace/.dockerignore`
- `apps/tp-capital/api/.dockerignore`

**Excluir:**
```
node_modules/
npm-debug.log
.git/
.env
.DS_Store
coverage/
.vscode/
*.md
docker-compose*.yml
Dockerfile*
tests/
```

## Impact

### Breaking Changes

**BREAKING 1**: Docker Compose Files Requerem Root .env

- **Before**: Variables could be in `config/docker.env` OR `.env`
- **After**: ALL services MUST load from root `.env`
- **Migration**:
  ```bash
  # Validate .env has all required variables
  grep -E "TIMESCALEDB_PASSWORD|TIMESCALEDB_USER|TIMESCALEDB_DB" .env

  # Test each stack
  docker compose -f tools/compose/docker-compose.database.yml restart
  ```

**BREAKING 2**: Hardcoded Password Removed

- **Before**: `POSTGRES_PASSWORD: axA7d0kgjBezRw0mRlj9tOnHRBKgmZsL` (hardcoded)
- **After**: `POSTGRES_PASSWORD: ${TIMESCALEDB_PASSWORD}` (from .env)
- **Migration**:
  ```bash
  # Add to .env if not present
  echo "TIMESCALEDB_PASSWORD=axA7d0kgjBezRw0mRlj9tOnHRBKgmZsL" >> .env

  # Restart TimescaleDB
  docker compose -f tools/compose/docker-compose.database.yml restart timescaledb
  ```

### Affected Components

| Component | Impact Level | Change Description |
|-----------|-------------|-------------------|
| **docker-compose.database.yml** | CRITICAL | Remove hardcoded password (line 12) |
| **docker-compose.apps.yml** | HIGH | Change env_file reference |
| **docker-compose.docs.yml** | HIGH | Change env_file reference |
| **docker-compose.infrastructure.yml** | HIGH | Change env_file reference |
| **docker-compose.firecrawl.yml** | HIGH | Change env_file reference |
| **monitoring/docker-compose.yml** | HIGH | Change env_file reference |
| **workspace service** | MEDIUM | Add Dockerfile.prod (not activated) |
| **tp-capital service** | MEDIUM | Add Dockerfile.prod (not activated) |
| **Documentation** | LOW | Update CLAUDE.md, add ADR |

### Benefits

✅ **Security Improved**
- Zero credentials in version control
- Aligns with CLAUDE.md security requirements
- Enables easy password rotation

✅ **Configuration Simplified**
- Single source of truth (root .env)
- Easier onboarding (one file to configure)
- Reduced configuration drift

✅ **Disk Space Recovered**
- ~5GB liberated (800MB volumes + 3.5GB images)
- Faster builds (less dangling layers)
- Cleaner development environment

✅ **Production Ready**
- Dockerfile.prod prepared (60% smaller images)
- Multi-stage build best practices
- Security hardened (non-root user)

### Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|-----------|
| Containers fail after env change | MEDIUM | HIGH | Test each stack individually, keep backup |
| Remove active volumes by mistake | LOW | CRITICAL | Validate `docker volume ls` before prune |
| Missing env vars in .env | LOW | HIGH | Audit all compose files for required vars |
| TimescaleDB connection broken | LOW | HIGH | Test connection after password change |

**Rollback Plan:**
```bash
# If anything breaks
git checkout HEAD -- tools/compose/
docker compose -f tools/compose/docker-compose.database.yml restart
```

## Compatibility

- ✅ **Backward Compatible**: Portas mantidas (todas as portas atuais)
- ✅ **Backward Compatible**: Container names inalterados
- ✅ **Backward Compatible**: Dockerfile.dev não modificado
- ⚠️ **Breaking**: Compose files requerem .env atualizado
- ⚠️ **Breaking**: Senha hardcoded removida (requer variável)
- ✅ **Forward Compatible**: Dockerfile.prod preparado para futuro

## Timeline

**Estimated Effort**: 4-5 hours (incluindo validação e testes)

**Phases**:
1. **OpenSpec Scaffold** (1h): Criar proposal, tasks, design, specs
2. **Validation** (15min): `openspec validate --strict`
3. **CRITICAL: Security Fix** (30min): Remove hardcoded passwords
4. **Standardization** (30min): Unify env_file loading
5. **Cleanup** (15min): Prune dangling resources
6. **Production Prep** (1h): Create Dockerfile.prod (optional - can defer)
7. **Documentation** (30min): Update CLAUDE.md, create ADR
8. **Final Validation** (30min): Health checks, openspec validation

## Open Questions

1. ✅ **Decidido**: Criar Dockerfile.prod agora ou adiar?
   - **Decision**: Criar agora (preparação), mas não ativar (manter Dockerfile.dev)
   - **Rationale**: Baixo custo (~1h), alto benefício futuro

2. ✅ **Decidido**: Limpar resources agora é seguro?
   - **Decision**: Sim, com validação prévia
   - **Validation**: Confirmar zero volumes/images ativos antes de prune

3. ⚠️ **Pendente**: Adicionar resource limits agora?
   - **Recommendation**: Não (adiar para próxima fase)
   - **Rationale**: Uso atual é saudável (<2% CPU, ~1GB RAM)

## Success Metrics

### Implementation Success
- ✅ Zero senhas hardcoded em compose files (validated via grep)
- ✅ Todos compose files usam `env_file: ../../.env` (validated via grep)
- ✅ ~5GB de espaço liberado (`docker system df` before/after)
- ✅ Dockerfile.prod criado e build passa (test: `docker build -f Dockerfile.prod .`)
- ✅ `openspec validate --strict` passa sem erros
- ✅ Health check all passa (todos containers healthy)

### Post-Deploy Monitoring
- Container restart count < 1/dia (mesmo que antes)
- Nenhuma regressão em response times (<100ms p95)
- TimescaleDB connection errors = 0
- Disk space growth < 1GB/mês (vs atual sem limite)

## References

### Affected Specifications
- `specs/docker-infrastructure/spec.md` (MODIFIED: Security + env loading)
- `specs/container-optimization/spec.md` (ADDED: Production dockerfiles)

### Related Changes
- `containerize-tp-capital-workspace` (completed) - Base infrastructure
- This change: Security hardening + production preparation

### Affected Documentation
- `CLAUDE.md` (update Docker guidelines)
- `docs/content/tools/docker/` (new: production dockerfile guide)
- Future ADR: `ADR-00X-docker-security-optimization.md`

### External References
- Docker Health Optimizer Report (2025-10-26)
- CLAUDE.md: Environment Variables Configuration
- CLAUDE.md: Security & Configuration

---

**Status**: 🟡 Proposal Stage (awaiting approval)
**Author**: Claude Code AI Agent (docker-health-optimizer analysis)
**Date**: 2025-10-26
**Change ID**: `optimize-docker-security-performance`
**Priority**: CRITICAL (security) + HIGH (optimization)
