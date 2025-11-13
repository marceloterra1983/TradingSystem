# Gateway Docker Compose Unification

**Data:** 2025-11-12
**Status:** ✅ CONCLUÍDO

---

## 🎯 Objetivo

Unificar os dois arquivos conflitantes do Gateway (Traefik) em um único arquivo no padrão do projeto.

---

## 📋 Análise dos Arquivos Originais

### Arquivo 1: `docker-compose.0-gateway-stack.yml` (ORIGINAL)

**Tamanho:** 342 linhas

**Serviços:**
- ✅ `traefik` - API Gateway (Traefik v3.0)
- ❌ `dbui-pgadmin-proxy` - Nginx proxy (não deveria estar aqui)
- ❌ `dbui-adminer-proxy` - Nginx proxy (não deveria estar aqui)
- ❌ `dbui-pgweb-proxy` - Nginx proxy (não deveria estar aqui)
- ❌ `dbui-questdb-proxy` - Nginx proxy (não deveria estar aqui)
- ❌ `n8n-proxy` - Nginx proxy (já existe em `docker-compose-5-1-n8n-stack.yml`)
- ❌ `kestra-proxy` - Nginx proxy (deve estar em `docker-compose.5-5-kestra-stack.yml`)
- ❌ `grafana-proxy` - Nginx proxy (deve estar em `docker-compose.6-1-monitoring-stack.yml`)

**Portas:**
- ✅ `9080` - HTTP Gateway (CORRETO)
- ✅ `9081` - Dashboard (CORRETO)
- ✅ `9443` - HTTPS Gateway (CORRETO)

**Problema:** Continha 7 proxies nginx que causavam crash loops ao tentar se conectar a serviços não rodando.

### Arquivo 2: `docker-compose.gateway.yml` (OBSOLETO)

**Tamanho:** 84 linhas

**Serviços:**
- ✅ `traefik` - API Gateway (Traefik v3.0)

**Portas:**
- ❌ `80` - HTTP (conflitava com sistema)
- ❌ `443` - HTTPS (não usado no projeto)
- ❌ `8080` - Dashboard (porta errada)

**Problema:** Usava portas incorretas (80/443/8080) ao invés das portas padrão do projeto (9080/9081/9443).

---

## ✅ Solução Implementada

### 1. Arquivo Unificado: `docker-compose.0-gateway-stack.yml`

**Tamanho final:** 147 linhas (redução de 57% - de 342 para 147 linhas)

**Mudanças:**
- ✅ Mantido apenas o serviço `traefik`
- ✅ Removidos todos os 7 proxies nginx
- ✅ Mantidas as portas corretas (9080/9081/9443)
- ✅ Mantida configuração completa do Traefik
- ✅ Mantidos volumes e networks

**Conteúdo:**
```yaml
name: 0-gateway-stack

services:
  traefik:
    image: traefik:v3.0
    container_name: api-gateway
    restart: unless-stopped

    ports:
      - "9080:9080"   # HTTP Gateway
      - "9081:9080"   # Dashboard
      - "9443:9443"   # HTTPS Gateway (future)

    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - ../../tools/traefik/traefik-minimal.yml:/etc/traefik/traefik.yml:ro
      - ../../tools/traefik/dynamic:/etc/traefik/dynamic:ro
      - traefik-logs:/var/log/traefik
      - traefik-certs:/letsencrypt

    networks:
      - tradingsystem_backend
      - tradingsystem_frontend
      - tp_capital_backend

    healthcheck:
      test: ["CMD", "traefik", "healthcheck", "--ping"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s

volumes:
  traefik-logs:
    driver: local
  traefik-certs:
    driver: local

networks:
  tradingsystem_backend:
    external: true
  tradingsystem_frontend:
    external: true
  tp_capital_backend:
    external: true
```

### 2. Arquivo Obsoleto Arquivado

**Ação:** `docker-compose.gateway.yml` → `.legacy-backup/docker-compose.gateway.yml`

**Motivo:** Arquivo obsoleto com portas incorretas.

### 3. Backup Criado

**Arquivo:** `tools/compose/docker-compose.0-gateway-stack.yml.backup`

**Conteúdo:** Backup completo do arquivo original (342 linhas) para referência futura.

---

## 📍 Localização dos Proxies Nginx

Os proxies nginx **DEVEM** estar em seus respectivos stacks, não no Gateway:

| Proxy | Stack Correto | Arquivo | Status |
|-------|---------------|---------|--------|
| `n8n-proxy` | n8n Automation | `docker-compose-5-1-n8n-stack.yml` | ✅ Já implementado |
| `kestra-proxy` | Kestra Automation | `docker-compose.5-5-kestra-stack.yml` | ⚠️ Precisa implementar |
| `grafana-proxy` | Monitoring | `docker-compose.6-1-monitoring-stack.yml` | ⚠️ Precisa implementar |
| `dbui-pgadmin-proxy` | Database UI | Stack de Database UI | ⚠️ Precisa criar stack |
| `dbui-adminer-proxy` | Database UI | Stack de Database UI | ⚠️ Precisa criar stack |
| `dbui-pgweb-proxy` | Database UI | Stack de Database UI | ⚠️ Precisa criar stack |
| `dbui-questdb-proxy` | Database UI | Stack de Database UI | ⚠️ Precisa criar stack |

**Padrão de implementação:**

Cada serviço que precisa de iframe embedding deve ter seu próprio proxy nginx no mesmo stack:

```yaml
# Exemplo: n8n-proxy no docker-compose-5-1-n8n-stack.yml
n8n-proxy:
  container_name: n8n-proxy
  image: nginx:alpine
  restart: unless-stopped

  volumes:
    - ./n8n-nginx-proxy.conf:/etc/nginx/conf.d/default.conf:ro

  depends_on:
    n8n-app:
      condition: service_healthy

  networks:
    - n8n_backend
    - tradingsystem_backend

  labels:
    - "traefik.enable=true"
    - "traefik.http.routers.n8n.rule=PathPrefix(`/n8n`)"
    - "traefik.http.routers.n8n.middlewares=static-allow-iframe@file"
    - "traefik.http.services.n8n.loadbalancer.server.port=80"
```

---

## 🚀 Ordem de Inicialização (Atualizada)

```bash
# 1. Gateway (Traefik) - DEVE SER PRIMEIRO
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# 2. Dashboard
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d

# 3. Documentation
docker compose -f tools/compose/docker-compose.2-docs-stack.yml up -d

# 4. Workspace
docker compose -f tools/compose/docker-compose.4-3-workspace-stack.yml up -d

# 5. n8n (inclui n8n-proxy)
docker compose -f tools/compose/docker-compose-5-1-n8n-stack.yml up -d
```

**Ou use o script automatizado:**
```bash
bash scripts/docker/startup-all-services.sh
```

---

## ✅ Scripts Atualizados

Os seguintes scripts foram atualizados para usar o arquivo unificado:

1. **`scripts/docker/startup-all-services.sh`**
   - ✅ Usa `docker-compose.0-gateway-stack.yml`
   - ✅ Inicia serviços na ordem correta
   - ✅ Aguarda health checks

2. **`scripts/docker/stop-gateway-stack.sh`**
   - ✅ Usa `docker-compose.0-gateway-stack.yml`
   - ✅ Para serviços na ordem reversa

---

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| **Arquivos de Gateway** | 2 (conflitantes) | 1 (unificado) |
| **Linhas de código** | 342 + 84 = 426 | 147 |
| **Serviços no Gateway** | 8 (1 Traefik + 7 proxies) | 1 (Traefik) |
| **Proxies nginx indevidos** | 7 | 0 |
| **Portas** | Misturadas (80/443/8080 e 9080/9081) | Padronizadas (9080/9081/9443) |
| **Crash loops** | Sim (proxies sem backend) | Não |
| **Manutenção** | Complexa (2 arquivos) | Simples (1 arquivo) |

---

## 🎉 Benefícios

1. ✅ **Arquivo único** - Sem confusão sobre qual usar
2. ✅ **Portas padronizadas** - 9080/9081/9443 em todo o projeto
3. ✅ **Sem crash loops** - Proxies só iniciam quando backends existem
4. ✅ **Separação de responsabilidades** - Gateway faz routing, proxies ficam com seus serviços
5. ✅ **Manutenção simplificada** - Menos arquivos, mais clareza
6. ✅ **Startup mais rápido** - Gateway inicia sem dependências de serviços
7. ✅ **Logs mais limpos** - Sem erros de conexão de proxies órfãos

---

## 🔄 Próximos Passos

### Opcional: Implementar Proxies nos Stacks Faltantes

Se você quiser habilitar iframe embedding para outros serviços:

1. **Kestra** - Criar `kestra-nginx-proxy.conf` e adicionar `kestra-proxy` em `docker-compose.5-5-kestra-stack.yml`
2. **Grafana** - Criar `grafana-nginx-proxy.conf` e adicionar `grafana-proxy` em `docker-compose.6-1-monitoring-stack.yml`
3. **Database UIs** - Criar stack dedicado para pgAdmin, Adminer, pgweb, QuestDB UI com seus respectivos proxies

**Template disponível:** `tools/compose/templates/nginx-iframe-proxy.conf.template`

**Script gerador:** `scripts/docker/generate-nginx-proxy.sh`

**Documentação:** `IFRAME-EMBEDDING-DEFINITIVE-SOLUTION.md`

---

## 📚 Arquivos Relacionados

- ✅ **Gateway Stack:** `tools/compose/docker-compose.0-gateway-stack.yml` (147 linhas)
- 📦 **Backup:** `tools/compose/docker-compose.0-gateway-stack.yml.backup` (342 linhas)
- 🗄️ **Arquivado:** `tools/compose/.legacy-backup/docker-compose.gateway.yml` (84 linhas)
- 📖 **Documentação:** `DOCKER-COMPOSE-ANALYSIS.md`
- 📖 **Iframe Embedding:** `IFRAME-EMBEDDING-DEFINITIVE-SOLUTION.md`
- 🚀 **Scripts:** `scripts/docker/startup-all-services.sh`, `scripts/docker/stop-gateway-stack.sh`

---

**Última atualização:** 2025-11-12 09:45 BRT
**Status:** ✅ UNIFICAÇÃO COMPLETA
