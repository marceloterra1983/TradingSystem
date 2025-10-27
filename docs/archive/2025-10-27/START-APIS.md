# 🚀 Guia de Inicialização das APIs

## ❗ Problema Identificado

As APIs **não estão conectadas** no dashboard porque **não estão rodando**.

### Status Atual

| API | Porta | Status | Solução |
|-----|-------|--------|---------|
| **Documentation API** | 3400 | ✅ Rodando | N/A |
| **Workspace API** | 3200 | ❌ **NÃO está rodando** | **Iniciar manualmente** |
| **TP Capital API** | 3200 | ❓ Verificar | Iniciar se necessário |

---

## 🚀 Como Iniciar as APIs

### 1. **Workspace API (Port 3200)** ⭐ PRIORITÁRIO

**Diretório:** `backend/api/workspace/`

**Opção 1 - Desenvolvimento (com hot reload):**
```bash
cd backend/api/workspace
npm run dev
```

**Opção 2 - Produção:**
```bash
cd backend/api/workspace
npm start
```

**Opção 3 - Script helper:**
```bash
bash backend/api/workspace/start-dev.sh
```

**Verificar se está rodando:**
```bash
curl http://localhost:3200/health
# Deve retornar: {"status":"ok",...}
```

---

### 2. **Documentation API (Port 3400)**

**Status:** ✅ Já está rodando!

**Diretório:** `backend/api/documentation-api/`

**Se precisar reiniciar:**
```bash
cd backend/api/documentation-api
npm run dev
```

**Verificar:**
```bash
curl http://localhost:3400/health
```

---

### 3. **TP Capital API (Port 3200)**

**⚠️ NOTA:** TP Capital roda na **mesma porta** que Workspace API (3200)!

**Diretório:** `apps/tp-capital/`

**Iniciar:**
```bash
cd apps/tp-capital
npm run dev
```

**Verificar:**
```bash
curl http://localhost:3200/health
```

---

## 🎯 Inicialização Rápida (Recomendado)

### Start ALL APIs - Quick Command

```bash
# Terminal 1 - Workspace API
cd backend/api/workspace && npm run dev

# Terminal 2 - Documentation API (se não estiver rodando)
cd backend/api/documentation-api && npm run dev
```

### Usando tmux (Terminal único com múltiplas sessões)

```bash
# Criar sessão tmux
tmux new -s apis

# Terminal 1 - Workspace API
cd backend/api/workspace && npm run dev

# Criar novo painel (Ctrl+B %)
# Terminal 2 - Documentation API
cd backend/api/documentation-api && npm run dev

# Navegar entre painéis: Ctrl+B + arrow keys
# Detach: Ctrl+B D
# Re-attach: tmux attach -t apis
```

---

## 🔍 Verificar Status de Todas as APIs

### Script de Health Check

```bash
#!/bin/bash
echo "=== Verificando APIs do TradingSystem ==="
echo ""

# Workspace API (3200)
echo -n "Workspace API (3200): "
if curl -s -f http://localhost:3200/health > /dev/null 2>&1; then
    echo "✅ Rodando"
else
    echo "❌ NÃO está rodando"
fi

# Documentation API (3400)
echo -n "Documentation API (3400): "
if curl -s -f http://localhost:3400/health > /dev/null 2>&1; then
    echo "✅ Rodando"
else
    echo "❌ NÃO está rodando"
fi

# Dashboard (3103)
echo -n "Dashboard (3103): "
if curl -s -f http://localhost:3103 > /dev/null 2>&1; then
    echo "✅ Rodando"
else
    echo "❌ NÃO está rodando"
fi

# Docusaurus (3205)
echo -n "Docusaurus (3205): "
if curl -s -f http://localhost:3205 > /dev/null 2>&1; then
    echo "✅ Rodando"
else
    echo "❌ NÃO está rodando"
fi

echo ""
echo "=== Fim da verificação ==="
```

**Salvar como:** `scripts/check-apis.sh`

**Executar:**
```bash
bash scripts/check-apis.sh
```

---

## 🛠️ Troubleshooting

### Problema: "Port already in use"

**Sintoma:**
```
Error: listen EADDRINUSE: address already in use :::3200
```

**Solução:**
```bash
# Encontrar processo usando a porta
lsof -i :3200

# Matar o processo
kill -9 <PID>

# Ou usar fuser
fuser -k 3200/tcp

# Tentar novamente
npm run dev
```

### Problema: "Cannot connect to QuestDB"

**Sintoma:**
```
Error: connect ECONNREFUSED 127.0.0.1:9000
```

**Solução:**
```bash
# Verificar se QuestDB está rodando
docker ps | grep questdb

# Iniciar QuestDB se não estiver rodando
docker compose up -d questdb

# Verificar acesso
curl http://localhost:9000
```

### Problema: "Module not found"

**Sintoma:**
```
Error: Cannot find module 'express'
```

**Solução:**
```bash
# Reinstalar dependências
npm install

# Ou limpar cache e reinstalar
rm -rf node_modules package-lock.json
npm install
```

---

## 📋 Checklist de Inicialização

Antes de usar o dashboard, certifique-se que:

- [ ] **Workspace API (3200)** está rodando
  ```bash
  curl http://localhost:3200/health
  ```

- [ ] **Documentation API (3400)** está rodando
  ```bash
  curl http://localhost:3400/health
  ```

- [ ] **Dashboard (3103)** está rodando
  ```bash
  curl http://localhost:3103
  ```

- [ ] **Docusaurus (3205)** está rodando (para API viewer)
  ```bash
  curl http://localhost:3205
  ```

- [ ] **QuestDB (9000)** está rodando (se usando database)
  ```bash
  curl http://localhost:9000
  ```

---

## 🎯 Quick Fix - Iniciar Workspace API AGORA

**Execute este comando para corrigir imediatamente:**

```bash
cd /home/marce/Projetos/TradingSystem/backend/api/workspace && npm run dev
```

**Depois, teste no dashboard:**
1. Abra `http://localhost:3103`
2. Vá em Apps → Workspace
3. Deve ver a tabela de items carregando
4. Teste CRUD operations

---

## 🔄 Reiniciar Todas as APIs

### Parar tudo:
```bash
# Encontrar todos os processos Node.js das APIs
ps aux | grep "node.*src/server.js" | grep -v grep | awk '{print $2}' | xargs kill -9

# Ou forçar kill de todas as portas
fuser -k 3200/tcp 3400/tcp 2>/dev/null
```

### Iniciar tudo:
```bash
# Terminal 1
cd backend/api/workspace && npm run dev &

# Terminal 2
cd backend/api/documentation-api && npm run dev &

# Verificar
sleep 3
bash scripts/check-apis.sh
```

---

## 📊 Monitoramento

### Logs em Tempo Real

**Workspace API:**
```bash
cd backend/api/workspace && npm run dev
# Logs aparecem no terminal
```

**Verificar métricas Prometheus:**
```bash
# Workspace API metrics
curl http://localhost:3200/metrics

# Documentation API metrics
curl http://localhost:3400/metrics
```

### Health Check Contínuo

```bash
# Watch mode - verifica a cada 2 segundos
watch -n 2 'bash scripts/check-apis.sh'
```

---

## 🚀 Scripts Automatizados

### Script de Start Automático

Criar arquivo: `scripts/start-all-apis.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Iniciando todas as APIs do TradingSystem..."
echo ""

# Function to check if port is free
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Porta $1 já está em uso!"
        return 1
    fi
    return 0
}

# Start Workspace API
echo "📦 Iniciando Workspace API (3200)..."
if check_port 3200; then
    cd backend/api/workspace
    npm run dev > /tmp/workspace-api.log 2>&1 &
    echo "✅ Workspace API iniciada (PID: $!)"
    cd - > /dev/null
fi

# Start Documentation API
echo "📚 Iniciando Documentation API (3400)..."
if check_port 3400; then
    cd backend/api/documentation-api
    npm run dev > /tmp/docs-api.log 2>&1 &
    echo "✅ Documentation API iniciada (PID: $!)"
    cd - > /dev/null
fi

echo ""
echo "⏳ Aguardando APIs inicializarem..."
sleep 5

echo ""
echo "🔍 Verificando status..."
bash scripts/check-apis.sh

echo ""
echo "✅ Todas as APIs foram iniciadas!"
echo ""
echo "📋 Logs disponíveis em:"
echo "   - Workspace API: /tmp/workspace-api.log"
echo "   - Documentation API: /tmp/docs-api.log"
echo ""
echo "🌐 Acesse o dashboard: http://localhost:3103"
```

**Usar:**
```bash
chmod +x scripts/start-all-apis.sh
bash scripts/start-all-apis.sh
```

---

## 📝 Notas Importantes

### Portas Compartilhadas

⚠️ **Workspace API** e **TP Capital API** usam a **mesma porta (3200)**!

- Não rode ambos ao mesmo tempo
- Escolha qual API você precisa:
  - **Workspace API**: Para Idea Bank (Kanban)
  - **TP Capital API**: Para sinais Telegram

### Dependências

**Antes de iniciar APIs, certifique-se que estão rodando:**
- QuestDB (porta 9000) - `docker compose up -d questdb`
- PostgreSQL (porta 5432) - Se configurado
- Redis (porta 6379) - Se configurado

---

## ✅ Checklist Final

Depois de iniciar as APIs, verifique:

- [ ] Workspace API respondendo em `http://localhost:3200/health`
- [ ] Documentation API respondendo em `http://localhost:3400/health`
- [ ] Dashboard carregando dados em `http://localhost:3103`
- [ ] API Viewer funcionando (DocsAPI button)
- [ ] Idea Bank mostrando items

---

**Criado:** 2025-10-25
**Atualizado:** 2025-10-25
**Versão:** 1.0.0
