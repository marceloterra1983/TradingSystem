# 🔴 PROBLEMA CRÍTICO: Processos Zombie TP Capital

**Data:** 2025-11-02  
**Status:** 🔴 **BLOQUEADOR - 7+ processos duplicados impedindo correção**

---

## 🚨 **Sintomas**

1. ✅ **Código está 100% correto** (`server.js` tem porta 4010)
2. ❌ **API retorna erro com porta 4006** (código antigo)
3. ❌ **7+ processos `node src/server.js` rodando simultaneamente**
4. ❌ **`pkill -9` não elimina os processos permanentemente**
5. ❌ **Processos reaparecem após serem mortos**

---

## 🔍 **Diagnóstico**

### Processos Encontrados (ps aux)
```
930520 dumb-init -- node
930943 node src/server.js 
931001 node src/server.js 
931368 node src/server.js 
931449 node src/server.js 
1022975 /home/marce/.nvm/versions/node/v25.0.0/bin/node src/server.js 
1054343 /usr/local/bin/node src/server.js
```

### Verificações Realizadas
- ❌ **systemd**: Nenhum serviço systemd gerenciando TP Capital
- ❌ **Docker**: Nenhum container rodando na porta 4005
- ✅ **Código**: `server.js` linha 176 = `4010` (correto)
- ✅ **Código**: `server.js` linha 243 = `${gatewayPort}` (dinâmico)

---

## 🎯 **Hipóteses**

### 1. Nodemon/PM2/Forever Reiniciando Automaticamente
- **Teste**: `ps aux | grep -E "nodemon|pm2|forever"`
- **Resultado**: Pendente

### 2. Script de Startup Automático
- **Locais**: `~/.bashrc`, `~/.profile`, crontab, systemd user units
- **Teste**: Pendente

### 3. Docker Compose Reiniciando Container
- **Teste**: `docker compose ps` (verificar se há stack docker-compose gerenciando)
- **Resultado**: Pendente

### 4. Processos Órfãos de Sessions Anteriores
- **Causa**: Múltiplos terminais/tmux/screen com processos em background
- **Solução**: Identificar processos pai e matar a árvore completa

---

## 🛠️ **Próximos Passos para Resolver**

### Opção A: Reinício Completo do Sistema
```bash
# Se nada mais funcionar
sudo reboot
```

### Opção B: Matar Árvore Completa de Processos
```bash
# Encontrar processo pai
pstree -p | grep node

# Matar árvore completa
ps aux | grep "[n]ode src/server.js" | awk '{print $2}' | xargs -I {} sh -c 'pkill -9 -P {} && kill -9 {}'

# Esperar e verificar
sleep 5
ps aux | grep "[n]ode src/server.js"
```

### Opção C: Verificar Docker Compose Stack
```bash
# Ver TODOS os containers e stacks
docker compose ls

# Parar TODOS os stacks
docker compose -f tools/compose/docker-compose.apps.yml down
```

### Opção D: Investigar Scripts de Startup
```bash
# Verificar se há startup automático
cat ~/.bashrc | grep -i "tp-capital\|4005"
crontab -l | grep -i "tp-capital"
systemctl --user list-timers
```

---

## 📊 **Estado Atual do Código (CORRETO)**

### `/apps/tp-capital/src/server.js`
**Linha 176:**
```javascript
const gatewayPort = Number(process.env.TELEGRAM_GATEWAY_PORT || 4010);  // ✅ Corrigido
```

**Linha 243:**
```javascript
message: `Telegram Gateway não está acessível. Verifique se o serviço está rodando na porta ${gatewayPort}.`,
```

✅ **NÃO HÁ "4006" HARDCODED NO CÓDIGO!**

---

## 🎯 **Solução Temporária**

Enquanto investigamos, uma solução temporária é usar o **Telegram Gateway DIRETO** (sem TP Capital como proxy):

```bash
# Dashboard chama DIRETO o Gateway na porta 4010
# Modificar frontend/dashboard para apontar para 4010 em vez de 4005/sync-messages
```

---

## 📝 **Ações Necessárias (MANUAL)**

**USUÁRIO PRECISA EXECUTAR:**

1. **Identificar processo pai dos 7 zombies:**
   ```bash
   pstree -p | grep node | grep server.js
   ```

2. **Matar árvore completa:**
   ```bash
   ps aux | grep "[n]ode src/server.js" | awk '{print $2}' | while read pid; do
     pkill -9 -P $pid
     kill -9 $pid
   done
   ```

3. **Esperar 10 segundos:**
   ```bash
   sleep 10
   ```

4. **Verificar se TODOS foram eliminados:**
   ```bash
   ps aux | grep "[n]ode src/server.js"
   ```
   **Resultado Esperado:** Nenhum processo

5. **APENAS APÓS CONFIRMAÇÃO, reiniciar:**
   ```bash
   cd /home/marce/Projetos/TradingSystem/apps/tp-capital
   TELEGRAM_GATEWAY_PORT=4010 node src/server.js &
   ```

---

## 🔗 **Arquivos Relacionados**

- `INSTRUCOES-FINAIS-TP-CAPITAL-2025-11-02.md`
- `TP-CAPITAL-FINALIZADO-2025-11-02.md`
- `TODAS-CORRECOES-APLICADAS-2025-11-02.md`

---

**Última Atualização:** 2025-11-02 23:25 UTC  
**Status:** Aguardando execução manual para eliminar processos zombie  
**Bloqueador:** Processos antigos com código desatualizado (porta 4006) ainda ativos

