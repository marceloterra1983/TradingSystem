# Course Crawler - Database Connection Recovery

**Date**: 2025-11-07
**Issue**: API returning "Unexpected error" após rebuild dos containers
**Root Cause**: Environment variable override causing wrong database connection
**Status**: ✅ RESOLVIDO

---

## 🔴 Problema Relatado

**Sintoma**: "mas perdeu o historico e esta tudo nao funcionando agora"

**Contexto**:
- Após rebuild dos containers (fix de senhas), a API parou de funcionar
- Frontend carregava mas não mostrava dados
- Usuário relatou perda de histórico

---

## 🎯 Investigação

### 1. Verificação do Volume (✅ OK)
```bash
docker volume ls | grep course-crawler
# Output: course-crawler-stack_course_crawler_db_data
```
**Resultado**: Volume do banco de dados ainda existe!

### 2. Verificação dos Dados (✅ OK)
```bash
docker exec course-crawler-db psql -U postgres -d coursecrawler \
  -c "SELECT COUNT(*) FROM course_crawler.courses;"
# Output: 5 courses

docker exec course-crawler-db psql -U postgres -d coursecrawler \
  -c "SELECT COUNT(*) FROM course_crawler.crawl_runs;"
# Output: 6 runs
```
**Resultado**: Todos os dados preservados no banco! 🎉

### 3. Teste da API (❌ FALHA)
```bash
curl http://localhost:3601/courses
# Output: {"message": "Unexpected error"}
```

### 4. Análise dos Logs (🎯 CAUSA RAIZ ENCONTRADA)
```bash
docker logs course-crawler-api --tail 50
```

**Erro encontrado**:
```json
{
  "err": {
    "type": "Error",
    "message": "connect ECONNREFUSED 127.0.0.1:7000",
    "errno": -111,
    "code": "ECONNREFUSED",
    "syscall": "connect",
    "address": "127.0.0.1",
    "port": 7000
  }
}
```

### 5. Verificação das Variáveis de Ambiente (🔍 PROBLEMA!)
```bash
docker exec course-crawler-api printenv | grep DATABASE_URL
# Output:
# COURSE_CRAWLER_DATABASE_URL=postgresql://timescaledb:timescaledb@localhost:7000/tradingsystem
# NEON_DATABASE_URL=postgresql://postgres:coursecrawler@course-crawler-db:5432/coursecrawler_cli
```

**Problema identificado**:
- API tentando conectar em `localhost:7000` (TimescaleDB do projeto principal)
- Deveria conectar em `course-crawler-db:5432` (banco local do Course Crawler)

---

## 🔎 Causa Raiz

### Por que isso aconteceu?

1. **Docker Compose rebuild** recria containers do zero
2. **Environment variables** podem ser sobrescritas por múltiplas fontes:
   - Shell environment (variáveis exportadas)
   - Arquivo `.env`
   - Arquivo `.env.local`
   - Defaults no `docker-compose.yml`
3. **Ordem de precedência**: Shell > .env > defaults
4. **Problema**: Alguma variável no shell estava sobrescrevendo o `.env`

### Verificação do .env (✅ Estava correto)
```bash
grep COURSE_CRAWLER_DATABASE_URL .env
# Output: postgresql://postgres:coursecrawler@course-crawler-db:5432/coursecrawler
```

### Docker Compose config (❌ Resolvendo para localhost:7000)
```bash
docker compose -f tools/compose/docker-compose.course-crawler.yml config | grep DATABASE_URL
# Output: postgresql://timescaledb:timescaledb@localhost:7000/tradingsystem
```

**Conclusão**: Variável do shell estava sobrescrevendo o `.env`!

---

## ✅ Solução Aplicada

### Usar Script de Restart Existente

O projeto já tinha um script preparado para este cenário:
```bash
bash /home/marce/Projetos/TradingSystem/scripts/docker/restart-course-crawler.sh
```

### O que o script faz:

1. **Limpa variáveis conflitantes**:
   ```bash
   unset COURSE_CRAWLER_DATABASE_URL
   unset COURSE_CRAWLER_NEON_DATABASE_URL
   ```

2. **Carrega apenas do .env**:
   ```bash
   export $(grep -v '^#' .env | grep "COURSE_CRAWLER_" | xargs)
   ```

3. **Valida variável crítica**:
   ```bash
   if [[ "$COURSE_CRAWLER_DATABASE_URL" == *"course-crawler-db"* ]]; then
       echo "✅ DATABASE_URL correta!"
   else
       echo "❌ ERRO: DATABASE_URL não aponta para course-crawler-db!"
       exit 1
   fi
   ```

4. **Reinicia containers**:
   ```bash
   docker compose -f tools/compose/docker-compose.course-crawler.yml down
   docker compose -f tools/compose/docker-compose.course-crawler.yml up -d
   ```

5. **Verifica deployment**:
   ```bash
   docker exec course-crawler-api printenv | grep DATABASE_URL
   docker logs course-crawler-api --tail 10
   ```

---

## 📊 Resultado Final

### Antes do Fix ❌
```
API Status: ERROR
Error: connect ECONNREFUSED 127.0.0.1:7000
DATABASE_URL: localhost:7000 (INCORRETO)
Cursos visíveis: 0
Runs visíveis: 0
```

### Depois do Fix ✅
```
API Status: HEALTHY
DATABASE_URL: course-crawler-db:5432 (CORRETO)
Cursos visíveis: 5 ✅
Runs visíveis: 6 ✅
Dados preservados: 100% ✅
```

### Verificação de Dados Preservados

**Cursos** (5 total):
```sql
SELECT id, name, username, LENGTH(password_encrypted) as pwd_len, created_at
FROM course_crawler.courses
ORDER BY created_at DESC;
```

| Nome | Username | Senha | Data Criação |
|------|----------|-------|--------------|
| Mentoria Anti Fragil | marcelo.terra@gmail.com | 48 chars | 2025-11-07 22:13 |
| Teste Senha Debug | admin | 44 chars | 2025-11-07 21:20 |
| Site com Senha | admin | 60 chars | 2025-11-07 21:12 |
| Site sem Senha | visitor | 44 chars | 2025-11-07 21:12 |
| mql5-do-zero | marcelo.terra@gmail.com | 60 chars | 2025-11-07 21:03 |

**Runs** (6 total):
```sql
SELECT id, course_id, status, created_at
FROM course_crawler.crawl_runs
ORDER BY created_at DESC
LIMIT 5;
```

| ID | Status | Data |
|----|--------|------|
| b09e375a... | running | 2025-11-07 22:34 |
| 3683c00d... | failed | 2025-11-07 22:32 |
| f2195d8d... | failed | 2025-11-07 22:17 |
| 516df229... | cancelled | 2025-11-07 22:14 |
| 33d841d6... | failed | 2025-11-07 22:09 |

---

## 🎯 Lições Aprendidas

### 1. Volume do Docker Preserva Dados ✅
- Rebuild de containers NÃO apaga dados do volume
- Volume `course_crawler_db_data` persistiu todos os dados
- Dados estavam sempre seguros!

### 2. Environment Variables têm Precedência
```
Ordem de precedência (maior → menor):
1. Shell environment (export VARIABLE=value)
2. .env file
3. docker-compose.yml defaults
```

### 3. Script de Restart é Essencial
- **SEMPRE use o script** após rebuild: `bash scripts/docker/restart-course-crawler.sh`
- Script garante ambiente limpo
- Script valida variáveis críticas
- Script verifica deployment

### 4. Nunca Assuma Perda de Dados
- Docker volumes são persistentes
- Primeiro verificar se dados existem
- Depois investigar conectividade

---

## 🚀 Comandos Úteis

### Verificar Dados no Banco
```bash
# Contar cursos
docker exec course-crawler-db psql -U postgres -d coursecrawler \
  -c "SELECT COUNT(*) FROM course_crawler.courses;"

# Contar runs
docker exec course-crawler-db psql -U postgres -d coursecrawler \
  -c "SELECT COUNT(*) FROM course_crawler.crawl_runs;"

# Listar cursos
docker exec course-crawler-db psql -U postgres -d coursecrawler \
  -c "SELECT id, name, username FROM course_crawler.courses;"
```

### Verificar Variáveis de Ambiente
```bash
# No host
grep COURSE_CRAWLER_DATABASE_URL .env

# No container
docker exec course-crawler-api printenv | grep DATABASE_URL

# Docker Compose resolved
docker compose -f tools/compose/docker-compose.course-crawler.yml config \
  | grep -A 2 "COURSE_CRAWLER_DATABASE_URL"
```

### Reiniciar Corretamente
```bash
# SEMPRE use o script
bash /home/marce/Projetos/TradingSystem/scripts/docker/restart-course-crawler.sh

# OU manualmente:
cd /home/marce/Projetos/TradingSystem
unset COURSE_CRAWLER_DATABASE_URL
export $(grep -v '^#' .env | grep "COURSE_CRAWLER_" | xargs)
docker compose -f tools/compose/docker-compose.course-crawler.yml restart
```

### Testar API
```bash
# Health check
curl -s http://localhost:3601/health | jq '.status'

# Listar cursos
curl -s http://localhost:3601/courses | jq '. | length'

# Listar runs
curl -s http://localhost:3601/runs | jq '. | length'
```

---

## 🎉 Conclusão

**Problema resolvido**:
- ✅ Dados NUNCA foram perdidos (volume preservado)
- ✅ API reconectou ao banco correto
- ✅ Todos os 5 cursos visíveis
- ✅ Todos os 6 runs visíveis
- ✅ Senhas preservadas e criptografadas

**Causa**:
- ❌ Environment variable no shell sobrescrevendo .env
- ❌ API tentando conectar em banco errado (localhost:7000)

**Fix**:
- ✅ Uso do script de restart que limpa ambiente
- ✅ Validação de variáveis críticas
- ✅ Verificação pós-deployment

**Prevenção futura**:
- 🔧 **SEMPRE** usar `scripts/docker/restart-course-crawler.sh` após rebuilds
- 🔧 Verificar DATABASE_URL antes de iniciar containers
- 🔧 Nunca assumir perda de dados sem verificar volume

**O Course Crawler está 100% funcional com todos os dados preservados!** 🚀

---

**Report Generated**: 2025-11-07 23:15 UTC
**Data Loss**: NONE (100% preserved in Docker volume)
**Issue Type**: Environment configuration
**Resolution Time**: ~10 minutes
**Status**: ✅ RESOLVED

**Comandos essenciais**:
```bash
# Restart correto (SEMPRE use este)
bash scripts/docker/restart-course-crawler.sh

# Verificar dados preservados
docker exec course-crawler-db psql -U postgres -d coursecrawler \
  -c "SELECT COUNT(*) FROM course_crawler.courses;"

# Testar API
curl -s http://localhost:3601/courses | jq '. | length'

# Verificar logs
docker logs course-crawler-api --tail 20
```
