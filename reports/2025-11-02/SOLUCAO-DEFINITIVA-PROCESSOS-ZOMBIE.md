# 🎯 SOLUÇÃO DEFINITIVA: Processos Zombie TP Capital

**Data:** 2025-11-02 23:30 UTC  
**Status:** ✅ **PROBLEMA IDENTIFICADO - Requer execução manual**

---

## 🔍 **CAUSA RAIZ IDENTIFICADA**

### Múltiplos Gerenciadores de Processo Rodando Simultaneamente:

1. **Docker Container** (`apps-tpcapital`) - PARADO mas com código antigo
2. **Nodemon (como ROOT)** - PID 931255, rodando em `/app` (dentro de container Docker antigo)
3. **6+ Processos Node.js Zombie** - Alguns rodando como **root**, impossíveis de matar sem `sudo`

### Por que os processos não morrem?

- `pkill -9` sem `sudo` NÃO mata processos como **root**
- Nodemon reinicia automaticamente quando detecta que o processo morreu
- Docker Compose `restart: unless-stopped` reinicia o container automaticamente

---

## ✅ **SOLUÇÃO: Executar Script com `sudo`**

Criamos o script `scripts/setup/kill-all-tp-capital.sh` que:

1. Para container Docker `apps-tpcapital`
2. Mata nodemon (como root)
3. Mata TODOS os processos Node.js (incluindo root)
4. Libera porta 4005
5. Valida que tudo foi eliminado

---

## 🚀 **PASSO A PASSO PARA RESOLVER**

### Passo 1: Eliminar TODOS os Processos Zombie

```bash
sudo bash /home/marce/Projetos/TradingSystem/scripts/setup/kill-all-tp-capital.sh
```

**Resultado Esperado:**
```
✅ SUCESSO: Nenhum processo Node.js rodando
✅ SUCESSO: Porta 4005 está livre
```

---

### Passo 2: Verificar Limpeza

```bash
# Confirmar que não há processos Node
ps aux | grep "[n]ode src/server.js"
# Deve retornar: (vazio)

# Confirmar que porta 4005 está livre
lsof -i:4005
# Deve retornar: (vazio)
```

---

### Passo 3: Iniciar TP Capital LIMPO (SEM Docker)

```bash
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
export TELEGRAM_GATEWAY_PORT=4010
node src/server.js &
```

**Aguardar 10 segundos e testar:**

```bash
curl http://localhost:4005/health | jq '.status'
# Deve retornar: "healthy"
```

---

### Passo 4: Testar Sincronização

```bash
API_KEY=$(grep "TP_CAPITAL_API_KEY=" .env | cut -d'=' -f2)

curl -X POST \
  -H "X-API-Key: $API_KEY" \
  http://localhost:4005/sync-messages | jq '{success, message}'
```

**Resultado Esperado (CORRETO):**
```json
{
  "success": false,
  "message": "Telegram Gateway não está acessível. Verifique se o serviço está rodando na porta 4010."
}
```

✅ **Porta 4010 (CORRETO!) - Não mais 4006**

---

## 🎯 **POR QUE USAR NODE DIRETO EM VEZ DE DOCKER?**

Durante o desenvolvimento, rodar TP Capital **FORA do Docker** é melhor porque:

1. ✅ **Hot-reload instantâneo** - Mudanças no código refletem imediatamente
2. ✅ **Logs em tempo real** - Mais fácil debugar
3. ✅ **Sem rebuild** - Economiza tempo
4. ✅ **Sem processos zombie** - Controle total sobre o processo

**Em produção**, use Docker com `docker compose up -d tp-capital`.

---

## 📊 **Código Corrigido (Confirmado)**

### `/apps/tp-capital/src/server.js`

✅ **Linha 176:** `const gatewayPort = Number(process.env.TELEGRAM_GATEWAY_PORT || 4010);`
✅ **Linha 243:** ``message: `Telegram Gateway não está acessível. Verifique se o serviço está rodando na porta ${gatewayPort}.` ``

✅ **NÃO HÁ "4006" HARDCODED EM NENHUM CÓDIGO EXECUTÁVEL**

---

## 🔧 **Alternativa: Rebuild do Container Docker**

Se quiser usar Docker, precisa **rebuildar a imagem** com o código novo:

```bash
cd /home/marce/Projetos/TradingSystem

# Parar container antigo
docker compose -f tools/compose/docker-compose.apps.yml down tp-capital

# Rebuildar com código novo
docker compose -f tools/compose/docker-compose.apps.yml build tp-capital

# Iniciar novo container
docker compose -f tools/compose/docker-compose.apps.yml up -d tp-capital

# Aguardar 15 segundos
sleep 15

# Testar
curl http://localhost:4005/health | jq '.status'
```

---

## 📝 **Resumo das Correções Aplicadas**

| Arquivo | Correção | Status |
|---------|----------|--------|
| `apps/tp-capital/src/server.js` | Porta 4006 → 4010 | ✅ CORRETO |
| `backend/api/telegram-gateway/src/routes/telegramGateway.js` | Porta 4006 → 4010 | ✅ CORRETO |
| `frontend/dashboard/.../ConnectionDiagnosticCard.tsx` | Porta 4006 → 4010 | ✅ CORRETO |
| `frontend/dashboard/.../SimpleStatusCard.tsx` | Porta 4006 → 4010 | ✅ CORRETO |
| `frontend/dashboard/.../TelegramGatewayFinal.tsx` | Porta 4006 → 4010 | ✅ CORRETO |
| `.env` | `TELEGRAM_GATEWAY_PORT=4010` | ✅ CORRETO |
| `apps/tp-capital/src/timescaleClient.js` | Circuit Breaker + Retry | ✅ IMPLEMENTADO |
| `apps/tp-capital/src/resilience/circuitBreaker.js` | Opossum | ✅ IMPLEMENTADO |

**Total:** 7 arquivos de código + 1 arquivo de config corrigidos

---

## 🎉 **APÓS EXECUTAR O SCRIPT**

```
✅ Processos zombie eliminados
✅ Porta 4005 livre
✅ Código 100% correto (porta 4010)
✅ Circuit Breaker implementado
✅ Retry Logic implementado
✅ Timestamps funcionando
✅ API Key authentication ativa
```

---

## 📚 **Documentação Relacionada**

- `INSTRUCOES-FINAIS-TP-CAPITAL-2025-11-02.md`
- `TP-CAPITAL-FINALIZADO-2025-11-02.md`
- `PROBLEMA-PROCESSOS-ZOMBIE-TP-CAPITAL.md`
- `scripts/setup/kill-all-tp-capital.sh` (EXECUTAR ESTE!)

---

**Última Atualização:** 2025-11-02 23:30 UTC  
**Próximo Passo:** `sudo bash scripts/setup/kill-all-tp-capital.sh`  
**Tempo Estimado:** 2 minutos

