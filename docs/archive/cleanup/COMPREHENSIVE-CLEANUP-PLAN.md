# Comprehensive Cleanup Plan - TradingSystem

**Date:** 2025-11-13
**Scope:** Complete project cleanup analysis

---

## 📊 Executive Summary

Análise completa identificou **~188MB** de arquivos potencialmente removíveis:

- **176MB** - `/outputs/` (arquivos temporários e logs)
- **9.9MB** - `/backups/` (backups antigos)
- **1.3MB** - `/logs/` (logs de monitoramento)
- **636KB** - `/docs/archive/` (documentação arquivada)

---

## 🎯 Oportunidades de Limpeza

### 1. 🗂️ Pasta `/outputs/` (176MB) - ALTA PRIORIDADE

**Conteúdo:**
```
137MB - course-crawler/        (62 pastas UUID, dados temporários)
37MB  - github-actions/         (13 pastas com logs de workflows)
1.8MB - logs/                   (logs de docker e docs)
436KB - governance/             (relatórios temporários)
360KB - reports/                (relatórios CI/CD)
184KB - waha/                   (dados temporários)
76KB  - env-backups/            (backups de .env)
24KB  - crawler-course-meta/    (metadados temporários)
```

**Ação Recomendada:**
```bash
# OPÇÃO A: Limpeza Agressiva (remove tudo, mantém README)
rm -rf outputs/course-crawler/*
rm -rf outputs/github-actions/*
rm -rf outputs/logs/*
rm -rf outputs/governance/*
rm -rf outputs/reports/*

# OPÇÃO B: Limpeza Conservadora (mantém últimos 7 dias)
find outputs/ -type f -mtime +7 ! -name "README.md" -delete

# OPÇÃO C: Archive e limpa (backup antes de remover)
tar -czf outputs-archive-$(date +%Y%m%d).tar.gz outputs/
rm -rf outputs/*
```

**Justificativa:**
- ✅ Dados temporários/logs de desenvolvimento
- ✅ Dados de course-crawler (sistema descontinuado?)
- ✅ Logs de GitHub Actions (disponíveis no GitHub)
- ✅ Relatórios CI/CD antigos
- ✅ Não afeta funcionalidade do sistema

---

### 2. 💾 Pasta `/backups/` (9.9MB) - MÉDIA PRIORIDADE

**Conteúdo:**
```
9.7MB - tp-capital-pg15-backup-20251111-112448.tar.gz
0     - tp-capital-pg15-dump-20251111-112453.sql (vazio)
4KB   - workflow-cleanup-2025-11-13/ (backup recente)
```

**Ação Recomendada:**
```bash
# Mover backup antigo para storage externo/S3
# Manter apenas backup recente (< 7 dias)
rm backups/tp-capital-pg15-backup-20251111-112448.tar.gz
rm backups/tp-capital-pg15-dump-20251111-112453.sql

# Ou mover para pasta de arquivos históricos
mkdir -p ~/archives/tradingsystem-backups/
mv backups/tp-capital-pg15-* ~/archives/tradingsystem-backups/
```

**Justificativa:**
- ✅ Backup de migração PG15→PG16 já concluída
- ✅ Arquivo .sql vazio (0 bytes)
- ✅ Dados recuperáveis de outros backups/banco atual
- ⚠️ Manter backup recente workflow-cleanup

---

### 3. 📝 Pasta `/logs/` (1.3MB) - BAIXA PRIORIDADE

**Conteúdo:**
```
1.3MB - health-monitoring/*.log  (5 arquivos de monitoramento)
```

**Ação Recomendada:**
```bash
# Implementar rotação de logs
# Manter apenas últimos 7 dias
find logs/ -name "*.log" -mtime +7 -delete

# Ou comprimir logs antigos
find logs/ -name "*.log" -mtime +7 -exec gzip {} \;
```

**Justificativa:**
- ✅ Logs de monitoramento acumulados
- ✅ Sistema deve ter rotação automática
- ⚠️ Útil para debugging, manter últimos dias

---

### 4. 📚 Pasta `/docs/archive/` (636KB) - BAIXA PRIORIDADE

**Ação:** **MANTER**

**Justificativa:**
- ❌ Documentação arquivada pode ter valor histórico
- ❌ Tamanho pequeno (636KB)
- ✅ Já está organizada em archive/

---

### 5. 📄 Arquivos `.md` na Raiz - MÉDIA PRIORIDADE

**Arquivos Identificados:**
```
45KB - CLAUDE.md                      ✅ MANTER (doc principal)
31KB - plano_melhoria_tradingsystem.md ⚠️ AVALIAR
24KB - README.md                       ✅ MANTER (doc principal)
20KB - AGENTS.md                       ✅ MANTER (symlink to CLAUDE.md)
11KB - SCRIPT-CLEANUP-PROPOSAL.md      ❌ MOVER para docs/
4.9KB - WORKFLOW-CLEANUP-PLAN.md       ❌ MOVER para docs/
3.1KB - CONTRIBUTING.md                ✅ MANTER (padrão GitHub)
2.7KB - QUICK-START.md                 ✅ MANTER (onboarding)
```

**Ação Recomendada:**
```bash
# Mover propostas/planos para docs/
mv SCRIPT-CLEANUP-PROPOSAL.md docs/archive/cleanup/
mv WORKFLOW-CLEANUP-PLAN.md docs/archive/cleanup/

# Avaliar se plano_melhoria_tradingsystem.md ainda é relevante
# Se obsoleto, mover para docs/archive/planning/
mv plano_melhoria_tradingsystem.md docs/archive/planning/
```

**Justificativa:**
- ✅ Propostas/planos devem estar em docs/
- ✅ Raiz deve ter apenas docs essenciais
- ✅ Organização melhor para histórico

---

### 6. 🗄️ Arquivos de Configuração na Raiz - ANÁLISE

**Arquivos Identificados:**
```
.service-tokens.json       ⚠️ Verificar se em uso
user-settings-global.json  ⚠️ Verificar se em uso
pyrightconfig.json         ✅ MANTER (Python type checking)
openapitools.json          ✅ MANTER (OpenAPI config)
```

**Ação Recomendada:**
```bash
# Verificar se .service-tokens.json está em uso
grep -r "service-tokens" . --exclude-dir=node_modules

# Verificar se user-settings-global.json está em uso
grep -r "user-settings-global" . --exclude-dir=node_modules

# Se não utilizados, remover ou mover para config/
```

---

### 7. 🐳 Arquivos Docker Compose (41 arquivos) - ANÁLISE

**Distribuição:**
- `tools/compose/` - Maioria dos composes
- Raiz e subpastas - Alguns duplicados?

**Ação Recomendada:**
```bash
# Identificar duplicados
find . -name "docker-compose*.yml" ! -path "*/node_modules/*" -exec md5sum {} \; | sort | uniq -w32 -D

# Consolidar em tools/compose/ se duplicados encontrados
```

---

## 📋 Plano de Execução Recomendado

### Fase 1: Limpeza Segura (Zero Risco) - **~186MB**

```bash
# 1. Limpar outputs/ (176MB)
cd /workspace
tar -czf outputs-backup-$(date +%Y%m%d).tar.gz outputs/
rm -rf outputs/course-crawler/*
rm -rf outputs/github-actions/*
rm -rf outputs/logs/*
rm -rf outputs/governance/*
rm -rf outputs/reports/*
echo "📁 Mantendo estrutura de pastas" > outputs/.gitkeep

# 2. Limpar backups antigos (9.7MB)
mkdir -p ~/archives/tradingsystem/
mv backups/tp-capital-pg15-* ~/archives/tradingsystem/

# 3. Rotacionar logs (preservar últimos 7 dias)
find logs/ -name "*.log" -mtime +7 -delete

# Space saved: ~186MB
```

### Fase 2: Organização de Arquivos (Zero Risco)

```bash
# Mover propostas para docs/
mkdir -p docs/archive/cleanup
mv SCRIPT-CLEANUP-PROPOSAL.md docs/archive/cleanup/
mv WORKFLOW-CLEANUP-PLAN.md docs/archive/cleanup/

# Mover plano de melhoria (se obsoleto)
mkdir -p docs/archive/planning
mv plano_melhoria_tradingsystem.md docs/archive/planning/
```

### Fase 3: Validação de Configurações (Investigação)

```bash
# Verificar arquivos .json não utilizados
grep -r "service-tokens" . --exclude-dir=node_modules
grep -r "user-settings-global" . --exclude-dir=node_modules

# Identificar docker-compose duplicados
find . -name "docker-compose*.yml" ! -path "*/node_modules/*" -exec md5sum {} \;
```

---

## ✅ Resultado Esperado

### Space Savings

**Total Potencial:** ~188MB

| Item | Antes | Depois | Economia |
|------|-------|--------|----------|
| `/outputs/` | 176MB | ~1MB | 175MB |
| `/backups/` | 9.9MB | 4KB | 9.9MB |
| `/logs/` | 1.3MB | ~500KB | 800KB |
| **TOTAL** | **187.2MB** | **~1.5MB** | **~186MB** |

### Organization Improvements

- ✅ Raiz mais limpa (4 arquivos .md movidos)
- ✅ Documentação melhor organizada
- ✅ Estrutura de pastas preservada
- ✅ Zero breaking changes

---

## 🚦 Recomendação de Execução

**ORDEM SEGURA:**

1. ✅ **Fase 1** - Limpeza de outputs/ e backups (SAFE - dados temporários)
2. ✅ **Fase 2** - Organização de arquivos .md (SAFE - apenas move)
3. ⚠️ **Fase 3** - Validação de configs (INVESTIGAR primeiro)

**NUNCA executar tudo de uma vez!** Validar cada fase.

---

## 📝 Checklist de Execução

### Pré-Limpeza
- [ ] Backup criado (`outputs-backup-YYYYMMDD.tar.gz`)
- [ ] Git status limpo (sem mudanças pendentes)
- [ ] Revisão dos arquivos a serem removidos

### Fase 1: Limpeza
- [ ] outputs/course-crawler/* removido
- [ ] outputs/github-actions/* removido
- [ ] outputs/logs/* limpo
- [ ] backups antigos movidos
- [ ] logs rotacionados

### Fase 2: Organização
- [ ] SCRIPT-CLEANUP-PROPOSAL.md → docs/archive/cleanup/
- [ ] WORKFLOW-CLEANUP-PLAN.md → docs/archive/cleanup/
- [ ] plano_melhoria_tradingsystem.md avaliado

### Fase 3: Validação
- [ ] .service-tokens.json verificado
- [ ] user-settings-global.json verificado
- [ ] docker-compose duplicados identificados

### Pós-Limpeza
- [ ] Git commit criado
- [ ] Validação de health checks
- [ ] Documentação atualizada

---

## 🔄 Manutenção Contínua

### Implementar Rotação Automática

**Logs:**
```bash
# Adicionar ao cron (diário)
0 2 * * * find /workspace/logs -name "*.log" -mtime +7 -delete
```

**Outputs:**
```bash
# Adicionar ao cron (semanal)
0 3 * * 0 find /workspace/outputs -type f -mtime +30 -delete
```

**Backups:**
```bash
# Política: Manter apenas últimos 3 backups
# Implementar script de rotação
```

---

## 📖 Referências

- **outputs/README.md** - Documentação da pasta outputs
- **CLAUDE.md** - Instruções gerais do projeto
- **governance/** - Políticas de retenção de dados

---

**Pronto para executar?** Aguardando aprovação para Fase 1.
