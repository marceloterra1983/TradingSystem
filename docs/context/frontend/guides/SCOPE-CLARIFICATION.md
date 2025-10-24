---
title: "Esclarecimento de Escopo: Tema Gemini CLI"
tags: ["scope", "clarification", "docusaurus-only", "important"]
domain: "frontend"
type: "clarification"
summary: "IMPORTANTE: Mudanças aplicam-se APENAS ao Docusaurus (porta 3004)"
status: "active"
last_review: "2025-10-19"
priority: "high"
sidebar_position: 1
---

# ⚠️ Esclarecimento de Escopo: Tema Gemini CLI

> **IMPORTANTE**: As mudanças de tema documentadas aplicam-se **EXCLUSIVAMENTE** ao **Docusaurus** (documentação em `http://localhost:3004`).

## 🎯 O Que Será Modificado

### ✅ APENAS Docusaurus (Porta 3004)

**Localização**: `docs/docusaurus/`

**Arquivos afetados**:

```
docs/docusaurus/
├── src/
│   ├── css/
│   │   ├── custom.css           ← Modificar
│   │   └── gemini-theme.css     ← Criar NOVO
│   └── theme/
│       └── Root.js              ← Criar NOVO
├── docusaurus.config.js         ← Atualizar (opcional)
└── package.json                 ← Adicionar fontes
```

**O que muda**:

-   ✅ Cores da documentação (roxo #9333EA)
-   ✅ Tipografia (Inter + JetBrains Mono)
-   ✅ Sidebar da documentação
-   ✅ Navbar da documentação
-   ✅ Code blocks na documentação
-   ✅ Dark mode da documentação

**Impacto**: Apenas visual da documentação oficial

## ❌ O Que NÃO Será Modificado

### Dashboard React (Porta 3103)

**Localização**: `frontend/dashboard/`

**Permanece INALTERADO**:

-   ❌ Cores do dashboard (blue #3B82F6)
-   ❌ Componentes React do dashboard
-   ❌ Tailwind config do dashboard
-   ❌ UI do dashboard (mantém shadcn/ui)
-   ❌ Branding do dashboard
-   ❌ Estado e lógica do dashboard

### Outras Aplicações Frontend

**NENHUMA mudança em**:

-   ❌ TP Capital (`apps/tp-capital/`)
-   ❌ B3 Market Data (`apps/b3-market-data/`)

### Backend & APIs

**NENHUMA mudança em**:

-   ❌ APIs backend (portas 3200-3600)
-   ❌ Lógica de negócio
-   ❌ Banco de dados
-   ❌ Configurações de infraestrutura

## 📊 Comparação Visual

### Antes da Implementação

| Aplicação      | Porta | Tema Atual        | Status    |
| -------------- | ----- | ----------------- | --------- |
| **Dashboard**  | 3103  | Tailwind Blue     | ✅ Mantém |
| **Docusaurus** | 3004  | Padrão Docusaurus | ⚠️ Muda   |
| TP Capital     | 3200  | Bootstrap         | ✅ Mantém |
| B3             | 3302  | React             | ✅ Mantém |

### Após a Implementação

| Aplicação      | Porta | Tema Após           | Mudança    |
| -------------- | ----- | ------------------- | ---------- |
| **Dashboard**  | 3103  | Tailwind Blue       | ❌ Nenhuma |
| **Docusaurus** | 3004  | Gemini CLI (Purple) | ✅ NOVO    |
| TP Capital     | 3200  | Bootstrap           | ❌ Nenhuma |
| B3             | 3302  | React               | ❌ Nenhuma |

## 🔍 Por Que Apenas Docusaurus?

### Razões Técnicas

1. **Separação de Concerns**: Documentação ≠ Aplicação
2. **Tecnologias Diferentes**: Docusaurus usa tema próprio
3. **Escopo Focado**: Melhorar apenas a documentação
4. **Baixo Risco**: Não afeta código de produção

### Razões de Negócio

1. **Identidade Visual**: Documentação pode ter estilo próprio
2. **Experiência do Desenvolvedor**: Docs modernos e profissionais
3. **Credibilidade**: Melhor impressão para colaboradores
4. **Independência**: Dashboard mantém identidade atual

## 🎨 Design System - Comparação

### Dashboard (Mantém)

```css
/* frontend/dashboard/src/index.css */
Primary: Blue (#3B82F6)
Font: System fonts
Framework: Tailwind CSS
Components: shadcn/ui
```

### Docusaurus (Novo)

```css
/* docs/docusaurus/src/css/gemini-theme.css */
Primary: Purple (#9333EA)
Font: Inter + JetBrains Mono
Framework: Docusaurus
Components: Docusaurus theme
```

## 📋 Checklist de Validação

### Antes de Começar

-   [ ] Confirmar que vai modificar APENAS Docusaurus
-   [ ] Não tocar no dashboard (`frontend/dashboard/`)
-   [ ] Não modificar outras aplicações
-   [ ] Criar branch específico: `feature/docusaurus-gemini-theme`

### Durante Implementação

-   [ ] Trabalhar APENAS em `docs/docusaurus/`
-   [ ] Testar em `http://localhost:3004` (Docusaurus)
-   [ ] NÃO abrir `http://localhost:3103` (Dashboard)
-   [ ] Commit apenas arquivos do Docusaurus

### Após Implementação

-   [ ] Dashboard ainda funciona em 3103? ✅
-   [ ] Docusaurus mudou em 3004? ✅
-   [ ] APIs backend funcionam? ✅
-   [ ] Outros frontends funcionam? ✅

## 🚀 Quick Test

### Testar Dashboard (Deve estar INALTERADO)

```bash
# Terminal 1
cd frontend/dashboard
npm run dev

# Abrir: http://localhost:3103
# Verificar: Cores BLUE, tudo normal
```

### Testar Docusaurus (Deve ter NOVO tema)

```bash
# Terminal 2
cd docs/docusaurus
npm run start -- --port 3004

# Abrir: http://localhost:3004
# Verificar: Cores PURPLE, novo tema
```

## 💡 Analogia Simples

Pense assim:

```
🏢 TradingSystem (Prédio)
├── 📱 Dashboard (Andar 3, Porta 3103)
│   └── Decoração: Moderna com azul
│       └── ❌ NÃO MEXER
│
└── 📚 Biblioteca/Docs (Andar 4, Porta 3004)
    └── Decoração: Vai mudar para roxo
        └── ✅ MODIFICAR APENAS AQUI
```

Estamos **redecorando APENAS a biblioteca (Docusaurus)**.  
O resto do prédio **permanece exatamente igual**.

## 🔗 Contexto Completo

### Estrutura de Diretórios

```bash
TradingSystem/
├── frontend/                      # ❌ NÃO MEXER
│   ├── apps/
│   │   ├── dashboard/            # ❌ Dashboard - MANTÉM
│   │   ├── tp-capital/           # ❌ MANTÉM
│   │   └── b3-market-data/       # ❌ MANTÉM
│   └── shared/                   # ❌ MANTÉM
│
├── backend/                      # ❌ NÃO MEXER
│   └── api/                     # ❌ APIs - MANTÉM
│
└── docs/                         # ✅ TRABALHAR AQUI
    └── docusaurus/              # ✅ MODIFICAR APENAS ISSO
        ├── src/
        │   ├── css/             # ✅ Adicionar tema
        │   └── theme/           # ✅ Adicionar Root.js
        └── package.json         # ✅ Adicionar fontes
```

## 🎯 Objetivos Claros

### O Que Queremos

✅ Documentação com visual profissional (Gemini CLI style)  
✅ Manter identidade atual do Dashboard  
✅ Separação clara entre docs e app  
✅ Zero risco para código de produção

### O Que NÃO Queremos

❌ Mudar Dashboard sem necessidade  
❌ Confundir estilos entre apps  
❌ Riscos desnecessários  
❌ Trabalho duplicado

## 📞 Perguntas Frequentes

### P: Posso usar o tema Gemini CLI no Dashboard?

**R**: Não neste momento. Este projeto é APENAS para Docusaurus. Se quiser no Dashboard, seria um projeto separado.

### P: As fontes Inter/JetBrains Mono vão afetar o Dashboard?

**R**: Não. As fontes são instaladas APENAS no package.json do Docusaurus (`docs/docusaurus/package.json`), não no Dashboard.

### P: E se eu quiser o mesmo tema em todo o projeto?

**R**: Isso seria um projeto muito maior chamado "Design System Unificado". O escopo atual é APENAS Docusaurus.

### P: Por que não fazer tudo de uma vez?

**R**: Princípio de "pequenos passos". Melhor fazer bem feito em uma parte, depois avaliar expansão.

### P: O Dashboard vai ficar "feio" comparado ao Docs?

**R**: Não. O Dashboard já tem um design moderno com Tailwind + shadcn/ui. São estilos diferentes para propósitos diferentes.

## ✅ Confirmação Final

Antes de começar a implementação, confirme:

-   [ ] Entendo que vou modificar APENAS o Docusaurus
-   [ ] Não vou tocar no Dashboard React
-   [ ] Não vou modificar outras aplicações
-   [ ] Vou trabalhar apenas em `docs/docusaurus/`
-   [ ] Vou testar em `http://localhost:3004`
-   [ ] Vou criar branch: `feature/docusaurus-gemini-theme`

**Assinatura**: ******\_\_\_\_******  
**Data**: 2025-10-19

---

## 🚨 Avisos Importantes

### ⚠️ Não Faça

-   ❌ Modificar `frontend/dashboard/`
-   ❌ Instalar pacotes no dashboard
-   ❌ Copiar CSS entre projetos
-   ❌ Mudar Tailwind config do dashboard
-   ❌ Alterar componentes shadcn/ui

### ✅ Faça Apenas

-   ✅ Trabalhar em `docs/docusaurus/`
-   ✅ Instalar pacotes em `docs/docusaurus/package.json`
-   ✅ Modificar CSS em `docs/docusaurus/src/css/`
-   ✅ Testar em porta 3004
-   ✅ Commit apenas arquivos do Docusaurus

---

**Última Atualização**: 2025-10-19  
**Importância**: 🔴 CRÍTICA  
**Leia Antes de Começar**: ✅ OBRIGATÓRIO
