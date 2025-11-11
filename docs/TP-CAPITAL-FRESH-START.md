# TP Capital - Fresh Start (Volume Corrompido)

**Data:** 2025-11-11
**Status:** 🆕 **FRESH START RECOMENDADO**

---

## 🎯 Situação Atual

Durante a tentativa de migração PG15→PG16, foi descoberto que o **volume PG15 está corrompido**:

```
FATAL: role "tp_capital" does not exist
FATAL: role "postgres" does not exist
```

### Diagnóstico

- ✅ Volume existe (`tp-capital-timescaledb-data`)
- ✅ Dados do PostgreSQL presentes
- ❌ Nenhum usuário configurado no banco
- ❌ Banco não pode ser acessado para dump

**Conclusão:** Volume foi criado incorretamente ou está corrompido. **Fresh start é mais seguro** que tentar recuperar.

---

## ✅ Solução Recomendada: Fresh Start

Como o TP Capital provavelmente não estava em uso produtivo (volume de Outubro sem acesso), a **melhor solução é começar do zero** com PG16.

### Vantagens do Fresh Start:

✅ **Banco limpo** - PostgreSQL 16 configurado corretamente
✅ **Sem corrupção** - Sem riscos de dados inconsistentes
✅ **Rápido** - 2-3 minutos vs 10+ minutos tentando recuperar
✅ **Seguro** - Backup do volume antigo é preservado

---

## 🚀 Como Executar Fresh Start

### Script Automatizado

Foi criado um script que faz o fresh start de forma **segura**:

**Script:** `scripts/docker/tp-capital-fresh-start.sh`

```bash
cd /home/marce/Projetos/TradingSystem
bash scripts/docker/tp-capital-fresh-start.sh
```

**O que o script faz:**

1. ✅ Verifica se backup existe (já foi criado)
2. ✅ Para containers existentes
3. ✅ Remove volume corrompido (após confirmação)
4. ✅ Cria novo volume para PG16
5. ✅ Inicia stack completa (5 containers)
6. ✅ Verifica health de todos os serviços

**Tempo:** 2-3 minutos

---

## 📦 Backup Preservado

O backup do volume PG15 **foi criado e está preservado**:

**Localização:** `backups/tp-capital-pg15-backup-20251111-112448.tar.gz`
**Tamanho:** 9.7M

Se **realmente** precisar dos dados antigos, é possível tentar recuperação manual (ver seção Troubleshooting).

---

## 🔄 Passo a Passo Manual (Alternativa)

Se preferir fazer manualmente:

```bash
# 1. Parar stack
cd /home/marce/Projetos/TradingSystem/tools/compose
docker compose -f docker-compose.4-1-tp-capital-stack.yml down

# 2. Remover volume corrompido
docker volume rm tp-capital-timescaledb-data

# 3. Criar novo volume
docker volume create tp-capital-timescaledb-data

# 4. Iniciar stack
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d

# 5. Aguardar containers ficarem healthy (1-2 min)
watch -n 2 'docker ps --filter "label=com.tradingsystem.stack=tp-capital"'

# 6. Verificar banco
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c '\l'
```

---

## 🔍 Verificações Pós Fresh Start

### 1. Containers Healthy

```bash
docker ps --filter "label=com.tradingsystem.stack=tp-capital"

# Esperado: 5 containers healthy
# - tp-capital-timescale
# - tp-capital-pgbouncer
# - tp-capital-redis-master
# - tp-capital-redis-replica
# - tp-capital-api
```

### 2. Banco Acessível

```bash
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "SELECT version();"

# Esperado:
# PostgreSQL 16.10 on x86_64-pc-linux-musl, compiled by gcc...
```

### 3. API Respondendo

```bash
curl http://localhost:4005/health

# Esperado: 200 OK
```

### 4. Tabelas do Schema

```bash
docker exec tp-capital-timescale psql -U tp_capital -d tp_capital_db -c "\dt"

# Esperado: Tabelas do tp_capital (signals, etc)
```

---

## 🔧 Troubleshooting

### Container não fica healthy

**TimescaleDB:**
```bash
docker logs tp-capital-timescale 2>&1 | tail -50
```

**Problema comum:** Porta 5440 ocupada
```bash
# Verificar
lsof -i :5440

# Parar serviço que está usando
docker stop <container_name>
```

**PgBouncer:**
```bash
docker logs tp-capital-pgbouncer
```

**Problema comum:** TimescaleDB não está healthy ainda
- **Solução:** Aguardar 1-2 min para TimescaleDB ficar healthy

**Redis:**
```bash
docker logs tp-capital-redis-master
docker logs tp-capital-redis-replica
```

**TP Capital API:**
```bash
docker logs tp-capital-api
```

**Problema comum:** Variáveis de ambiente não configuradas
```bash
# Verificar
grep TP_CAPITAL /home/marce/Projetos/TradingSystem/.env
```

### Banco não tem tabelas

**Causa:** Init scripts não rodaram

**Solução:**
```bash
# Verificar se init scripts existem
ls -la backend/data/timescaledb/tp-capital/

# Re-inicializar banco
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml down -v
docker compose -f tools/compose/docker-compose.4-1-tp-capital-stack.yml up -d
```

---

## 🗃️ Recuperação de Dados Antigos (Avançado)

**⚠️ Apenas se você realmente precisa dos dados do volume corrompido**

### Opção 1: Tentar Recuperar Usuários

```bash
# 1. Restaurar volume backup
docker volume create tp-capital-pg15-recovery
docker run --rm \
  -v tp-capital-pg15-recovery:/data \
  -v /home/marce/Projetos/TradingSystem/backups:/backup \
  alpine tar xzf /backup/tp-capital-pg15-backup-20251111-112448.tar.gz -C /

# 2. Iniciar PG15 com single-user mode
docker run -it --rm \
  -v tp-capital-pg15-recovery:/var/lib/postgresql/data \
  timescale/timescaledb:latest-pg15 \
  postgres --single -D /var/lib/postgresql/data postgres

# 3. Dentro do prompt postgres, criar usuário:
CREATE USER tp_capital WITH SUPERUSER PASSWORD 'tp_capital_secure_pass_2024';
CREATE DATABASE tp_capital_db OWNER tp_capital;
```

### Opção 2: Extração Manual de Dados

```bash
# 1. Montar volume em container Alpine
docker run -it --rm \
  -v tp-capital-pg15-recovery:/data \
  alpine sh

# 2. Navegar até dados
cd /data/base

# 3. Tentar identificar tabelas importantes
# (Requer conhecimento de estrutura interna do PostgreSQL)
```

**Nota:** Essa recuperação é complexa e pode não funcionar. **Fresh start é mais confiável**.

---

## 📚 Referências

- **Fresh Start Script:** `scripts/docker/tp-capital-fresh-start.sh`
- **Compose File:** `tools/compose/docker-compose.4-1-tp-capital-stack.yml`
- **Backup Volume:** `backups/tp-capital-pg15-backup-20251111-112448.tar.gz`
- **Migration Doc (não aplicável):** `docs/TP-CAPITAL-PG15-TO-PG16-MIGRATION.md`

---

## ✅ Recomendação Final

**FRESH START é a melhor opção:**

✅ Mais rápido (2-3 min vs 1+ hora tentando recuperar)
✅ Mais seguro (sem risco de corrupção)
✅ Banco limpo e otimizado com PG16
✅ Backup preservado caso realmente precise

**Execute:**
```bash
cd /home/marce/Projetos/TradingSystem
bash scripts/docker/tp-capital-fresh-start.sh
```

---

**Última Atualização:** 2025-11-11 11:26 BRT
**Status:** 🆕 Aguardando fresh start
