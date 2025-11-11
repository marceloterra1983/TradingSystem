# Telegram Stack Recovery Guide

**Data:** 2025-11-11
**Status:** Procedimento de Recuperação Completo

## 🎯 Objetivo

Este guia fornece o procedimento definitivo para resolver conflitos de porta e iniciar a stack Telegram de forma estável e sem erros.

## 🔍 Problema Identificado

**Sintomas:**
- Erro `address already in use` para portas 5434, 6379, 5435, 5436
- Containers não iniciam mesmo sem processos visíveis usando as portas
- Locks de rede persistentes do Docker/iptables

**Causa Raiz:**
- Locks de rede do Docker após múltiplos start/stop
- Estado corrupto no netfilter/iptables
- Containers "fantasma" mantendo portas reservadas

## ✅ Solução Implementada

### 1. Scripts Criados

**Detecção de Conflitos:**
- `scripts/docker/port-conflict-resolver.sh` - Detecta conflitos antes do startup
- Verifica todas as portas necessárias para cada stack
- Identifica processos ocupando portas

**Reset de Rede Docker (requer sudo):**
- `.claude/sudo-scripts/docker-network-reset.sh` - Reset completo do Docker
- Para daemon, limpa iptables, remove locks
- Solução definitiva para locks persistentes

**Startup Automatizado:**
- `scripts/docker/start-telegram-stack.sh` - Inicialização segura
- Valida configuração e portas antes de iniciar
- Health check automático após startup

### 2. Mudanças de Porta

**Portas Atualizadas (para evitar conflitos futuros):**

| Serviço | Porta Antiga | Porta Nova | Motivo |
|---------|--------------|------------|--------|
| Telegram TimescaleDB | 5434 | **5436** | Lock persistente |
| Telegram Redis Master | 6379 | **6383** | Conflito com outros Redis |

**Arquivos Atualizados:**
- `.env` - Valores de override
- `config/.env.defaults` - Valores padrão
- `tools/compose/docker-compose.4-2-telegram-stack.yml` - Variáveis dinâmicas (sem hardcode)

### 3. Documentação

**Port Allocation Map:**
- `docs/PORT-ALLOCATION.md` - Mapeamento completo de portas
- Deve ser atualizado sempre que alocar novas portas
- Referência oficial para prevenção de conflitos

## 🚀 Procedimento de Execução

### Passo 1: Reset do Docker (NECESSÁRIO)

Execute o script de reset para limpar locks de rede:

```bash
sudo bash .claude/sudo-scripts/docker-network-reset.sh
```

**O que este script faz:**
1. Para todos os containers Docker
2. Para o Docker daemon
3. Limpa regras de iptables do Docker
4. Remove interfaces de rede virtuais travadas
5. Libera portas críticas (5434, 5435, 5436, 6379, 6383)
6. Reinicia o Docker daemon
7. Faz prune de networks órfãs

**Tempo estimado:** 1-2 minutos

### Passo 2: Verificar Portas (Opcional mas Recomendado)

Antes de iniciar a stack, verifique se as portas estão livres:

```bash
bash scripts/docker/port-conflict-resolver.sh telegram
```

**Output esperado:**
```
✅ Port 5436 (timescaledb) is available
✅ Port 6383 (redis-master) is available
✅ Port 6385 (redis-replica) is available
✅ All ports are available for telegram stack!
```

### Passo 3: Iniciar Telegram Stack

Use o script automatizado de startup:

```bash
bash scripts/docker/start-telegram-stack.sh
```

**O que este script faz:**
1. Verifica pré-requisitos (Docker, compose file, .env)
2. Carrega variáveis de ambiente corretamente
3. Detecta conflitos de porta
4. Para versão anterior da stack (se existir)
5. Inicia stack com variáveis corretas
6. Aguarda health checks (até 60s)
7. Mostra status final e endpoints

**Tempo estimado:** 2-3 minutos (inclui health checks)

### Passo 4: Verificar Status

Após o startup, confirme que todos os serviços estão rodando:

```bash
docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml ps
```

**Output esperado:**
```
NAME                      STATUS                   PORTS
telegram-gateway-api      Up (healthy)            0.0.0.0:4010->4010/tcp
telegram-mtproto          Up (healthy)            0.0.0.0:4007->4007/tcp
telegram-pgbouncer        Up (healthy)            0.0.0.0:6434->6432/tcp
telegram-rabbitmq         Up (healthy)            0.0.0.0:5672->5672/tcp, ...
telegram-redis-master     Up (healthy)            0.0.0.0:6383->6379/tcp
telegram-redis-replica    Up (healthy)            0.0.0.0:6385->6379/tcp
telegram-redis-sentinel   Up (healthy)            0.0.0.0:26379->26379/tcp
telegram-timescale        Up (healthy)            0.0.0.0:5436->5432/tcp
```

### Passo 5: Testar Endpoints

Verifique se os endpoints estão respondendo:

```bash
# Health check do Gateway API
curl http://localhost:4010/health

# Health check do MTProto
curl http://localhost:4007/health

# Teste de conexão TimescaleDB
docker exec telegram-timescale psql -U telegram -d telegram_gateway -c "SELECT 1"

# Teste de conexão Redis
docker exec telegram-redis-master redis-cli ping
```

## 🔧 Troubleshooting

### Problema: Script de reset falha

**Sintoma:** `docker-network-reset.sh` retorna erro

**Solução:**
```bash
# 1. Parar Docker manualmente
sudo systemctl stop docker

# 2. Aguardar 5 segundos
sleep 5

# 3. Iniciar Docker
sudo systemctl start docker

# 4. Tentar novamente o script
sudo bash .claude/sudo-scripts/docker-network-reset.sh
```

### Problema: Containers não ficam healthy

**Sintoma:** Health checks ficam `starting` ou `unhealthy`

**Solução:**
```bash
# Ver logs do container problemático
docker logs telegram-timescale --tail 50
docker logs telegram-pgbouncer --tail 50

# Reiniciar apenas o container problemático
docker restart telegram-timescale

# Aguardar 30s e verificar novamente
sleep 30
docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml ps
```

### Problema: Porta ainda ocupada após reset

**Sintoma:** Port conflict mesmo após reset do Docker

**Solução:**
```bash
# 1. Identificar processo (requer sudo)
sudo lsof -i :5436

# 2. Matar processo específico (substituir PID)
sudo kill -9 <PID>

# 3. Ou usar fuser para matar automaticamente
sudo fuser -k 5436/tcp

# 4. Tentar iniciar novamente
bash scripts/docker/start-telegram-stack.sh
```

### Problema: Erro "volume already exists"

**Sintoma:** Warning sobre volumes criados para projeto diferente

**Solução:**
```bash
# Este é apenas um WARNING, não é erro crítico
# Os volumes serão reutilizados normalmente

# Se quiser recriar do zero (APAGA DADOS!)
docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml down -v
bash scripts/docker/start-telegram-stack.sh
```

## 📋 Checklist Pós-Recuperação

- [ ] Reset do Docker executado com sucesso
- [ ] Todas as portas verificadas como disponíveis
- [ ] Stack iniciada sem erros
- [ ] Todos os containers com status `Up (healthy)`
- [ ] Endpoints respondendo corretamente
- [ ] Dashboard consegue carregar mensagens do Telegram

## 🔄 Manutenção Futura

### Antes de Cada Startup

```bash
# Verificação rápida de portas
bash scripts/docker/port-conflict-resolver.sh telegram

# Startup seguro
bash scripts/docker/start-telegram-stack.sh
```

### Se Encontrar Conflitos

```bash
# Diagnóstico completo
bash scripts/docker/port-conflict-resolver.sh diagnostic

# Reset se necessário
sudo bash .claude/sudo-scripts/docker-network-reset.sh
```

### Após Mudanças de Configuração

```bash
# Recriar containers com nova config
docker compose -f tools/compose/docker-compose.4-2-telegram-stack.yml up -d --force-recreate

# Ou usar o startup script (recomendado)
bash scripts/docker/start-telegram-stack.sh
```

## 📚 Referências

- **Port Allocation Map:** `docs/PORT-ALLOCATION.md`
- **Compose File:** `tools/compose/docker-compose.4-2-telegram-stack.yml`
- **Environment Variables:** `.env` e `config/.env.defaults`
- **Health Check Script:** `scripts/maintenance/health-check-all.sh`

## 🎓 Lições Aprendidas

### O que causou o problema?

1. **Reinicializações múltiplas** sem cleanup adequado
2. **Locks de rede do Docker** não liberados automaticamente
3. **Hardcoded ports** em alguns lugares dificultaram mudanças
4. **Falta de validação** antes de startup

### Como prevenir no futuro?

1. ✅ **Sempre usar o startup script** ao invés de `docker compose up` direto
2. ✅ **Verificar portas** antes de iniciar (`--check-only` flag)
3. ✅ **Nunca hardcode portas** no compose file (usar variáveis)
4. ✅ **Documentar alocação** de portas em `PORT-ALLOCATION.md`
5. ✅ **Reset periódico** do Docker se sistema ficar instável

---

**Última atualização:** 2025-11-11
**Próxima revisão:** Após próxima mudança significativa de infraestrutura
