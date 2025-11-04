# 🔄 Sincronização Automática no Startup

## ⚡ Quick Start

```bash
# 1. Habilitar funcionalidade
bash scripts/setup/enable-telegram-startup-sync.sh

# 2. Reiniciar serviço
bash START-GATEWAY-MTPROTO.sh

# 3. Monitorar logs
tail -f logs/telegram-gateway-mtproto.log | grep StartupSync
```

## 📋 O que faz?

Sincroniza automaticamente as **últimas 500 mensagens** de **todos os canais monitorados** sempre que o serviço Telegram Gateway é iniciado.

## 🎯 Por que usar?

- ✅ **Database sempre atualizado**: Mensagens sincronizadas ao iniciar
- ✅ **Recuperação automática**: Mensagens perdidas são recuperadas
- ✅ **Zero esforço manual**: Não precisa clicar em "Checar Mensagens"
- ✅ **Configurável**: Controle total via variáveis de ambiente

## ⚙️ Configuração (.env)

```bash
# Habilitar/desabilitar
TELEGRAM_GATEWAY_SYNC_ON_STARTUP=true

# Delay antes do sync (ms) - aguarda estabilização
TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY=5000

# Mensagens por canal
TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT=500

# Canais em paralelo
TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY=3
```

## 📊 Como funciona?

```
1. Serviço inicia (porta 4010)
   ↓
2. Aguarda 5 segundos (estabilização)
   ↓
3. Conecta ao Telegram
   ↓
4. Busca canais ativos no banco
   ↓
5. Sincroniza 500 mensagens de cada (paralelo)
   ↓
6. Salva no TimescaleDB
   ↓
7. Registra logs detalhados
```

## 📝 Logs Esperados

### Sucesso

```json
[INFO] [StartupSync] Startup synchronization enabled - will run after delay
[INFO] [StartupSync] Telegram client connected successfully
[INFO] [StartupSync] Active channels found - starting sync
       channelCount: 3, channels: ["@canal1", "@canal2", "@canal3"]
[INFO] [StartupSync] ✅ Startup synchronization completed successfully
       totalMessagesSynced: 245
       totalMessagesSaved: 245
       channelsSynced: 3
       durationSeconds: "3.88"
```

### Desabilitado

```json
[INFO] [StartupSync] Startup synchronization disabled (TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false)
```

## 🔍 Verificar Status

```bash
# Ver última sincronização
grep "StartupSync.*completed" logs/telegram-gateway-mtproto.log | tail -1

# Contar mensagens sincronizadas
grep "StartupSync.*completed" logs/telegram-gateway-mtproto.log | tail -1 | jq '.totalMessagesSynced'

# Ver tempo de execução
grep "StartupSync.*completed" logs/telegram-gateway-mtproto.log | tail -1 | jq '.durationSeconds'
```

## ⚡ Perfis de Configuração

### Produção (Alta Performance)
```bash
TELEGRAM_GATEWAY_SYNC_ON_STARTUP=true
TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY=10000
TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT=1000
TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY=5
```

### Desenvolvimento (Rápido)
```bash
TELEGRAM_GATEWAY_SYNC_ON_STARTUP=true
TELEGRAM_GATEWAY_STARTUP_SYNC_DELAY=3000
TELEGRAM_GATEWAY_STARTUP_SYNC_LIMIT=100
TELEGRAM_GATEWAY_STARTUP_SYNC_CONCURRENCY=2
```

### Desabilitado
```bash
TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false
```

## ❌ Troubleshooting

### Sync não executa

```bash
# Verificar se está habilitado
grep "TELEGRAM_GATEWAY_SYNC_ON_STARTUP" .env

# Ver logs completos
tail -50 logs/telegram-gateway-mtproto.log
```

### Erro de sessão

```bash
# Re-autenticar
cd apps/telegram-gateway
bash authenticate-interactive.sh
```

### Nenhum canal ativo

```bash
# Listar canais
curl http://localhost:4010/api/channels

# Ativar canal
curl -X PUT http://localhost:4010/api/channels/{id} \
  -H "Content-Type: application/json" \
  -d '{"isActive": true}'
```

## 📖 Documentação Completa

- **Configuração detalhada**: `docs/content/apps/telegram-gateway/configuration/startup-sync.mdx`
- **Código fonte**: `src/services/StartupSyncService.js`
- **Integração**: `src/server.js` (linha 171)

## 🧪 Teste Manual

```bash
# 1. Desabilitar temporariamente
echo "TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false" >> .env

# 2. Reiniciar
bash START-GATEWAY-MTPROTO.sh

# 3. Ver logs (não deve sincronizar)
tail -f logs/telegram-gateway-mtproto.log | grep StartupSync
# Resultado: "Startup synchronization disabled"

# 4. Re-habilitar
sed -i 's/TELEGRAM_GATEWAY_SYNC_ON_STARTUP=false/TELEGRAM_GATEWAY_SYNC_ON_STARTUP=true/' .env

# 5. Reiniciar novamente
bash START-GATEWAY-MTPROTO.sh

# 6. Ver logs (deve sincronizar)
tail -f logs/telegram-gateway-mtproto.log | grep StartupSync
# Resultado: "Startup synchronization completed successfully"
```

## 🎯 Performance Esperada

Com configuração padrão:
- **3 canais**: ~4 segundos
- **5 canais**: ~6 segundos
- **10 canais**: ~12 segundos

*Tempos podem variar dependendo da quantidade de mensagens e latência do Telegram*

## 🔗 Links Úteis

- [Telegram Gateway API](http://localhost:4010/health)
- [Dashboard](http://localhost:3103/#/telegram-gateway)
- [Métricas Prometheus](http://localhost:4010/metrics)
- [Documentação Completa](http://localhost:3400/apps/telegram-gateway)

---

**Implementado em**: 2025-11-04  
**Versão**: 1.0.0  
**Status**: ✅ Produção

