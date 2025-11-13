# Problema: Porta 9080 "Address Already in Use"

**Data:** 2025-11-12 16:30:00
**Severidade:** CRÍTICO
**Status:** ⚠️ BLOQUEANDO GATEWAY STACK

---

## 🔍 Diagnóstico

### Problema
O container `api-gateway` (Traefik) não consegue iniciar porque a porta **9080** está reportada como "em uso" pelo Docker daemon.

```
Error: failed to bind host port for 0.0.0.0:9080:172.80.0.20:9080/tcp: address already in use
```

### Investigação Realizada

✅ **Verificações concluídas:**
1. ✅ `netstat -tuln | grep 9080` → Nenhum processo encontrado
2. ✅ `docker ps | grep 9080` → Nenhum container rodando na porta
3. ✅ Removidos containers órfãos (`api-gateway`, `telegram-gateway-api`)
4. ✅ Removidos volumes do Gateway Stack
5. ✅ Verificado que porta não está em uso no sistema

❌ **Problema persiste** mesmo após todas as limpezas!

---

## 🎯 Causa Raiz Provável

Este é um **problema conhecido do Docker** quando:

### Possibilidade 1: Port Forwarding do VS Code / Dev Container
O VS Code pode estar fazendo **port forwarding** da porta 9080 antes do container iniciar, causando conflito.

**Evidência:**
- Porta não aparece em `netstat`
- Porta não aparece em `docker ps`
- Mas Docker daemon reporta "address already in use"

### Possibilidade 2: Docker Networking Bug (WSL2)
Bug conhecido no Docker + WSL2 onde o daemon trava port bindings mesmo após remover containers.

**Referências:**
- https://github.com/docker/for-win/issues/3171
- https://github.com/microsoft/WSL/issues/4150

---

## 🔧 Soluções (em ordem de preferência)

### Solução 1: Verificar Port Forwarding do VS Code ⭐ RECOMENDADA

**Passo 1:** No VS Code, abrir a aba **"Ports"** (geralmente ao lado do Terminal)

**Passo 2:** Verificar se a porta **9080** está listada

**Passo 3:** Se estiver, clicar com botão direito e selecionar **"Stop Forwarding Port"**

**Passo 4:** Tentar iniciar o Gateway Stack novamente:
```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
```

---

### Solução 2: Usar Porta Alternativa (Temporária)

**Vantagem:** Funciona imediatamente, sem precisar reiniciar Docker daemon

**Passo 1:** Editar o arquivo de configuração do Gateway:
```bash
# Abrir o arquivo
nano tools/compose/docker-compose.0-gateway-stack.yml

# Localizar a linha (aproximadamente linha 30):
#   - "9080:9080"  # HTTP
#
# Mudar para:
#   - "9082:9080"  # HTTP (porta externa alterada)
```

**Passo 2:** Salvar e iniciar:
```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
```

**Passo 3:** Acessar via nova porta:
- Gateway: http://localhost:9082
- Dashboard Traefik: http://localhost:9083 (se também mudar 9081 → 9083)

**⚠️ IMPORTANTE:** Lembrar de atualizar `.devcontainer/devcontainer.json` com a nova porta:
```json
"forwardPorts": [
  9082,  // API Gateway (era 9080)
  9083,  // Traefik Dashboard (era 9081)
  ...
]
```

---

### Solução 3: Reiniciar Docker Daemon (Requer sudo)

**Script criado:** `.devcontainer/scripts/restart-docker-daemon.sh`

```bash
#!/bin/bash
# Reiniciar Docker daemon dentro do dev container

sudo service docker stop
sleep 5
sudo service docker start
sleep 10
docker ps
```

**Executar:**
```bash
sudo bash .devcontainer/scripts/restart-docker-daemon.sh
```

**Depois:**
```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
```

---

### Solução 4: Reiniciar Dev Container (Mais drástica)

**Vantagem:** Limpa completamente o estado do Docker

**Desvantagem:** Precisa parar todos os containers e recomeçar

**Passos:**
1. Sair do dev container (fechar VS Code)
2. Reabrir VS Code
3. Selecionar "Reopen in Container"
4. Aguardar rebuild
5. Tentar iniciar Gateway Stack

---

## 📝 Ação Recomendada AGORA

**Recomendo tentar as soluções nesta ordem:**

### 1️⃣ Verificar Ports Tab no VS Code (1 minuto)
Abrir aba "Ports" e verificar se 9080 está listada.
- Se SIM → Stop Forwarding
- Se NÃO → Passar para próxima solução

### 2️⃣ Usar Porta Alternativa 9082 (5 minutos)
Editar `docker-compose.0-gateway-stack.yml` e mudar porta externa para 9082.
Funciona imediatamente sem restart.

### 3️⃣ Reiniciar Docker Daemon (10 minutos - requer sudo)
Se as anteriores não funcionarem, reiniciar o daemon do Docker.

---

## 🎯 Impacto Atual

**Serviços BLOQUEADOS pelo problema da porta 9080:**
- ❌ API Gateway (Traefik) - NÃO funcionando
- ❌ Dashboard UI - Não pode ser acessado via Gateway
- ❌ Docs Hub - Não pode ser acessado via Gateway
- ❌ Todos os serviços backend - Sem roteamento centralizado

**Serviços que FUNCIONAM via acesso direto:**
- ✅ Database Stack - Portas 5432, 6379, etc.
- ✅ N8N - Porta 5678
- ✅ Workspace API - Porta 3200
- ✅ RAG System - Portas 6333, 11434, 8201

---

## 🔄 Status de Tentativas

| Tentativa | Solução | Status | Timestamp |
|-----------|---------|--------|-----------|
| 1 | Remover container órfão | ❌ Falhou | 16:25 |
| 2 | Down -v e up | ❌ Falhou | 16:26 |
| 3 | Remover containers criados | ❌ Falhou | 16:28 |
| 4 | Verificar docker-proxy | ❌ Não encontrado | 16:29 |
| 5 | Porta alternativa | ⏸️ Aguardando | - |
| 6 | Reiniciar Docker daemon | ⏸️ Aguardando | - |

---

**Gerado em:** 2025-11-12 16:30:00
**Próxima ação:** Verificar VS Code Ports Tab ou usar porta alternativa
