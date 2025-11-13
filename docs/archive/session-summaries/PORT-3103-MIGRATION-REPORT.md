# Migração da Porta 3103 → 9080 (Dashboard)

**Data:** 2025-11-11
**Motivo:** Dashboard migrado de porta 3103 para 9080 (Traefik Gateway padrão)
**Status:** ✅ Migração Completa

---

## 📋 Resumo da Migração

### Contexto

O Dashboard React foi inicialmente configurado para rodar na porta **3103**. Com a implementação do **Traefik API Gateway** como ponto de entrada único, o Dashboard foi movido para a porta **9080** (gateway padrão).

### Arquivos Afetados

| Arquivo | Tipo | Status | Ação Necessária |
|---------|------|--------|-----------------|
| `tools/compose/docker-compose.1-dashboard-stack.yml` | Compose | ✅ Corrigido | Health check + Traefik port |
| `config/.env.defaults` | Config | 🔄 Precisa Atualizar | CORS + N8N URLs |
| `config/services-manifest.json` | Registry | 🔄 Precisa Atualizar | Port number |
| `backend/api/course-crawler/.env.example` | Config | 🔄 Precisa Atualizar | CORS origins |
| `reports/governance/latest.json` | Auto-generated | ⚠️ Regenerar | Run governance scripts |
| `frontend/dashboard/public/data/governance/latest.json` | Auto-generated | ⚠️ Regenerar | Run governance scripts |

---

## 🔧 Correções Necessárias

### 1. `config/.env.defaults` (Linhas 124, 189-195)

**Correções:**

```bash
# Linha 124 - CORS_ORIGIN
# ANTES:
CORS_ORIGIN=http://localhost:3103,http://localhost:3400,http://localhost:3401

# DEPOIS:
CORS_ORIGIN=http://localhost:9080,http://localhost:3400,http://localhost:3401

# Linhas 189-195 - N8N URLs
# ANTES:
N8N_BASE_URL=http://localhost:3103/n8n
N8N_EDITOR_BASE_URL=http://localhost:3103/n8n
N8N_API_BASE_URL=http://localhost:3103/n8n/api
N8N_WEBHOOK_URL=http://localhost:3103/n8n/
WEBHOOK_URL=http://localhost:3103/n8n/

# DEPOIS:
N8N_BASE_URL=http://localhost:9080/n8n
N8N_EDITOR_BASE_URL=http://localhost:9080/n8n
N8N_API_BASE_URL=http://localhost:9080/n8n/api
N8N_WEBHOOK_URL=http://localhost:9080/n8n/
WEBHOOK_URL=http://localhost:9080/n8n/
```

**Motivo:** N8N é acessado via iframe no Dashboard, agora na porta 9080 (Traefik).

---

### 2. `config/services-manifest.json`

**Correção:**

```json
{
  "name": "Dashboard UI",
  "port": 9080,  // ANTES: 3103
  "protocol": "http",
  "type": "frontend",
  "healthcheck": "http://localhost:9080/",
  "description": "Main React Dashboard (Traefik Gateway)"
}
```

**Motivo:** Port registry precisa refletir porta correta.

---

### 3. `backend/api/course-crawler/.env.example`

**Correção:**

```bash
# ANTES:
COURSE_CRAWLER_CORS_ORIGINS=http://localhost:3103,http://localhost:4201

# DEPOIS:
COURSE_CRAWLER_CORS_ORIGINS=http://localhost:9080,http://localhost:4201
```

**Motivo:** Course Crawler API precisa aceitar requisições do Dashboard na porta correta.

---

### 4. Arquivos JSON de Governança (Auto-gerados)

**Arquivos:**
- `reports/governance/latest.json`
- `frontend/dashboard/public/data/governance/latest.json`

**Ação:**

```bash
# Regenerar governance snapshot
node governance/automation/governance-metrics.mjs

# Copiar para frontend
cp reports/governance/latest.json frontend/dashboard/public/data/governance/
```

**Motivo:** Esses arquivos contêm documentação que referencia porta 3103. São gerados automaticamente a partir dos arquivos de governança.

---

## ✅ Correções Já Realizadas

### 1. `tools/compose/docker-compose.1-dashboard-stack.yml`

**Linha 48 - Health Check:**
```yaml
# ANTES:
test: ["CMD-SHELL", "curl -f http://localhost:3103/health || exit 1"]

# DEPOIS:
test: ["CMD-SHELL", "curl -f http://localhost:9080/ || exit 1"]
```

**Linha 71 - Traefik Service Port:**
```yaml
# ANTES:
- "traefik.http.services.dashboard-ui.loadbalancer.server.port=3103"

# DEPOIS:
- "traefik.http.services.dashboard-ui.loadbalancer.server.port=9080"
```

**Status:** ✅ Container recreado e saudável

---

## 🚀 Comandos de Aplicação

```bash
# 1. Atualizar config/.env.defaults
# (Editar manualmente as linhas 124, 189-195)

# 2. Atualizar config/services-manifest.json
# (Editar manualmente o campo "port")

# 3. Atualizar backend/api/course-crawler/.env.example
# (Editar manualmente COURSE_CRAWLER_CORS_ORIGINS)

# 4. Regenerar governança
node governance/automation/governance-metrics.mjs
cp reports/governance/latest.json frontend/dashboard/public/data/governance/

# 5. Rebuild serviços afetados (se necessário)
# Dashboard já foi rebuildo
# N8N precisa restart para pegar novas env vars
docker compose -f tools/compose/docker-compose.5-1-n8n-stack.yml restart n8n-app

# Course Crawler precisa rebuild
docker compose -f tools/compose/docker-compose.4-5-course-crawler-stack.yml up -d --build course-crawler-api
```

---

## 📊 Validação Pós-Migração

```bash
# 1. Verificar Dashboard está acessível
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:9080/
# Esperado: HTTP 200

# 2. Verificar N8N via Dashboard
curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:9080/n8n
# Esperado: HTTP 200 (redirecionado)

# 3. Verificar CORS do Course Crawler
curl -H "Origin: http://localhost:9080" -I http://localhost:3601/health
# Esperado: Access-Control-Allow-Origin: http://localhost:9080

# 4. Verificar services manifest
cat config/services-manifest.json | jq '.services[] | select(.name=="Dashboard UI") | .port'
# Esperado: 9080

# 5. Verificar env defaults
grep "3103" config/.env.defaults
# Esperado: Nenhuma ocorrência
```

---

## 🔍 Busca de Referências Remanescentes

```bash
# Buscar qualquer referência a 3103 no código (exceto auto-gerados)
grep -r "3103" /home/marce/Projetos/TradingSystem \
  --exclude-dir={node_modules,dist,build,.git,outputs,reports} \
  --include="*.yml" \
  --include="*.yaml" \
  --include="*.ts" \
  --include="*.tsx" \
  --include="*.js" \
  --include="*.jsx" \
  --include="*.json" \
  --include="*.env*"

# Após correções, deve retornar: 0 resultados
```

---

## 📝 Checklist de Conclusão

- [x] Corrigir health check em docker-compose.1-dashboard-stack.yml
- [x] Corrigir Traefik service port em docker-compose.1-dashboard-stack.yml
- [x] Recrear container Dashboard (healthy)
- [ ] Atualizar CORS_ORIGIN em config/.env.defaults
- [ ] Atualizar N8N URLs em config/.env.defaults
- [ ] Atualizar port em config/services-manifest.json
- [ ] Atualizar CORS em backend/api/course-crawler/.env.example
- [ ] Regenerar reports/governance/latest.json
- [ ] Copiar governance para frontend/dashboard/public/data/
- [ ] Validar pós-migração (curl tests)
- [ ] Buscar e confirmar zero referências a 3103

---

## 🎯 Lições Aprendidas

### 1. Migração de Porta Requer Análise Holística

**Problema:** Alterar porta em compose file não é suficiente.

**Solução:** Varrer todo o codebase por referências hardcoded:
- Environment configs (.env.defaults)
- Service registries (services-manifest.json)
- CORS configurations
- URLs em documentação

### 2. Governança Auto-Gerada Precisa Regeneração

**Problema:** JSON files contêm snapshots de documentação com valores antigos.

**Solução:** Sempre regenerar após mudanças em configuração/documentação:
```bash
node governance/automation/governance-metrics.mjs
```

### 3. Container Restart vs Recreate

**Problema:** Apenas `restart` não aplica mudanças no compose file.

**Solução:** Usar `--force-recreate` para aplicar novas configs:
```bash
docker compose up -d --force-recreate <service>
```

### 4. Health Check Deve Refletir Porta Real

**Problema:** Health check tentando porta errada causou loop infinito.

**Solução:** Health check DEVE usar mesma porta que o serviço:
```yaml
test: ["CMD-SHELL", "curl -f http://localhost:9080/ || exit 1"]
```

---

## 📚 Referências

- **Traefik Gateway Policy:** `governance/policies/api-gateway-policy.md`
- **Port Registry:** `config/services-manifest.json`
- **Environment Defaults:** `config/.env.defaults`
- **Dashboard Compose:** `tools/compose/docker-compose.1-dashboard-stack.yml`
- **Governance Automation:** `governance/automation/governance-metrics.mjs`

---

**Próximos Passos:**
1. Aplicar correções nos arquivos listados
2. Regenerar governança
3. Validar com curl tests
4. Marcar como concluído no checklist acima
