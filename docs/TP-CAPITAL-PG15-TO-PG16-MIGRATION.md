# TP Capital - Migração PostgreSQL 15 → 16

**Data:** 2025-11-11
**Status:** 🔧 **REQUER AÇÃO DO USUÁRIO**

---

## 🎯 Problema Identificado

O TP Capital stack não inicia devido a **incompatibilidade de versão do PostgreSQL**:

```
FATAL: database files are incompatible with server
DETAIL: The data directory was initialized by PostgreSQL version 15,
        which is not compatible with this version 16.10.
```

### Causa Raiz

- **Volume existente:** Criado em 2025-10-26 com PostgreSQL 15
- **Compose file atual:** Usa `timescale/timescaledb:latest-pg16`
- **Incompatibilidade:** PostgreSQL não permite downgrades/upgrades diretos no mesmo volume

---

## ✅ Solução: Script de Migração Automatizado

Foi criado um script que realiza a migração de forma **segura e automatizada**:

**Script:** `scripts/docker/tp-capital-pg15-to-pg16-migration.sh`

### O que o script faz:

1. ✅ **Para containers** existentes
2. ✅ **Cria backup completo** do volume PG15 (`.tar.gz`)
3. ✅ **Cria dump SQL** do banco de dados
4. ✅ **Inicia container PG15 temporário** para extração
5. ⚠️  **Remove volume antigo** (após confirmação)
6. ✅ **Cria novo volume** para PG16
7. ✅ **Inicia PG16** e restaura dados
8. ✅ **Verifica integridade** dos dados
9. ✅ **Inicia stack completa** (5 containers)

---

## 🚀 Como Executar

### Passo 1: Executar Script de Migração

```bash
cd /home/marce/Projetos/TradingSystem
bash scripts/docker/tp-capital-pg15-to-pg16-migration.sh
```

**O script irá:**
- Solicitar confirmação antes de remover o volume antigo
- Criar backups em `backups/` (volume `.tar.gz` + dump `.sql`)
- Restaurar dados no novo PG16
- Iniciar todos os containers

**Tempo estimado:** 3-5 minutos

### Passo 2: Verificar Migração

Após a execução, verificar:

```bash
# 1. Containers healthy
docker ps --filter "label=com.tradingsystem.stack=tp-capital"

# 2. Verificar dados
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c '\dt'

# 3. Testar API
curl http://localhost:4005/health
```

---

## 📦 Backups Criados

O script cria **2 backups** automáticos:

### 1. Backup do Volume (`.tar.gz`)

**Localização:** `backups/tp-capital-pg15-backup-YYYYMMDD-HHMMSS.tar.gz`

**Uso:** Restauração completa do volume PG15 caso necessário

```bash
# Restaurar volume completo (se necessário)
docker volume create tp-capital-timescaledb-data-pg15
docker run --rm \
  -v tp-capital-timescaledb-data-pg15:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/tp-capital-pg15-backup-YYYYMMDD-HHMMSS.tar.gz -C /
```

### 2. Dump SQL (`.sql`)

**Localização:** `backups/tp-capital-pg15-dump-YYYYMMDD-HHMMSS.sql`

**Uso:** Restauração de dados em qualquer versão do PostgreSQL

```bash
# Restaurar apenas dados (se necessário)
cat backups/tp-capital-pg15-dump-YYYYMMDD-HHMMSS.sql | \
  docker exec -i tp-capital-timescale psql -U tp_capital -d tp_capital_db
```

---

## 🔧 Troubleshooting

### Script falha no Step 3 (PG15 temp não inicia)

**Problema:** Container PG15 temporário não consegue iniciar

**Solução:**
```bash
# Verificar logs
docker logs tp-capital-pg15-temp

# Se houver corrupção, usar backup direto
docker volume rm tp-capital-timescaledb-data
docker volume create tp-capital-timescaledb-data

# Restaurar do backup tar.gz
docker run --rm \
  -v tp-capital-timescaledb-data:/data \
  -v $(pwd)/backups:/backup \
  alpine tar xzf /backup/tp-capital-pg15-backup-*.tar.gz -C /
```

### Migração concluída mas sem dados

**Problema:** `SELECT COUNT(*)` retorna 0 tabelas

**Diagnóstico:**
```bash
# Verificar se dump tem dados
wc -l backups/tp-capital-pg15-dump-*.sql

# Verificar schemas
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c '\dn'
```

**Solução:**
Se dump está vazio, o banco original não tinha dados. Isso é **normal** se for primeiro uso.

### Containers não ficam healthy

**Problema:** Após migração, containers ficam unhealthy

**Diagnóstico:**
```bash
# Verificar logs de cada container
docker logs tp-capital-timescale
docker logs tp-capital-pgbouncer
docker logs tp-capital-redis-master
docker logs tp-capital-api
```

**Solução mais comum:**
- PgBouncer: Aguardar TimescaleDB ficar healthy primeiro
- Redis: Verificar se porta 6379 está disponível
- API: Verificar variáveis de ambiente

---

## 🔄 Rollback (Se Necessário)

Se a migração falhar e você quiser voltar para PG15:

### Opção 1: Restaurar Volume Completo

```bash
# 1. Parar stack
cd tools/compose
docker compose -f docker-compose.4-1-tp-capital-stack.yml down

# 2. Remover volume PG16
docker volume rm tp-capital-timescaledb-data

# 3. Restaurar volume PG15
docker volume create tp-capital-timescaledb-data
docker run --rm \
  -v tp-capital-timescaledb-data:/data \
  -v /home/marce/Projetos/TradingSystem/backups:/backup \
  alpine tar xzf /backup/tp-capital-pg15-backup-*.tar.gz -C /

# 4. Alterar compose para usar PG15 temporariamente
# Editar docker-compose.4-1-tp-capital-stack.yml:
# image: timescale/timescaledb:latest-pg16 → timescale/timescaledb:latest-pg15

# 5. Iniciar stack com PG15
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d
```

### Opção 2: Iniciar do Zero (Sem Dados)

```bash
# 1. Parar e remover tudo
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml down -v

# 2. Iniciar stack limpa com PG16
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d
```

---

## 📊 Informações do Volume Atual

**Volume Name:** `tp-capital-timescaledb-data`
**Criado em:** 2025-10-26 21:34:00
**Versão original:** PostgreSQL 15
**Última modificação:** 2025-10-29 01:42:00
**Localização:** `/var/lib/docker/volumes/tp-capital-timescaledb-data/_data`

---

## ⚠️ Importante

1. **Backups são essenciais:**
   - Script cria 2 backups automaticamente
   - Não prossiga sem os backups

2. **Confirmação necessária:**
   - Script pede confirmação antes de remover volume antigo
   - Leia com atenção antes de confirmar

3. **Downtime esperado:**
   - 3-5 minutos durante a migração
   - TP Capital ficará indisponível durante o processo

4. **Após migração:**
   - Volume PG15 é removido permanentemente
   - Use backups para rollback se necessário

---

## 📚 Referências

- **Script de Migração:** `scripts/docker/tp-capital-pg15-to-pg16-migration.sh`
- **Compose File:** `tools/compose/docker-compose.4-1-tp-capital-stack.yml`
- **Backups:** `backups/` (criados automaticamente)
- **PostgreSQL Upgrade Docs:** https://www.postgresql.org/docs/16/upgrading.html
- **TimescaleDB Upgrade:** https://docs.timescale.com/self-hosted/latest/upgrades/

---

## ✅ Checklist de Migração

Antes de executar:
- [ ] Ler documentação completa
- [ ] Verificar espaço em disco (mínimo 2GB livre)
- [ ] Confirmar que não há processos críticos rodando

Durante execução:
- [ ] Script executado sem erros
- [ ] Backups criados com sucesso
- [ ] Confirmação fornecida para remover volume
- [ ] PG16 iniciado corretamente
- [ ] Dados restaurados

Após migração:
- [ ] Todos os 5 containers healthy
- [ ] Tabelas verificadas no banco
- [ ] API respondendo em http://localhost:4005/health
- [ ] Backups preservados em `backups/`

---

**Última Atualização:** 2025-11-11 11:22 BRT
**Status:** 🔧 Aguardando execução do script pelo usuário
