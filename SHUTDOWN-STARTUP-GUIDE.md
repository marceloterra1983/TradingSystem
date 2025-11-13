# TradingSystem - Guia de Shutdown e Startup

**Data de Criação:** 2025-11-12
**Última Atualização:** 2025-11-12

---

## 🔴 SHUTDOWN COMPLETO (Antes de Desligar o Computador)

### Passo 1: Parar Todos os Containers Docker

```bash
cd /workspace/tools/compose

# Parar Gateway (primeiro, para interromper tráfego)
docker compose -f docker-compose.0-gateway-stack.yml down

# Parar Dashboard
docker compose -f docker-compose.1-dashboard-stack.yml down

# Parar Documentação
docker compose -f docker-compose.2-docs-stack.yml down

# Parar Workspace
docker compose -f docker-compose.4-3-workspace-stack.yml down

# Parar TP Capital
docker compose -f docker-compose.4-1-tp-capital-stack.yml down

# Parar Telegram Gateway (12 containers)
docker compose -f docker-compose.4-2-telegram-stack-minimal-ports.yml down

# Parar Database Stack
docker compose -f docker-compose.5-0-database-stack.yml down

# Parar N8N
docker compose -f docker-compose-5-1-n8n-stack.yml down

# Parar Kestra
docker compose -f docker-compose.5-5-kestra-stack.yml down

# Parar Firecrawl
docker compose -f docker-compose.5-7-firecrawl-stack.yml down

# Parar RAG Stack (se estiver rodando)
docker compose -f docker-compose.4-4-rag-stack.yml down 2>/dev/null || true

# Parar Monitoring (se estiver rodando)
docker compose -f ../monitoring/docker-compose.yml down 2>/dev/null || true
```

### Passo 2: Script Automatizado de Shutdown

**Arquivo:** `/workspace/scripts/docker/shutdown-all.sh`

```bash
#!/bin/bash

echo "🔴 Iniciando shutdown completo do TradingSystem..."
echo ""

cd /workspace/tools/compose

# Array de stacks na ordem reversa de startup
STACKS=(
    "docker-compose.0-gateway-stack.yml"
    "docker-compose.1-dashboard-stack.yml"
    "docker-compose.2-docs-stack.yml"
    "docker-compose.4-3-workspace-stack.yml"
    "docker-compose.4-1-tp-capital-stack.yml"
    "docker-compose.4-2-telegram-stack-minimal-ports.yml"
    "docker-compose.5-0-database-stack.yml"
    "docker-compose-5-1-n8n-stack.yml"
    "docker-compose.5-5-kestra-stack.yml"
    "docker-compose.5-7-firecrawl-stack.yml"
)

for stack in "${STACKS[@]}"; do
    if [ -f "$stack" ]; then
        echo "⏹️  Parando stack: $stack"
        docker compose -f "$stack" down
        echo ""
    fi
done

echo "✅ Shutdown completo!"
echo ""
echo "📊 Containers restantes:"
docker ps --format "table {{.Names}}\t{{.Status}}"
```

**Usar:**
```bash
bash /workspace/scripts/docker/shutdown-all.sh
```

---

## 🟢 STARTUP COMPLETO (Ao Reiniciar o Computador)

### Ordem de Inicialização (CRÍTICA!)

**A ordem é MUITO IMPORTANTE** para evitar falhas de dependência:

1. **Redes Docker** (criadas automaticamente)
2. **Database Stack** (banco de dados primeiro)
3. **TP Capital Stack** (precisa do banco)
4. **Workspace Stack**
5. **Telegram Stack**
6. **Gateway (Traefik)** (API Gateway precisa ver os serviços)
7. **Dashboard** (precisa do Gateway)
8. **Documentação** (pode ser por último)
9. **Serviços opcionais** (N8N, Kestra, Firecrawl)

### Passo 1: Verificar Redes Docker

```bash
# Verificar se as redes existem
docker network ls | grep tradingsystem

# Criar redes se não existirem (normalmente criadas automaticamente)
docker network create tradingsystem_backend 2>/dev/null || true
docker network create tradingsystem_frontend 2>/dev/null || true
docker network create tp_capital_backend 2>/dev/null || true
```

### Passo 2: Startup na Ordem Correta

```bash
cd /workspace/tools/compose

# 1. Database Stack (PRIMEIRO!)
echo "1️⃣  Iniciando Database Stack..."
docker compose -f docker-compose.5-0-database-stack.yml up -d
sleep 10  # Aguardar banco de dados ficar pronto

# 2. TP Capital Stack
echo "2️⃣  Iniciando TP Capital Stack..."
docker compose -f docker-compose.4-1-tp-capital-stack.yml up -d
sleep 5

# 3. Workspace Stack
echo "3️⃣  Iniciando Workspace Stack..."
docker compose -f docker-compose.4-3-workspace-stack.yml up -d
sleep 5

# 4. Telegram Stack (12 containers)
echo "4️⃣  Iniciando Telegram Stack..."
docker compose -f docker-compose.4-2-telegram-stack-minimal-ports.yml up -d
sleep 10  # Aguardar todos os 12 containers

# 5. Gateway (Traefik) - Antes do Dashboard!
echo "5️⃣  Iniciando API Gateway (Traefik)..."
docker compose -f docker-compose.0-gateway-stack.yml up -d
sleep 5

# 6. Dashboard
echo "6️⃣  Iniciando Dashboard..."
docker compose -f docker-compose.1-dashboard-stack.yml up -d
sleep 5

# 7. Documentação
echo "7️⃣  Iniciando Documentation Stack..."
docker compose -f docker-compose.2-docs-stack.yml up -d
sleep 3

# 8. Serviços Opcionais (se necessário)
echo "8️⃣  Iniciando serviços opcionais..."
docker compose -f docker-compose-5-1-n8n-stack.yml up -d 2>/dev/null || true
docker compose -f docker-compose.5-5-kestra-stack.yml up -d 2>/dev/null || true
docker compose -f docker-compose.5-7-firecrawl-stack.yml up -d 2>/dev/null || true

echo ""
echo "✅ Startup completo!"
```

### Passo 3: Script Automatizado de Startup

**Arquivo:** `/workspace/scripts/docker/startup-all.sh`

```bash
#!/bin/bash

echo "🟢 Iniciando startup completo do TradingSystem..."
echo ""

cd /workspace/tools/compose

# Verificar redes
echo "📡 Verificando redes Docker..."
docker network create tradingsystem_backend 2>/dev/null || echo "   ✅ tradingsystem_backend já existe"
docker network create tradingsystem_frontend 2>/dev/null || echo "   ✅ tradingsystem_frontend já existe"
docker network create tp_capital_backend 2>/dev/null || echo "   ✅ tp_capital_backend já existe"
echo ""

# Array de stacks na ordem correta
declare -A STACKS
STACKS=(
    ["1-database"]="docker-compose.5-0-database-stack.yml|10|Database Stack"
    ["2-tpcapital"]="docker-compose.4-1-tp-capital-stack.yml|5|TP Capital Stack"
    ["3-workspace"]="docker-compose.4-3-workspace-stack.yml|5|Workspace Stack"
    ["4-telegram"]="docker-compose.4-2-telegram-stack-minimal-ports.yml|10|Telegram Stack (12 containers)"
    ["5-gateway"]="docker-compose.0-gateway-stack.yml|5|API Gateway (Traefik)"
    ["6-dashboard"]="docker-compose.1-dashboard-stack.yml|5|Dashboard"
    ["7-docs"]="docker-compose.2-docs-stack.yml|3|Documentation"
)

# Iterar na ordem
for key in $(echo "${!STACKS[@]}" | tr ' ' '\n' | sort); do
    IFS='|' read -r file wait_time description <<< "${STACKS[$key]}"

    if [ -f "$file" ]; then
        echo "▶️  Iniciando: $description"
        docker compose -f "$file" up -d
        echo "   ⏳ Aguardando ${wait_time}s para estabilização..."
        sleep "$wait_time"
        echo ""
    fi
done

# Serviços opcionais (não bloqueiam se falharem)
echo "8️⃣  Iniciando serviços opcionais..."
docker compose -f docker-compose-5-1-n8n-stack.yml up -d 2>/dev/null && echo "   ✅ N8N iniciado" || echo "   ⚠️  N8N não disponível (opcional)"
docker compose -f docker-compose.5-5-kestra-stack.yml up -d 2>/dev/null && echo "   ✅ Kestra iniciado" || echo "   ⚠️  Kestra não disponível (opcional)"
docker compose -f docker-compose.5-7-firecrawl-stack.yml up -d 2>/dev/null && echo "   ✅ Firecrawl iniciado" || echo "   ⚠️  Firecrawl não disponível (opcional)"
echo ""

echo "✅ Startup completo!"
echo ""
echo "📊 Containers em execução:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | head -20
echo ""
echo "🌐 Acesse:"
echo "   - Dashboard: http://localhost:9082/"
echo "   - Documentação: http://localhost:9082/docs/"
echo "   - Traefik Dashboard: http://localhost:9083/dashboard/"
```

**Usar:**
```bash
bash /workspace/scripts/docker/startup-all.sh
```

---

## 🔍 Validação Pós-Startup

### Script de Validação Rápida

```bash
#!/bin/bash

echo "🔍 Validando serviços..."
echo ""

# Verificar containers críticos
CRITICAL_CONTAINERS=(
    "api-gateway"
    "dashboard-ui"
    "docs-hub"
    "workspace-service"
    "tp-capital-api"
    "tp-capital-timescale"
    "tp-capital-redis-master"
)

echo "📦 Verificando containers críticos:"
for container in "${CRITICAL_CONTAINERS[@]}"; do
    if docker ps --format '{{.Names}}' | grep -q "^${container}$"; then
        status=$(docker inspect --format='{{.State.Health.Status}}' "$container" 2>/dev/null || echo "no-healthcheck")
        if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
            echo "   ✅ $container - Running"
        else
            echo "   ⚠️  $container - Unhealthy ($status)"
        fi
    else
        echo "   ❌ $container - NOT RUNNING"
    fi
done
echo ""

# Testar endpoints
echo "🌐 Testando endpoints HTTP:"

# Dashboard
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/ 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Dashboard: http://localhost:9082/ (HTTP $response)"
else
    echo "   ❌ Dashboard: http://localhost:9082/ (HTTP $response)"
fi

# Documentação
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/docs/ 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Docs: http://localhost:9082/docs/ (HTTP $response)"
else
    echo "   ❌ Docs: http://localhost:9082/docs/ (HTTP $response)"
fi

# Traefik Dashboard
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9083/dashboard/ 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Traefik: http://localhost:9083/dashboard/ (HTTP $response)"
else
    echo "   ❌ Traefik: http://localhost:9083/dashboard/ (HTTP $response)"
fi

# Workspace API
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:9082/api/workspace/health 2>/dev/null || echo "000")
if [ "$response" = "200" ]; then
    echo "   ✅ Workspace API: http://localhost:9082/api/workspace/health (HTTP $response)"
else
    echo "   ❌ Workspace API: http://localhost:9082/api/workspace/health (HTTP $response)"
fi

echo ""
echo "✅ Validação completa!"
```

---

## 📝 Checklist de Startup

### Antes de Desligar o Computador

- [ ] Executar `/workspace/scripts/docker/shutdown-all.sh`
- [ ] Verificar que todos os containers pararam: `docker ps`
- [ ] (Opcional) Fazer backup de volumes importantes

### Ao Reiniciar o Computador

- [ ] Abrir WSL2 / Terminal Linux
- [ ] Navegar para `/workspace`
- [ ] Executar `/workspace/scripts/docker/startup-all.sh`
- [ ] Aguardar ~2 minutos para todos os serviços ficarem prontos
- [ ] Executar script de validação (opcional)
- [ ] Acessar http://localhost:9082/ no browser

---

## 🐛 Troubleshooting Comum

### Problema 1: Container não inicia após restart

**Sintoma:**
```
Error: port is already allocated
```

**Solução:**
```bash
# Verificar processos nas portas
sudo lsof -i :9082
sudo lsof -i :9083

# Matar processos se necessário
sudo lsof -ti :9082 | xargs sudo kill -9
sudo lsof -ti :9083 | xargs sudo kill -9
```

### Problema 2: Rede não existe

**Sintoma:**
```
Error: network tradingsystem_backend not found
```

**Solução:**
```bash
# Criar redes manualmente
docker network create tradingsystem_backend
docker network create tradingsystem_frontend
docker network create tp_capital_backend
```

### Problema 3: Volumes com permissões incorretas

**Sintoma:**
```
Error: permission denied
```

**Solução:**
```bash
# Recriar volume problemático
docker volume rm nome-do-volume
docker compose up -d --force-recreate
```

### Problema 4: Docusaurus sem CSS

**Sintoma:** Página carrega mas sem formatação

**Solução:**
```bash
# Verificar se baseUrl está correto
grep "baseUrl" /workspace/docs/docusaurus.config.js
# Deve mostrar: baseUrl: '/docs/',

# Rebuildar se necessário
cd /workspace/docs
npm run build

# Copiar para container
docker cp /workspace/docs/build/. docs-hub:/usr/share/nginx/html/
```

---

## 📚 Scripts de Referência

Todos os scripts estão em `/workspace/scripts/docker/`:

- `shutdown-all.sh` - Shutdown completo
- `startup-all.sh` - Startup completo na ordem correta
- `validate-all.sh` - Validação de serviços
- `validate-traefik-routers.sh` - Validação específica do Traefik

---

**Criado em:** 2025-11-12
**Por:** Claude Code AI Assistant
**Versão:** 1.0
