# 🚀 Guia Rápido: Iniciar Sistema Telegram Gateway

**Data:** 2025-11-04  
**Versão:** 2.0 - Scripts Master Completos

---

## 📦 Scripts Disponíveis

### 🚀 START-ALL-TELEGRAM.sh
**Inicia TODO o sistema Telegram Gateway de uma vez!**

**Componentes iniciados:**
1. 🐳 **Docker Stack** (TimescaleDB, Redis, RabbitMQ, Prometheus, Grafana)
2. 📱 **Gateway MTProto** (conexão com Telegram via MTProto)
3. 🔌 **Gateway API** (endpoints REST na porta 4010)
4. 🖥️ **Dashboard** [OPCIONAL] (interface UI na porta 3103)

**Features:**
- ✅ Verifica se componentes já estão rodando (não força restart)
- ✅ Pergunta interativamente antes de reiniciar/iniciar
- ✅ Dashboard é opcional (você escolhe se quer iniciar)
- ✅ Valida CADA componente após inicialização
- ✅ Mostra PIDs de todos os processos
- ✅ Tratamento de erros (cleanup automático)
- ✅ Output colorido e organizado por etapas
- ✅ Resumo final com status de todos os componentes

---

### 🛑 STOP-ALL-TELEGRAM.sh
**Para TODO o sistema Telegram Gateway!**

**Componentes parados:**
1. 🖥️ Dashboard (porta 3103)
2. 🔌 Gateway API (porta 4010)
3. 📱 Gateway MTProto
4. 🐳 Docker Stack (todos os containers)

**Opções:**
```bash
# Parada normal (graceful shutdown)
bash STOP-ALL-TELEGRAM.sh

# Parada forçada (kill -9)
bash STOP-ALL-TELEGRAM.sh --force
```

**Features:**
- ✅ Parada graceful por padrão (SIGTERM)
- ✅ Opção --force para kill imediato (SIGKILL)
- ✅ Verificação final de todos os componentes
- ✅ Cleanup de processos órfãos (pkill em processos relacionados)
- ✅ Output organizado e colorido

---

## 🚀 Como Usar

### Iniciar Sistema Completo

```bash
cd /home/marce/Projetos/TradingSystem

# Executar script master
bash START-ALL-TELEGRAM.sh
```

**O script vai perguntar interativamente:**

1. **Docker Stack já rodando?**
   - `s` = Reiniciar Docker Stack
   - `n` = Manter Docker Stack atual

2. **Gateway MTProto já rodando?**
   - `s` = Reiniciar Gateway MTProto
   - `n` = Manter Gateway MTProto atual

3. **Gateway API já rodando?**
   - `s` = Reiniciar Gateway API
   - `n` = Manter Gateway API atual

4. **Deseja iniciar Dashboard?**
   - `s` = Iniciar Dashboard também
   - `n` = NÃO iniciar Dashboard (apenas backend)

---

### Parar Sistema Completo

```bash
cd /home/marce/Projetos/TradingSystem

# Parada normal (recomendado)
bash STOP-ALL-TELEGRAM.sh

# Parada forçada (se houver problemas)
bash STOP-ALL-TELEGRAM.sh --force
```

---

## ⏱️ Tempo de Inicialização

| Etapa | Componente | Tempo |
|-------|------------|-------|
| 1 | Docker Stack | ~15s |
| 2 | Gateway MTProto | ~12s |
| 3 | Gateway API | ~8s |
| 4 | Dashboard (opcional) | ~12s |
| **TOTAL** | **Com Dashboard** | **~47s** |
| **TOTAL** | **Sem Dashboard** | **~35s** |

---

## 📊 O Que Você Verá

### Durante Inicialização

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║        🚀 INICIANDO SISTEMA COMPLETO TELEGRAM GATEWAY               ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

📦 ETAPA 1: Docker Compose Stack
════════════════════════════════════════════════════════════════════════

🔍 Verificando se Docker stack já está rodando...
   ⏭️  Mantendo Docker stack atual
✅ Docker stack já estava rodando!

📱 ETAPA 2: Gateway MTProto (Conexão Telegram)
════════════════════════════════════════════════════════════════════════

🔍 Verificando se Gateway MTProto já está rodando...
   ⏭️  Mantendo Gateway MTProto atual

🔌 ETAPA 3: Gateway API (Endpoints REST - Porta 4010)
════════════════════════════════════════════════════════════════════════

🚀 Iniciando Gateway API...
⏳ Aguardando API inicializar (8 segundos)...
✅ Gateway API iniciado (PID: 123456)

🖥️  ETAPA 4: Dashboard (Interface UI - Porta 3103)
════════════════════════════════════════════════════════════════════════

Deseja INICIAR o Dashboard também? (s/n): s

🚀 Iniciando Dashboard...
⏳ Aguardando Dashboard inicializar (12 segundos)...
✅ Dashboard iniciado (PID: 789012)
```

### Resumo Final

```
╔═══════════════════════════════════════════════════════════════════════╗
║                                                                       ║
║              ✅ SISTEMA TELEGRAM INICIADO COM SUCESSO!               ║
║                                                                       ║
╚═══════════════════════════════════════════════════════════════════════╝

📊 COMPONENTES ATIVOS:
════════════════════════════════════════════════════════════════════════

  🐳 Docker Containers:
     ✅ telegram-timescale       Up 30 minutes   0.0.0.0:5434->5432/tcp
     ✅ telegram-redis-master    Up 30 minutes   0.0.0.0:6379->6379/tcp
     ✅ telegram-rabbitmq        Up 30 minutes   0.0.0.0:5672->5672/tcp

  ⚙️  Node.js Services:
     ✅ Gateway MTProto (PID: 234567)
     ✅ Gateway API (PID: 123456)
     ✅ Dashboard (PID: 789012)

📋 PRÓXIMOS PASSOS:
══════════════════

  1️⃣  Abra o Dashboard:
      http://localhost:3103/#/telegram-gateway

  2️⃣  Faça HARD RELOAD:
      Ctrl + Shift + R (Linux/Windows)
      Cmd + Shift + R (Mac)

  3️⃣  Clique "Checar Mensagens":
      ✅ Sistema deve estar funcionando!

  📊 Endpoints Disponíveis:
      • Gateway API: http://localhost:4010
      • Prometheus: http://localhost:9091
      • Grafana: http://localhost:3001

🔍 VER LOGS:
═══════════

  Gateway MTProto:  tail -f logs/telegram-gateway-mtproto.log
  Gateway API:      tail -f logs/telegram-gateway-api.log
  Dashboard:        tail -f logs/dashboard.log

🛑 PARAR TODO O SISTEMA:
═══════════════════════

  bash STOP-ALL-TELEGRAM.sh
```

---

## 🔍 Verificar Status

### Status Rápido (Durante Execução)

```bash
# Ver todos os processos relacionados
ps aux | grep -E "telegram-gateway|vite.*3103"

# Ver portas em uso
lsof -i :3103,4010,5434

# Ver containers Docker
docker compose -f tools/compose/docker-compose.telegram.yml ps
```

### Logs em Tempo Real

```bash
# Gateway MTProto (conexão Telegram)
tail -f logs/telegram-gateway-mtproto.log

# Gateway API (endpoints REST)
tail -f logs/telegram-gateway-api.log

# Dashboard (interface UI)
tail -f logs/dashboard.log

# Todos os logs juntos
tail -f logs/*.log
```

---

## 🐛 Troubleshooting

### Problema: Componente não inicia

**Solução:**
1. Verificar logs específicos do componente
2. Verificar se porta está ocupada por outro processo
3. Reiniciar com --force (para STOP)

```bash
# Parar tudo forçado
bash STOP-ALL-TELEGRAM.sh --force

# Aguardar 5s
sleep 5

# Iniciar novamente
bash START-ALL-TELEGRAM.sh
```

---

### Problema: Docker Stack não sobe

**Solução:**
1. Verificar se Docker está rodando
2. Verificar logs do Docker Compose

```bash
# Verificar Docker daemon
docker ps

# Verificar logs
docker compose -f tools/compose/docker-compose.telegram.yml logs

# Reiniciar stack manualmente
docker compose -f tools/compose/docker-compose.telegram.yml down
docker compose -f tools/compose/docker-compose.telegram.yml up -d
```

---

### Problema: Gateway MTProto não conecta

**Solução:**
1. Verificar se sessão do Telegram existe
2. Verificar credenciais no `.env`

```bash
# Verificar sessão
ls -lh apps/telegram-gateway/.session/

# Ver logs
tail -50 logs/telegram-gateway-mtproto.log

# Reautenticar se necessário
bash AUTENTICAR-TELEGRAM.sh
```

---

### Problema: Dashboard mostra erro de API Key

**Solução:**
1. Verificar se variáveis de ambiente estão carregadas
2. Fazer hard reload do Dashboard

```bash
# Verificar variáveis
grep "VITE_TELEGRAM_GATEWAY_API_TOKEN" frontend/dashboard/.env

# Parar Dashboard
lsof -ti :3103 | xargs kill

# Reiniciar Dashboard
cd frontend/dashboard
npm run dev
```

---

## 📚 Arquivos Relacionados

### Scripts Principais
- `START-ALL-TELEGRAM.sh` - Inicia todo o sistema
- `STOP-ALL-TELEGRAM.sh` - Para todo o sistema
- `START-GATEWAY-MTPROTO.sh` - Inicia apenas Gateway MTProto
- `AUTENTICAR-TELEGRAM.sh` - Autenticação interativa

### Documentação
- `TELEGRAM-SYSTEM-COMPLETE-SUCCESS.md` - Histórico completo da implementação
- `GUIA-CONECTAR-TELEGRAM.md` - Guia de autenticação
- `TELEGRAM-STARTUP-GUIDE.md` - Este documento

### Configuração
- `.env` - Variáveis de ambiente (root do projeto)
- `frontend/dashboard/.env` - Variáveis do frontend (VITE_*)
- `tools/compose/docker-compose.telegram.yml` - Docker Compose

---

## 🎯 Casos de Uso

### 1. Iniciar Sistema Completo (Com Dashboard)

```bash
bash START-ALL-TELEGRAM.sh
# Responder "s" para iniciar Dashboard
```

**Uso:** Desenvolvimento/Debug - visualizar mensagens em tempo real

---

### 2. Iniciar Apenas Backend (Sem Dashboard)

```bash
bash START-ALL-TELEGRAM.sh
# Responder "n" para Dashboard
```

**Uso:** Produção/Background - apenas captura e API

---

### 3. Reiniciar Componente Específico

```bash
bash START-ALL-TELEGRAM.sh
# Responder "s" para reiniciar o componente desejado
# Responder "n" para manter os outros
```

**Uso:** Atualizar apenas um componente sem afetar outros

---

### 4. Parar Tudo Rapidamente

```bash
bash STOP-ALL-TELEGRAM.sh --force
```

**Uso:** Shutdown rápido para manutenção/updates

---

## ✅ Checklist de Validação

Após executar `START-ALL-TELEGRAM.sh`, verifique:

- [ ] Docker containers estão rodando
  ```bash
  docker compose -f tools/compose/docker-compose.telegram.yml ps
  ```

- [ ] Gateway MTProto está conectado
  ```bash
  tail -20 logs/telegram-gateway-mtproto.log | grep "connected successfully"
  ```

- [ ] Gateway API responde
  ```bash
  curl http://localhost:4010/health
  ```

- [ ] Dashboard abre (se iniciado)
  ```bash
  curl -I http://localhost:3103 | grep "200 OK"
  ```

- [ ] Botão "Checar Mensagens" funciona sem erro

---

## 🎉 Resultado Final

Após executar `START-ALL-TELEGRAM.sh` com sucesso:

✅ **4 componentes Docker** rodando (TimescaleDB, Redis, RabbitMQ, Prometheus)  
✅ **Gateway MTProto** conectado ao Telegram (capturando mensagens)  
✅ **Gateway API** servindo endpoints REST (porta 4010)  
✅ **Dashboard** (opcional) mostrando interface UI (porta 3103)  

**Sistema 100% operacional e pronto para uso!** 🚀

---

**Criado em:** 2025-11-04  
**Autor:** Sistema de Automação TradingSystem  
**Versão:** 2.0 - Scripts Master Completos

