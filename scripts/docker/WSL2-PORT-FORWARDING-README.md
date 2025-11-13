# WSL2 Docker Port Forwarding Solution

## 🔍 Problema Identificado

No WSL2 com Docker Desktop, as portas mapeadas pelos containers não ficam acessíveis no host (`localhost`), apesar de aparecerem corretamente em `docker port` e `docker inspect`.

### Sintomas

- ✅ Container rodando e saudável: `docker ps` mostra status `healthy`
- ✅ Portas mapeadas corretamente: `docker port api-gateway` mostra `9080/tcp -> 0.0.0.0:9082`
- ❌ Porta não acessível no host: `curl http://localhost:9082` retorna `Connection refused`
- ❌ Nenhum processo escutando: `lsof -i :9082` retorna vazio

### Causa Raiz

O **Docker Desktop no WSL2** gerencia o daemon Docker pelo Windows, não pelo WSL2. Os **port bindings** dependem de um proxy de portas entre WSL2 e Windows que, às vezes, não é criado corretamente, especialmente após:

- Reinicialização do Windows
- Suspensão/hibernação do sistema
- Alterações nas configurações de rede
- Muitos containers sendo criados/destruídos rapidamente

## ✅ Solução Implementada

Criamos um **workaround usando `socat`** que cria túneis TCP locais do WSL2 para os containers Docker, contornando o problema de port binding do Docker Desktop.

### Scripts Criados

#### 1. `wsl2-port-forward.sh` - Gerenciador de Port Forwarding

**Localização:** `/workspace/scripts/docker/wsl2-port-forward.sh`

**Funcionalidades:**
- Cria túneis `socat` de `localhost:PORT` → `CONTAINER_IP:INTERNAL_PORT`
- Detecta automaticamente o IP do container Traefik
- Gerencia processos em background
- Fornece comandos de start/stop/restart/status

**Uso:**

```bash
# Iniciar port forwarding
bash scripts/docker/wsl2-port-forward.sh start

# Parar port forwarding
bash scripts/docker/wsl2-port-forward.sh stop

# Reiniciar port forwarding
bash scripts/docker/wsl2-port-forward.sh restart

# Ver status
bash scripts/docker/wsl2-port-forward.sh status
```

**Portas Mapeadas:**
- `localhost:9082` → `api-gateway:9080` (HTTP Gateway)
- `localhost:9083` → `api-gateway:8080` (Traefik Dashboard)

#### 2. `start-gateway-stack.sh` - Startup Automático Integrado

**Localização:** `/workspace/scripts/docker/start-gateway-stack.sh`

**Modificações:**
- Adicionada função `start_port_forwarding()` que é chamada automaticamente após o gateway ficar healthy
- Detecta se está rodando em WSL2 (`grep -qi microsoft /proc/version`)
- Inicia o port forwarding silenciosamente em background
- Não interrompe o startup se o port forwarding falhar (graceful degradation)

**Uso:**

```bash
# Inicia o gateway E configura port forwarding automaticamente
bash scripts/docker/start-gateway-stack.sh
```

#### 3. `fix-docker-ports-wsl2.sh` - Diagnóstico e Resolução

**Localização:** `/workspace/scripts/docker/fix-docker-ports-wsl2.sh`

**Funcionalidades:**
- Diagnostica o problema de port binding
- Mostra status dos containers e portas
- Oferece 3 opções para reiniciar o Docker Desktop
- Pode executar automaticamente via PowerShell

**Uso:**

```bash
# Executar diagnóstico e resolver
bash scripts/docker/fix-docker-ports-wsl2.sh
```

## 🧪 Validação

Todos os endpoints CRUD da API de canais foram testados com sucesso:

```bash
# 1. Listar canais
curl http://localhost:9082/api/channels
# ✅ Retorna lista de canais

# 2. Criar canal
curl -X POST http://localhost:9082/api/channels \
  -H "Content-Type: application/json" \
  -d '{"channelId": "-1009999999999", "label": "Teste", "isActive": true}'
# ✅ Canal criado com sucesso

# 3. Atualizar canal
curl -X PUT http://localhost:9082/api/channels/3 \
  -H "Content-Type: application/json" \
  -d '{"isActive": false}'
# ✅ Canal atualizado

# 4. Deletar canal
curl -X DELETE http://localhost:9082/api/channels/3
# ✅ Canal deletado
```

## 🚀 Como Usar (Quickstart)

### Primeira Vez (Setup)

1. **Garantir que o Traefik está rodando:**
   ```bash
   docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d
   ```

2. **Iniciar port forwarding:**
   ```bash
   bash scripts/docker/wsl2-port-forward.sh start
   ```

3. **Validar conectividade:**
   ```bash
   curl http://localhost:9082/api/channels
   ```

### Uso Diário

**Opção 1 - Automático (Recomendado):**
```bash
bash scripts/docker/start-gateway-stack.sh
```
O port forwarding será configurado automaticamente.

**Opção 2 - Manual:**
```bash
# 1. Iniciar containers Docker
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml up -d

# 2. Iniciar port forwarding
bash scripts/docker/wsl2-port-forward.sh start
```

### Parar Serviços

```bash
# Parar port forwarding
bash scripts/docker/wsl2-port-forward.sh stop

# Parar containers
docker compose -f tools/compose/docker-compose.0-gateway-stack.yml down
```

## 🛠️ Troubleshooting

### Port forwarding não está funcionando

```bash
# 1. Verificar status
bash scripts/docker/wsl2-port-forward.sh status

# 2. Reiniciar port forwarding
bash scripts/docker/wsl2-port-forward.sh restart

# 3. Verificar se socat está instalado
which socat
# Se não estiver: sudo apt-get install socat

# 4. Verificar se processos socat estão rodando
ps aux | grep socat
```

### Container IP mudou após restart

```bash
# O script wsl2-port-forward.sh detecta automaticamente o novo IP
# Basta reiniciar o port forwarding:
bash scripts/docker/wsl2-port-forward.sh restart
```

### Porta ainda não acessível

```bash
# 1. Verificar se container está rodando
docker ps --filter name=api-gateway

# 2. Verificar se está healthy
docker inspect api-gateway | jq '.[0].State.Health.Status'

# 3. Testar acesso direto ao container
GATEWAY_IP=$(docker inspect api-gateway | jq -r '.[0].NetworkSettings.Networks.tradingsystem_backend.IPAddress')
curl http://$GATEWAY_IP:9080/
```

## 📊 Arquitetura da Solução

```
Browser/CLI Request
        ↓
   localhost:9082
        ↓
   socat tunnel (WSL2)
        ↓
   172.20.0.14:9080 (Container IP)
        ↓
   Traefik Gateway
        ↓
   Backend Services
```

## ⚠️ Limitações Conhecidas

1. **Container IP pode mudar:** Após restart do Docker, o IP do container pode mudar. Solução: reiniciar o port forwarding.

2. **Processos em background:** Os processos `socat` rodam em background. Não esqueça de parar com `bash scripts/docker/wsl2-port-forward.sh stop`.

3. **WSL2 específico:** Esta solução só é necessária no WSL2. Em Docker nativo no Linux, as portas funcionam normalmente.

4. **Requer socat:** O pacote `socat` será instalado automaticamente se não estiver presente (requer `sudo`).

## 🔄 Próximos Passos (Melhorias Futuras)

- [ ] Adicionar port forwarding ao script de startup universal (`scripts/start.sh`)
- [ ] Criar serviço systemd para port forwarding automático no boot
- [ ] Adicionar suporte para mais portas (dashboard UI, outras APIs)
- [ ] Implementar health check automático que reinicia port forwarding se necessário
- [ ] Adicionar logging estruturado dos túneis socat

## 📚 Referências

- [Docker Desktop WSL2 Backend](https://docs.docker.com/desktop/wsl/)
- [WSL2 Networking](https://learn.microsoft.com/en-us/windows/wsl/networking)
- [socat Documentation](http://www.dest-unreach.org/socat/doc/socat.html)

## ✅ Status Final

**Data:** 2025-11-13
**Status:** ✅ RESOLVIDO
**Testado:** Todas as operações CRUD funcionando via `http://localhost:9082/api/channels`
**Performance:** Sem overhead perceptível (socat é extremamente eficiente)
**Estabilidade:** Estável após múltiplos testes de restart
