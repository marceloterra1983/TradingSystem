# 🎯 TP Capital: Host vs. Docker - Qual Usar?

**Data:** 2025-11-02  
**Decisão:** Depende do contexto (dev vs. prod)

---

## 📋 **RESUMO DA DECISÃO**

| Cenário | Recomendação | Comando |
|---------|--------------|---------|
| **Desenvolvimento Ativo** | ✅ **Host** | `node src/server.js` |
| **Testes Locais** | ✅ **Host** | `node src/server.js` |
| **Produção** | ✅ **Docker** | `docker compose up -d tp-capital` |
| **CI/CD** | ✅ **Docker** | `docker compose up -d tp-capital` |
| **Deploy para Servidor** | ✅ **Docker** | `docker compose up -d tp-capital` |

---

## 🔍 **ANÁLISE DETALHADA**

### 1. Rodar no Host (Atual)

**Quando Usar:**
- ✅ Desenvolvimento ativo (você está mudando código frequentemente)
- ✅ Debugging intensivo
- ✅ Testes rápidos
- ✅ Quando precisa de hot-reload instantâneo

**Vantagens:**
- ⚡ **Hot-reload instantâneo** - Mudanças refletem sem rebuild
- 🐛 **Debugging fácil** - Logs diretos no terminal, breakpoints funcionam
- 🚀 **Startup rápido** - Sem overhead do Docker
- 💡 **Iteração rápida** - Ciclo dev → test → fix mais ágil

**Desvantagens:**
- ❌ **Ambiente diferente de produção** - "Works on my machine"
- ❌ **Dependências locais** - Precisa ter Node.js, npm, etc instalados
- ❌ **Sem isolamento** - Pode conflitar com outras apps
- ❌ **Menos portável** - Difícil de replicar em outro PC
- ❌ **Gerenciamento manual** - Precisa lembrar de iniciar/parar

**Comando:**
```bash
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
export TELEGRAM_GATEWAY_PORT=4010
node src/server.js &
```

---

### 2. Rodar em Docker Container (Recomendado para Produção)

**Quando Usar:**
- ✅ **Produção** (deployment real)
- ✅ **Staging/QA** (testes antes de produção)
- ✅ **CI/CD pipelines** (GitHub Actions, GitLab CI)
- ✅ **Deploy em servidor remoto**
- ✅ Quando precisa de **consistência entre ambientes**

**Vantagens:**
- 🐳 **Isolamento completo** - Não afeta outras apps
- 📦 **Portabilidade** - Funciona igual em qualquer lugar (dev, staging, prod)
- 🔒 **Consistência** - "Mesma imagem = mesmo comportamento"
- 🔄 **Auto-restart** - Docker Compose reinicia automaticamente se crashar
- 📊 **Orquestração** - Pode usar Docker Swarm, Kubernetes, etc
- 🛡️ **Segurança** - Isolamento de rede, recursos limitados
- 📝 **Logs centralizados** - `docker logs apps-tpcapital`

**Desvantagens:**
- 🐌 **Rebuild obrigatório** - Mudanças no código requerem rebuild da imagem
- ⏱️ **Startup mais lento** - Overhead do container
- 💾 **Uso de disco** - Imagens ocupam espaço
- 🔧 **Complexidade** - Precisa entender Docker, Dockerfile, Compose

**Comando:**
```bash
# Rebuildar com código novo (IMPORTANTE!)
bash scripts/setup/rebuild-tp-capital-docker.sh

# Ou manualmente:
docker compose -f tools/compose/docker-compose.apps.yml build tp-capital
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital
```

---

## 🎯 **RECOMENDAÇÃO FINAL**

### Durante Desenvolvimento (Agora):
```bash
# ✅ Rodar no host para iteração rápida
cd apps/tp-capital
export TELEGRAM_GATEWAY_PORT=4010
node src/server.js
```

### Antes de Commit/Push:
```bash
# ✅ Testar em Docker para garantir que funciona
bash scripts/setup/rebuild-tp-capital-docker.sh
```

### Em Produção:
```bash
# ✅ SEMPRE usar Docker
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital
```

---

## 🔧 **SOLUÇÃO HÍBRIDA (MELHOR DOS DOIS MUNDOS)**

### Opção 1: Docker com Hot-Reload (Volumes)

O `docker-compose.apps.yml` JÁ TEM isso configurado:

```yaml
volumes:
  # Hot-reload: mount source code
  - ../../apps/tp-capital/src:/app/src:ro
  - ../../apps/tp-capital/api:/app/api:ro
```

**Problema:** O Dockerfile precisa usar `nodemon` para recarregar automaticamente.

**Verificar:**
```bash
# Ver se Dockerfile usa nodemon
cat apps/tp-capital/Dockerfile.dev | grep nodemon
```

Se não usar, adicionar:
```dockerfile
CMD ["npx", "nodemon", "src/server.js"]
```

---

### Opção 2: Usar `docker compose watch` (Docker Compose v2.22+)

```yaml
# Adicionar ao docker-compose.apps.yml:
tp-capital:
  develop:
    watch:
      - action: sync
        path: ./apps/tp-capital/src
        target: /app/src
      - action: rebuild
        path: ./apps/tp-capital/package.json
```

**Uso:**
```bash
docker compose -f tools/compose/docker-compose.apps.yml watch
```

---

## 📊 **COMPARAÇÃO LADO A LADO**

| Aspecto | Host | Docker |
|---------|------|--------|
| **Startup** | ⚡ 2s | 🐌 15s |
| **Hot-reload** | ✅ Instantâneo | ⚠️ Requer volume mount + nodemon |
| **Debugging** | ✅ Fácil | ⚠️ Requer attach ao container |
| **Isolamento** | ❌ Nenhum | ✅ Total |
| **Portabilidade** | ❌ Baixa | ✅ Alta |
| **Produção** | ❌ Não recomendado | ✅ Recomendado |
| **CI/CD** | ❌ Difícil | ✅ Fácil |
| **Clustering** | ❌ Manual | ✅ Automático (Swarm/K8s) |

---

## 🎯 **DECISÃO PARA O TRADINGSYSTEM**

### Recomendação Atual:

1. **Agora (Dev Ativo):**
   - ✅ **Rodar no host** (como está agora)
   - Motivo: Iteração rápida, debugging fácil

2. **Antes de Deploy:**
   - ✅ **Rebuildar Docker** e testar
   - Script: `bash scripts/setup/rebuild-tp-capital-docker.sh`

3. **Em Produção:**
   - ✅ **SEMPRE usar Docker**
   - Motivo: Consistência, isolamento, auto-restart

---

## 🚀 **COMANDOS RÁPIDOS**

### Mudar de Host → Docker:
```bash
# Parar host
pkill -f "node src/server.js"

# Rebuildar e iniciar Docker
bash scripts/setup/rebuild-tp-capital-docker.sh
```

### Mudar de Docker → Host:
```bash
# Parar Docker
docker compose -f tools/compose/docker-compose.apps.yml stop tp-capital

# Iniciar host
cd apps/tp-capital
export TELEGRAM_GATEWAY_PORT=4010
node src/server.js &
```

---

## 📝 **PRÓXIMO PASSO**

**Quer continuar no host (dev) ou mudar para Docker (mais próximo de prod)?**

### Opção A: Continuar no Host (Desenvolvimento)
```bash
# Já está rodando! Nada a fazer.
# Continuar desenvolvendo normalmente
```

### Opção B: Mudar para Docker (Produção-Ready)
```bash
bash scripts/setup/rebuild-tp-capital-docker.sh
```

---

**Última Atualização:** 2025-11-02 23:50 UTC  
**Decisão:** Dev = Host, Prod = Docker  
**Script:** `scripts/setup/rebuild-tp-capital-docker.sh` (criado)

