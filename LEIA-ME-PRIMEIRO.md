# 🏥 Health Dashboard - INSTRUÇÕES RÁPIDAS

## ⚡ COMANDO ÚNICO - Execute AGORA:

Copie e cole no seu terminal:

```bash
cd /home/marce/projetos/TradingSystem && bash scripts/START-HEALTH-DASHBOARD.sh
```

**Isso irá:**
1. ✅ Configurar tudo automaticamente
2. ✅ Iniciar Documentation API (port 3400)
3. ✅ Iniciar Docusaurus (port 3004)
4. ✅ Abrir Health Dashboard

**Após ver "SUCCESS", acesse:**
- 🏥 http://localhost:3004/health

---

## 🎯 O que o script faz:

```
Step 1/5: Tornar scripts executáveis
Step 2/5: Liberar porta 3004
Step 3/5: Verificar/Iniciar Documentation API
Step 4/5: Preparar Docusaurus (limpar cache)
Step 5/5: Iniciar Docusaurus
```

---

## ❓ Se algo der errado:

### Problema: "Port 3004 já está em uso"
```bash
lsof -ti:3004 | xargs kill -9
```

### Problema: "Documentation API não responde"
```bash
docker compose -f infrastructure/compose/docker-compose.docs.yml restart documentation-api
docker logs docs-documentation-api
```

### Problema: "Página /health não carrega"
1. Abra o navegador em: http://localhost:3004/
2. Se a home funciona mas /health não:
   - Pressione F12 (DevTools)
   - Vá para aba Console
   - Cole os erros aqui

### Problema: "npm install falha"
```bash
cd /home/marce/projetos/TradingSystem/docs/docusaurus
rm -rf node_modules package-lock.json
npm install
```

---

## 📊 Verificar se está tudo funcionando:

```bash
# API respondendo?
curl http://localhost:3400/health

# Métricas Prometheus?
curl http://localhost:3400/metrics | grep docs_

# Health summary?
curl http://localhost:3400/api/v1/docs/health/summary | jq

# Docusaurus rodando?
lsof -i :3004
```

---

## 🎬 Passo a Passo Visual:

### Passo 1: Abrir terminal
```bash
# Navegue até o projeto
cd /home/marce/projetos/TradingSystem
```

### Passo 2: Executar script
```bash
bash scripts/START-HEALTH-DASHBOARD.sh
```

### Passo 3: Aguardar mensagem
Você verá algo assim:
```
╔═══════════════════════════════════════════════════════════════╗
║  🎉 READY! Starting Docusaurus on port 3004...               ║
╚═══════════════════════════════════════════════════════════════╝

[SUCCESS] Docusaurus website is running at: http://localhost:3004/
```

### Passo 4: Abrir navegador
Acesse: http://localhost:3004/health

---

## ✅ O que foi implementado:

- [x] Routes `/api/v1/docs/health/*` montadas
- [x] Endpoint `/metrics` para Prometheus
- [x] Registries unificados (prom-client)
- [x] Docusaurus usa `customFields`
- [x] Trends conectado ao Prometheus
- [x] Graceful degradation sem audit data
- [x] CI workflow calcula health_score

---

## 📖 Documentação Completa:

Leia: `HEALTH-DASHBOARD-SETUP.md` para detalhes avançados.

---

## 🆘 Precisa de ajuda?

Execute e me envie a saída:
```bash
bash scripts/START-HEALTH-DASHBOARD.sh 2>&1 | tee output.log
```

Depois compartilhe o arquivo `output.log`
