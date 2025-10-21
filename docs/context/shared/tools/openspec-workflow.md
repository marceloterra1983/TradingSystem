---
title: OpenSpec Workflow Guide
sidebar_position: 10
tags: [openspec, workflow, specs, shared]
domain: shared
type: guide
summary: Workflow guide for using OpenSpec CLI in TradingSystem development
status: active
last_review: 2025-10-17
---

# OpenSpec Workflow Guide - TradingSystem

**Última atualização:** 2025-10-13  
**OpenSpec CLI:** v0.11.0  
**Status:** ✅ Instalado e configurado no WSL

---

## 🎯 O que é OpenSpec?

OpenSpec é um sistema de **desenvolvimento orientado a especificações** que mantém:
- **📝 Specs** (`openspec/specs/`) = O que **ESTÁ CONSTRUÍDO**
- **🔄 Changes** (`openspec/changes/`) = O que **VAI MUDAR**
- **📦 Archive** (`openspec/changes/archive/`) = O que **FOI CONCLUÍDO**

---

## 🏗️ Estado Atual do Projeto

### Mudanças Ativas (2)
1. ✅ `add-service-launcher-health-summary` - Status agregado de serviços (VALIDADO)
2. 🔄 `update-docs-navigation-api-spec` - Atualização da API de navegação

### Especificações Existentes (2)
1. `service-launcher` - Sistema de orquestração de serviços
2. `docs/navigation` - Sistema de navegação da documentação

---

## 📚 Workflow em 3 Estágios

### **Estágio 1: Criar Proposta de Mudança**

#### Quando criar uma proposta?

✅ **CRIAR PROPOSTA para:**
- Nova funcionalidade ou capability
- Breaking changes (API, schema, arquitetura)
- Mudanças de performance que alteram comportamento
- Mudanças de segurança ou padrões

❌ **NÃO criar proposta para:**
- Bug fixes (restaurar comportamento esperado)
- Typos, formatação, comentários
- Atualizações de dependências (não-breaking)
- Mudanças de configuração
- Testes de comportamento existente

#### Passo a passo:

```bash
# 1. Explorar estado atual
cd /home/marce/projetos/TradingSystem
openspec list             # Ver mudanças ativas
openspec list --specs     # Ver especificações

# 2. Escolher um ID único (kebab-case, verb-led)
CHANGE=add-telegram-bot-monitoring

# 3. Criar estrutura
mkdir -p openspec/changes/$CHANGE/specs/telegram-bot

# 4. Criar proposal.md
cat > openspec/changes/$CHANGE/proposal.md << 'EOF'
## Why
Precisamos monitorar a saúde dos bots Telegram em tempo real.

## What Changes
- Adicionar endpoint `/telegram/bots/health` no TP Capital API
- Dashboard exibe status de conexão de cada bot

## Impact
- Affected specs: telegram-bot
- Affected code: frontend/apps/tp-capital/, frontend/apps/dashboard/
EOF

# 5. Criar tasks.md
cat > openspec/changes/$CHANGE/tasks.md << 'EOF'
## 1. Backend API
- [ ] 1.1 Implementar endpoint /telegram/bots/health
- [ ] 1.2 Adicionar verificação de status do bot via Telegram API
- [ ] 1.3 Escrever testes

## 2. Dashboard
- [ ] 2.1 Consumir endpoint e mostrar status
- [ ] 2.2 Adicionar indicador visual (verde/vermelho)

## 3. Documentação
- [ ] 3.1 Atualizar docs/context/frontend/apps/tp-capital/
EOF

# 6. Criar delta spec
cat > openspec/changes/$CHANGE/specs/telegram-bot/spec.md << 'EOF'
## ADDED Requirements

### Requirement: Bot Health Monitoring
The system SHALL provide health status for each configured Telegram bot.

#### Scenario: Healthy bot
- **WHEN** bot is authenticated and connected to Telegram
- **THEN** status is "online" with last_check timestamp

#### Scenario: Unhealthy bot
- **WHEN** bot token is invalid or Telegram API is unreachable
- **THEN** status is "offline" with error message
EOF

# 7. Validar
openspec validate $CHANGE --strict
```

---

### **Estágio 2: Implementar Mudança**

Depois que a proposta for **revisada e aprovada**, eu vou:

```bash
# 1. Ler a proposta
cat openspec/changes/$CHANGE/proposal.md

# 2. Ler as tasks
cat openspec/changes/$CHANGE/tasks.md

# 3. Implementar sequencialmente
# Completo cada task e marco com [x]

# 4. Após tudo pronto, atualizar tasks.md
# Trocar todos - [ ] por - [x]
```

**Exemplo Real do Projeto:**

```bash
cd /home/marce/projetos/TradingSystem
cat openspec/changes/add-service-launcher-health-summary/tasks.md
```

Você verá:
```markdown
## 1. Laucher API
- [x] 1.1 Atualizar handler... ✅ CONCLUÍDO
- [x] 1.2 Incluir timestamp... ✅ CONCLUÍDO

## 3. Documentação
- [x] 3.1 Atualizar docs... ✅ CONCLUÍDO
- [ ] 3.2 Changelog... ⏳ PENDENTE
```

---

### **Estágio 3: Arquivar Mudança**

Após deploy e validação em produção:

```bash
# Arquivar a mudança
cd /home/marce/projetos/TradingSystem
openspec archive add-service-launcher-health-summary --yes

# Isso vai:
# 1. Mover changes/add-service-launcher-health-summary/ 
#    → changes/archive/2025-10-13-add-service-launcher-health-summary/
# 2. Atualizar specs/service-launcher/spec.md com as mudanças
# 3. Validar que tudo está correto
```

---

## 🛠️ Comandos Essenciais

### Ver Estado do Projeto

```bash
# Listar mudanças ativas
openspec list

# Listar especificações
openspec list --specs

# Ver dashboard interativo
openspec view

# Ver detalhes de uma mudança
openspec show add-service-launcher-health-summary

# Ver detalhes de uma spec
openspec show service-launcher --type spec

# Ver diff (o que vai mudar)
openspec diff add-service-launcher-health-summary
```

### Validar

```bash
# Validar mudança específica
openspec validate add-service-launcher-health-summary --strict

# Validar tudo
openspec validate --strict

# Debug de deltas
openspec show add-service-launcher-health-summary --json --deltas-only
```

---

## 🤝 Como Trabalhamos Juntos

### Você Diz:
- "Preciso adicionar autenticação de dois fatores"
- "Quero criar um dashboard de métricas"
- "Vamos implementar WebSocket real-time"

### Eu Faço:

1. **📋 Crio a proposta estruturada**
   ```bash
   openspec/changes/add-two-factor-auth/
   ├── proposal.md  # Por quê precisamos + O quê muda + Impacto
   ├── tasks.md     # Checklist detalhado
   └── specs/auth/
       └── spec.md  # Requirements com cenários
   ```

2. **✅ Valido antes de compartilhar**
   ```bash
   openspec validate add-two-factor-auth --strict
   ```

3. **🚦 Peço aprovação**
   - "Criei a proposta `add-two-factor-auth`. Por favor, revise antes de eu implementar."

4. **⚙️ Implemento após aprovação**
   - Sigo o `tasks.md` sequencialmente
   - Marco cada item como `[x]` após completar
   - Comito código seguindo a spec

5. **📦 Arquivamos juntos**
   ```bash
   openspec archive add-two-factor-auth --yes
   ```

---

## 🧪 Teste Prático Agora

Vamos ver o estado atual:

```bash
cd /home/marce/projetos/TradingSystem

# Ver mudança ativa
openspec show add-service-launcher-health-summary

# Ver tasks (o que falta fazer)
cat openspec/changes/add-service-launcher-health-summary/tasks.md

# Validar
openspec validate add-service-launcher-health-summary --strict
```

---

## 📋 Exemplo Real: Laucher Health Summary

### Proposta
**Por quê:** Dashboard precisa de visão rápida da saúde dos serviços  
**O quê:** Adicionar `overallStatus`, `degradedCount`, `averageLatencyMs`  
**Impacto:** Dashboard mostra card com semáforo (verde/amarelo/vermelho)

### Tasks Status
- ✅ Backend implementado
- ✅ Frontend implementado  
- ✅ Specs escritas
- ⏳ Changelog pendente

### Próximo Passo
Você pode executar:
```bash
openspec show add-service-launcher-health-summary
```

Para ver todos os detalhes da mudança!

---

## 💡 Dicas Práticas

### Para Bugs/Pequenas Mudanças
- **NÃO use OpenSpec**
- Apenas implemente diretamente
- Exemplo: "Corrigir typo no README" → Implemento direto

### Para Novas Features
- **USE OpenSpec**
- Crio proposta → Você aprova → Implemento
- Exemplo: "Adicionar gráfico de performance" → Crio spec primeiro

### Comandos do Dia a Dia

```bash
# Início do dia - ver o que está em progresso
openspec list

# Antes de começar uma feature
openspec list --specs  # Ver o que já existe

# Durante o desenvolvimento
openspec validate my-change --strict  # Garantir que está certo

# Após deploy
openspec archive my-change --yes  # Marcar como concluído
```

---

## 🚀 Teste Agora!

Execute estes comandos para se familiarizar:

```bash
cd /home/marce/projetos/TradingSystem

# 1. Ver todas as mudanças
openspec list

# 2. Ver detalhes de uma mudança
openspec show add-service-launcher-health-summary

# 3. Ver especificações
openspec list --specs

# 4. Ver help
openspec --help

# 5. Dashboard interativo
openspec view
```

**OpenSpec CLI está pronto para uso! 🎉**

Sempre que você pedir uma **nova feature ou mudança significativa**, eu vou:
1. Criar a proposta estruturada
2. Validar com `openspec validate --strict`
3. Pedir sua aprovação
4. Implementar seguindo o `tasks.md`
5. Arquivar após deploy

Quer que eu crie um exemplo de proposta agora para você ver o processo completo?


