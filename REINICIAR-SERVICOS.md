# 🔄 Como Reiniciar os Serviços

**Última atualização:** 2025-11-02

---

## ⚡ Quick Start (Recomendado)

Há um processo preso na porta 4005 que precisa de privilégios de admin para ser removido.

### Opção 1: Scripts Automáticos (com sudo)

```bash
# 1. Reiniciar TP Capital (requer sudo)
sudo bash scripts/setup/restart-tp-capital.sh

# 2. Reiniciar Dashboard (não requer sudo)
bash scripts/setup/restart-dashboard.sh
```

---

### Opção 2: Manual (passo a passo)

#### TP Capital

```bash
# 1. Liberar porta 4005 (requer sudo)
sudo fuser -k 4005/tcp

# 2. Aguardar 2 segundos
sleep 2

# 3. Iniciar TP Capital
cd /home/marce/Projetos/TradingSystem/apps/tp-capital
node src/server.js > /tmp/tp-capital.log 2>&1 &

# 4. Ver logs
tail -f /tmp/tp-capital.log
```

---

#### Dashboard

```bash
# 1. Parar dashboard atual (Ctrl+C no terminal que está rodando)

# 2. Ou forçar kill
lsof -ti:3103 | xargs kill -9 2>/dev/null

# 3. Iniciar Dashboard
cd /home/marce/Projetos/TradingSystem/frontend/dashboard
npm run dev
```

---

## 🐛 Troubleshooting

### Erro: "EADDRINUSE: address already in use :::4005"

**Causa:** Há um processo preso na porta 4005

**Solução:**
```bash
# Método 1: Com sudo (recomendado)
sudo fuser -k 4005/tcp

# Método 2: Identificar e matar manualmente
lsof -i:4005
# Copiar PID e executar:
kill -9 <PID>

# Método 3: Usar script automático
sudo bash scripts/setup/restart-tp-capital.sh
```

---

### Erro: "Cannot find module 'zod'"

**Causa:** Dependência não instalada

**Solução:**
```bash
cd apps/tp-capital
npm install
```

---

### Dashboard não carrega .env.local

**Causa:** Vite não recarregou variáveis de ambiente

**Solução:**
```bash
# Parar Dashboard completamente (Ctrl+C)
# Aguardar 2 segundos
# Iniciar novamente
npm run dev
```

---

## ✅ Verificação de Sucesso

### TP Capital

```bash
# Verificar se está rodando
curl http://localhost:4005/healthz

# Esperado:
# {"status":"healthy","service":"tp-capital","uptime":123}
```

---

### Dashboard

```bash
# Verificar se está rodando
curl -s http://localhost:3103 | head -1

# Ou abrir no navegador:
# http://localhost:3103
```

---

### Autenticação

```bash
# Testar automaticamente
bash scripts/setup/test-tp-capital-auth.sh

# Esperado:
# ✅ Servidor rodando
# ✅ Autenticação funcionando
# ✅ API Key aceita
```

---

## 📝 Scripts Criados

| Script | Função | Requer Sudo |
|--------|--------|-------------|
| `scripts/setup/restart-tp-capital.sh` | Reinicia TP Capital | ✅ Sim |
| `scripts/setup/restart-dashboard.sh` | Reinicia Dashboard | ❌ Não |
| `scripts/setup/test-tp-capital-auth.sh` | Testa autenticação | ❌ Não |
| `scripts/setup/configure-tp-capital-api-key.sh` | Configura API Key | ❌ Não |

---

## 🎯 Comando Único (Tudo de Uma Vez)

```bash
# Reiniciar tudo (requer sudo para TP Capital)
sudo bash scripts/setup/restart-tp-capital.sh && \
bash scripts/setup/restart-dashboard.sh && \
bash scripts/setup/test-tp-capital-auth.sh
```

---

**Próxima Ação:**

```bash
sudo bash scripts/setup/restart-tp-capital.sh
```

Aguardando sua execução para continuar... 🚀

