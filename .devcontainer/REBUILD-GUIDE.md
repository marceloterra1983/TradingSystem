# 🔄 Guia de Rebuild do DevContainer

**Última Atualização:** 2025-11-12

Este guia detalha como fazer rebuild completo do ambiente de desenvolvimento para resolver problemas de isolamento de rede Docker-in-Docker.

---

## ⚠️ Quando Usar Este Guia

Use este rebuild quando você tiver:

- ✅ Isolamento de rede entre containers (ping/TCP timeout)
- ✅ Containers na mesma rede que não conseguem se comunicar
- ✅ Port forwarding configurado mas portas inacessíveis
- ✅ Docker daemon restart não resolveu o problema

---

## 📋 Pré-Requisitos

Antes de iniciar o rebuild:

1. **Salve seu trabalho:**
   ```bash
   git add .
   git commit -m "wip: save before devcontainer rebuild"
   ```

2. **Verifique branches:**
   ```bash
   git status
   git branch
   ```

3. **Liste containers importantes:**
   ```bash
   docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"
   ```

---

## 🛠️ Opção 1: Rebuild via VSCode (Recomendado)

### Passo 1: Abrir Command Palette

**Windows/Linux:** `Ctrl + Shift + P`
**Mac:** `Cmd + Shift + P`

### Passo 2: Executar Rebuild

Digite e selecione:
```
Dev Containers: Rebuild Container
```

**OU**

```
Dev Containers: Rebuild and Reopen in Container
```

### Passo 3: Aguardar Rebuild

O VSCode irá:
1. Salvar estado atual do workspace
2. Parar o devcontainer atual
3. Remover containers antigos
4. Reconstruir imagem do devcontainer
5. Recriar containers Docker-in-Docker
6. Executar scripts de post-create/post-start
7. Reconectar VSCode ao novo container

**Tempo Estimado:** 5-10 minutos

### Passo 4: Verificar Ambiente

Após rebuild, execute:

```bash
# Verificar que está dentro do devcontainer
echo $DEVCONTAINER

# Verificar Docker funcional
docker ps

# Verificar redes Docker
docker network ls | grep tradingsystem
```

---

## 🛠️ Opção 2: Rebuild Manual via CLI

Se você preferir controle total ou o rebuild via VSCode falhar:

### Passo 1: Sair do DevContainer

No VSCode, feche a janela ou use:
```
Dev Containers: Reopen Folder Locally
```

### Passo 2: Limpar Ambiente Antigo

```bash
# Parar todos os containers
docker ps -aq | xargs docker stop 2>/dev/null

# Remover containers do devcontainer
docker rm -f $(docker ps -aq --filter "label=devcontainer.local_folder=/home/marce/Projetos/TradingSystem") 2>/dev/null

# Remover redes Docker (opcional - serão recriadas)
docker network rm tradingsystem_backend tradingsystem_frontend tp_capital_backend 2>/dev/null

# Limpar volumes órfãos (opcional)
docker volume prune -f
```

### Passo 3: Rebuild Imagem

```bash
cd /home/marce/Projetos/TradingSystem

# Rebuild da imagem do devcontainer
docker compose -f .devcontainer/docker-compose.yml build --no-cache
```

### Passo 4: Reabrir no DevContainer

No VSCode:
```
Dev Containers: Reopen in Container
```

---

## 🧪 Passo 5: Testar Conectividade (CRÍTICO)

Após o rebuild, **ANTES** de iniciar as stacks, teste a conectividade básica:

### Teste 1: Criar Redes Docker

```bash
docker network create tradingsystem_backend
docker network create tradingsystem_frontend
docker network create tp_capital_backend
```

### Teste 2: Iniciar Gateway

```bash
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
```

### Teste 3: Iniciar Dashboard

```bash
docker compose -f tools/compose/docker-compose.1-dashboard-stack.yml up -d
```

### Teste 4: Testar PING

```bash
# Aguardar containers iniciarem
sleep 10

# Teste de ping
docker exec dashboard-ui ping -c 3 api-gateway

# Resultado esperado:
# 3 packets transmitted, 3 packets received, 0% packet loss
```

### Teste 5: Testar HTTP

```bash
# Teste HTTP interno (container → container)
docker exec dashboard-ui wget -qO- http://api-gateway:9080/api/overview

# Resultado esperado: JSON com overview da API
```

### Teste 6: Testar Port Forwarding

```bash
# Do terminal do devcontainer (não de dentro de outro container)
curl http://localhost:9080/api/overview

# Resultado esperado: JSON com overview da API
```

---

## ✅ Critérios de Sucesso

O rebuild foi bem-sucedido se:

- ✅ **Teste 4 (PING)**: 0% packet loss
- ✅ **Teste 5 (HTTP interno)**: Retorna JSON válido
- ✅ **Teste 6 (Port forwarding)**: Retorna JSON válido
- ✅ `docker ps` mostra containers `healthy`
- ✅ `docker network inspect tradingsystem_backend` mostra containers conectados

---

## ❌ Se o Rebuild Não Resolver

Se mesmo após rebuild o isolamento persistir:

### Opção A: Verificar Docker Daemon no WSL2

```bash
# No WSL2 (fora do devcontainer)
cat /etc/docker/daemon.json

# Procurar por:
# "icc": false  ← Se existir, MUDAR para true
```

**daemon.json correto:**
```json
{
  "icc": true,
  "iptables": true,
  "ip-forward": true
}
```

Após alterar:
```bash
sudo service docker restart
```

### Opção B: Desabilitar Docker-in-Docker

**ÚLTIMA OPÇÃO** - Modifica arquitetura do projeto.

Editar `.devcontainer/devcontainer.json`:

```json
{
  // Remover feature de Docker-in-Docker
  "features": {
    // "ghcr.io/devcontainers/features/docker-in-docker:2": {...}, // COMENTAR
  },

  // Usar Docker do host
  "mounts": [
    "source=/var/run/docker.sock,target=/var/run/docker.sock,type=bind"
  ]
}
```

**Desvantagens:**
- Containers rodam no host, não isolados no devcontainer
- Pode haver conflitos de porta com outros projetos
- Menos portabilidade

---

## 🔍 Diagnóstico de Problemas

### Problema: "Cannot connect to Docker daemon"

```bash
# Verificar se Docker está rodando
sudo service docker status

# Reiniciar se necessário
sudo service docker restart
```

### Problema: "Network ... already exists"

```bash
# Remover rede existente
docker network rm tradingsystem_backend

# Recriar
docker network create tradingsystem_backend
```

### Problema: "Port already in use"

```bash
# Identificar processo usando a porta
sudo lsof -i:9080

# Parar container ocupando a porta
docker stop $(docker ps -q --filter "publish=9080")
```

---

## 📚 Referências

- **Status Atual:** [STARTUP-FINAL-STATUS.md](../STARTUP-FINAL-STATUS.md)
- **Diagnóstico de Rede:** [GATEWAY-CONNECTIVITY-DIAGNOSIS.md](../GATEWAY-CONNECTIVITY-DIAGNOSIS.md)
- **Docker Compose Stacks:** [tools/compose/](../tools/compose/)
- **DevContainer Config:** [.devcontainer/devcontainer.json](.devcontainer/devcontainer.json)

---

## 💡 Dicas

1. **Sempre teste conectividade ANTES** de iniciar todas as stacks
2. **Use `docker logs`** para diagnosticar containers que falham
3. **Verifique health checks** com `docker inspect <container> | grep Health`
4. **Mantenha backups** de configurações importantes antes de rebuild

---

**Última Atualização:** 2025-11-12 15:30 BRT
