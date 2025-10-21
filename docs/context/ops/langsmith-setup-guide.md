---
title: LangSmith Setup Guide - Passo a Passo
tags: [langsmith, setup, studio, tracing, onboarding]
domain: ops
type: guide
summary: Guia completo para configurar LangSmith API Key e fazer onboarding inicial
status: active
last_review: 2025-10-19
---

# LangSmith Setup Guide - Passo a Passo

**Version:** 1.0.0
**Last Updated:** 2025-10-19

---

## Overview

Este guia explica como configurar o **LangSmith** para usar com o LangGraph Development Environment. O LangSmith fornece:

- **Visual Studio para Workflows** - Debug visual de workflows LangGraph
- **Tracing Completo** - Rastreamento de cada step do workflow
- **Replay de Execuções** - Reproduzir workflows anteriores
- **Performance Metrics** - Métricas de latência e custos

---

## Passo 1: Criar Conta no LangSmith

### 1.1 Acessar o Site

🔗 **URL**: https://smith.langchain.com

### 1.2 Criar Conta (Gratuita)

Você pode criar conta usando:

**Opção A - GitHub (Recomendado)**
1. Clique em **"Sign up with GitHub"**
2. Autorize o acesso
3. Pronto! Conta criada

**Opção B - Google**
1. Clique em **"Sign up with Google"**
2. Escolha sua conta Google
3. Pronto! Conta criada

**Opção C - Email**
1. Clique em **"Sign up with email"**
2. Preencha email e senha
3. Confirme o email
4. Pronto! Conta criada

### 1.3 Plano Gratuito

✅ **Developer Plan (Gratuito)**
- Tracing ilimitado por 14 dias
- Após 14 dias: 5000 traces/mês grátis
- Suficiente para desenvolvimento local

---

## Passo 2: Obter API Key

### 2.1 Acessar Settings

Após login:

1. **Clique no ícone de perfil** (canto superior direito)
2. Selecione **"Settings"**
3. Ou acesse diretamente: https://smith.langchain.com/settings

### 2.2 Criar API Key

Na página de Settings:

1. Vá para a aba **"API Keys"** (menu lateral esquerdo)
2. Clique em **"Create API Key"**
3. Dê um nome descritivo:
   - Exemplo: `"TradingSystem Local Dev"`
   - Exemplo: `"LangGraph Development"`
4. Clique em **"Create"**

### 2.3 Copiar API Key

⚠️ **IMPORTANTE**: A API key só é exibida UMA VEZ!

1. A key aparecerá no formato: `lsv2_pt_...` (long string)
2. **Copie TODA a key** (clique no botão copy)
3. **Guarde em lugar seguro** (você vai precisar dela)

**Exemplo de API Key:**
```
lsv2_pt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

---

## Passo 3: Configurar no Projeto

### 3.1 Editar o arquivo .env

```bash
# Abra o arquivo .env na raiz do projeto
nano .env

# Ou use seu editor preferido
code .env
```

### 3.2 Adicionar Configurações LangSmith

Adicione ou atualize estas linhas no `.env`:

```bash
# ============================================================================
# 🔬 LANGSMITH - LANGGRAPH OBSERVABILITY
# ============================================================================

# LangSmith API Key (OBRIGATÓRIO para Studio)
LANGSMITH_API_KEY=lsv2_pt_COLE_SUA_KEY_AQUI

# Enable tracing
LANGSMITH_TRACING=true

# Project name (pode customizar)
LANGSMITH_PROJECT=langgraph-dev

# Endpoint (não precisa mudar)
# LANGSMITH_ENDPOINT=https://api.smith.langchain.com
```

**Exemplo preenchido:**
```bash
LANGSMITH_API_KEY=lsv2_pt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=langgraph-dev
```

### 3.3 Salvar e Fechar

```bash
# Se usando nano:
Ctrl + O (salvar)
Enter
Ctrl + X (sair)

# Se usando VS Code:
Ctrl + S (salvar)
```

---

## Passo 4: Reiniciar Ambiente Dev

### 4.1 Parar Containers

```bash
bash scripts/langgraph/stop-dev.sh

# Ou manualmente:
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down
```

### 4.2 Iniciar com Nova Configuração

```bash
bash scripts/langgraph/start-dev.sh
```

### 4.3 Verificar Tracing Ativo

Nos logs, você deve ver:

```
✅ LangSmith tracing environment configured (project: langgraph-dev)
✅ LangSmith tracing active (project: langgraph-dev)
```

---

## Passo 5: Acessar LangSmith Studio

### 5.1 Navegar para Studio

🔗 **URL**: https://smith.langchain.com/studio

### 5.2 Selecionar Projeto

No Studio UI:

1. **Sidebar esquerdo**: Você verá "Projects"
2. **Clique em**: `langgraph-dev` (ou o nome que você configurou)
3. **Pronto!** Você está no Studio

### 5.3 Executar um Workflow de Teste

```bash
# Testar workflow de documentação
curl -X POST http://localhost:8112/workflows/docs/review \
  -H "Content-Type: application/json" \
  -d '{
    "markdown": "# Test Document\nThis is a test",
    "operation": "review"
  }'
```

### 5.4 Ver Trace no Studio

1. **No Studio**: Você verá uma nova trace aparecer
2. **Clique na trace**: Para ver detalhes
3. **Explore**: Nodes, state, timing, inputs/outputs

---

## Passo 6: Onboarding Completo (Opcional)

Quando você acessar o Studio pela primeira vez, pode aparecer um **tutorial interativo**:

### Passos do Onboarding:

1. **Welcome Screen**: Clique "Next"
2. **Create Your First Project**:
   - Pode pular (já temos `langgraph-dev`)
   - Ou criar novo projeto: `trading-system`
3. **Run Your First Trace**:
   - Execute o comando de teste acima
   - Veja a trace aparecer
4. **Explore Features**:
   - Click em uma trace
   - Veja inputs/outputs
   - Analise timing
5. **Complete!** ✅

---

## Verificação do Setup

### ✅ Checklist de Sucesso

```bash
# 1. API Key configurada no .env
grep "^LANGSMITH_API_KEY=lsv2_" .env
# Deve retornar: LANGSMITH_API_KEY=lsv2_...

# 2. Container dev rodando
docker ps | grep langgraph-dev
# Deve mostrar: infra-langgraph-dev

# 3. Tracing ativo nos logs
docker logs infra-langgraph-dev | grep "LangSmith tracing"
# Deve mostrar: ✅ LangSmith tracing active

# 4. Health check OK
curl -s http://localhost:8112/health | jq '.status'
# Deve retornar: "healthy"

# 5. Executar teste
curl -X POST http://localhost:8112/workflows/docs/review \
  -H "Content-Type: application/json" \
  -d '{"markdown":"# Test","operation":"review"}' | jq

# 6. Ver no Studio
# Acesse: https://smith.langchain.com/studio
# Selecione projeto: langgraph-dev
# Veja a trace do teste acima
```

---

## Troubleshooting

### Problema 1: API Key Inválida

**Sintoma:**
```
❌ LangSmith authentication failed
```

**Solução:**
1. Verifique se copiou a key completa (começa com `lsv2_pt_`)
2. Não deve ter espaços antes/depois
3. Gere uma nova key se necessário

### Problema 2: Tracing Não Aparece no Studio

**Sintoma:** Executo workflow mas não vejo traces

**Verificar:**

```bash
# 1. API key está configurada?
docker exec infra-langgraph-dev env | grep LANGSMITH_API_KEY

# 2. Tracing está habilitado?
docker exec infra-langgraph-dev env | grep LANGSMITH_TRACING

# 3. Projeto correto?
docker exec infra-langgraph-dev env | grep LANGSMITH_PROJECT

# 4. Ver logs em tempo real
docker logs infra-langgraph-dev -f
```

**Soluções:**
```bash
# Reiniciar com configuração limpa
docker compose -f infrastructure/compose/docker-compose.langgraph-dev.yml down
bash scripts/langgraph/start-dev.sh
```

### Problema 3: "Onboarding State Not Found"

**Sintoma:** Erro ao acessar Studio pela primeira vez

**Solução:**
1. Faça logout: https://smith.langchain.com/logout
2. Faça login novamente
3. Complete o onboarding tutorial
4. Ou acesse direto: https://smith.langchain.com/studio

### Problema 4: Projeto Não Aparece

**Sintoma:** Não vejo o projeto `langgraph-dev` no Studio

**Solução:**
1. Execute um workflow de teste (veja Passo 5.3)
2. O projeto é criado automaticamente na primeira trace
3. Recarregue a página do Studio (F5)

---

## Recursos Úteis

### URLs Importantes

| Recurso | URL |
|---------|-----|
| **Login** | https://smith.langchain.com |
| **Settings** | https://smith.langchain.com/settings |
| **API Keys** | https://smith.langchain.com/settings (aba "API Keys") |
| **Studio** | https://smith.langchain.com/studio |
| **Projects** | https://smith.langchain.com/projects |
| **Docs** | https://docs.smith.langchain.com |

### Comandos Úteis

```bash
# Ver configuração atual
grep LANGSMITH .env

# Testar conexão
docker exec infra-langgraph-dev python -c "
from langsmith import Client
import os
client = Client(api_key=os.environ.get('LANGSMITH_API_KEY'))
print('✅ LangSmith connected:', client.info())
"

# Reiniciar ambiente dev
bash scripts/langgraph/stop-dev.sh && bash scripts/langgraph/start-dev.sh

# Ver logs em tempo real
docker logs infra-langgraph-dev -f | grep -i langsmith
```

---

## Próximos Passos

Após completar o setup:

1. **Testar Workflows**
   - Execute workflows via API
   - Veja traces no Studio
   - Analise performance

2. **Explorar Studio Features**
   - Replay de workflows
   - Comparação de traces
   - Export de dados

3. **Customizar Projetos**
   - Criar projetos separados para dev/staging/prod
   - Organizar traces com tags
   - Configurar alertas

4. **Integração com CI/CD**
   - Usar tracing em testes automatizados
   - Monitorar performance em produção
   - Debugar problemas com traces

---

## Segurança

### ⚠️ IMPORTANTE: Proteção da API Key

```bash
# NUNCA commite o .env com API key real
git status .env
# Deve estar em .gitignore

# Verificar .gitignore
grep "^\.env$" .gitignore
# Deve retornar: .env

# Se acidentalmente commitar, revogue a key
# 1. Acesse https://smith.langchain.com/settings
# 2. Delete a key comprometida
# 3. Crie uma nova key
# 4. Atualize o .env
```

### Boas Práticas

1. **Uma key por ambiente**
   - Dev: `TradingSystem Dev`
   - Staging: `TradingSystem Staging`
   - Prod: `TradingSystem Production`

2. **Rotação regular**
   - Troque keys a cada 90 dias
   - Delete keys não usadas

3. **Projetos separados**
   - Dev: `langgraph-dev`
   - Staging: `langgraph-staging`
   - Prod: `langgraph-production`

---

## FAQ

### P: É obrigatório ter LangSmith para usar LangGraph?

**R:** Não! O LangGraph funciona perfeitamente sem LangSmith. O Studio é apenas uma ferramenta de debug visual opcional.

### P: O plano gratuito é suficiente?

**R:** Sim! Para desenvolvimento local, o plano gratuito (5000 traces/mês) é mais que suficiente.

### P: Posso usar em produção?

**R:** Sim, mas considere:
- Planos pagos para mais traces
- Ou desabilite tracing em produção (`LANGSMITH_TRACING=false`)
- Tracing adiciona ~50-100ms de latência

### P: Como desabilitar temporariamente?

**R:** No `.env`:
```bash
LANGSMITH_TRACING=false
```
E reinicie o container.

### P: Posso ter múltiplos projetos?

**R:** Sim! Basta mudar `LANGSMITH_PROJECT` no `.env` para diferentes ambientes.

---

## Related Documentation

- **[LangGraph Permanent Dev Setup](langgraph-permanent-dev-setup.md)** - Setup do ambiente dev
- **[LangGraph README](../../../infrastructure/langgraph/README.md)** - Documentação completa do serviço
- **[LangSmith Docs](https://docs.smith.langchain.com)** - Documentação oficial
- **[LangGraph Studio Guide](../backend/guides/langgraph-studio-guide.md)** - Guia de uso do Studio

---

## Changelog

### v1.0.0 (2025-10-19)
- ✅ Guia inicial de setup
- ✅ Passo a passo completo
- ✅ Troubleshooting
- ✅ Segurança e boas práticas

---

**Maintainer:** Marcelo Terra
**Last Updated:** 2025-10-19
