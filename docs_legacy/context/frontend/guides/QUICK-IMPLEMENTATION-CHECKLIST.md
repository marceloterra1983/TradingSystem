---
title: "Checklist Rápido: Implementação do Tema Gemini CLI"
tags: ["checklist", "implementation", "quick-start", "gemini-cli"]
domain: "frontend"
type: "guide"
summary: "Checklist passo-a-passo para implementar o tema Gemini CLI no Docusaurus"
status: "active"
last_review: "2025-10-19"
sidebar_position: 1
---

# ✅ Checklist Rápido: Implementação Tema Gemini CLI

> **Tempo estimado**: 2-3 horas para implementação básica  
> **Pré-requisito**: Docusaurus rodando em `http://localhost:3004`

## 📋 Fase 1: Preparação (15 min)

### 1.1 Backup Atual

```bash
# Criar branch para o tema
cd /home/marce/projetos/TradingSystem
git checkout -b feature/gemini-cli-theme

# Fazer commit do estado atual
git add -A
git commit -m "chore: backup antes de implementar tema Gemini CLI"
```

-   [ ] Branch criado
-   [ ] Commit inicial feito

### 1.2 Instalar Dependências

```bash
cd docs/docusaurus

# Instalar fontes
npm install @fontsource/inter @fontsource/jetbrains-mono

# Verificar instalação
npm list @fontsource/inter @fontsource/jetbrains-mono
```

-   [ ] Inter instalado
-   [ ] JetBrains Mono instalado
-   [ ] Dependências verificadas

### 1.3 Criar Estrutura de Arquivos

```bash
cd docs/docusaurus

# Criar diretórios se não existirem
mkdir -p src/css
mkdir -p src/theme

# Verificar estrutura
tree -L 2 src/
```

-   [ ] Diretório `src/css/` criado
-   [ ] Diretório `src/theme/` criado

## 🎨 Fase 2: Sistema de Cores (30 min)

### 2.1 Criar Arquivo de Tema Base

```bash
# Criar arquivo gemini-theme.css
touch src/css/gemini-theme.css
```

-   [ ] Arquivo criado

**Copiar conteúdo de**: `docs/context/frontend/guides/gemini-cli-theme-migration.md` (Seção "Fase 2: Sistema de Cores")

### 2.2 Atualizar custom.css

```bash
# Editar custom.css existente
nano src/css/custom.css
```

**Adicionar no topo**:

```css
@import "./gemini-theme.css";
```

**Copiar variáveis de**: `docs/context/frontend/guides/gemini-cli-theme-migration.md` (Seção "Passo 2.2")

-   [ ] `@import` adicionado
-   [ ] Variáveis Docusaurus mapeadas
-   [ ] Dark mode configurado

### 2.3 Criar Root Component

```bash
# Criar Root.js
touch src/theme/Root.js
```

**Conteúdo**:

```javascript
import React from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/700.css";

export default function Root({ children }) {
    return <>{children}</>;
}
```

-   [ ] Root.js criado
-   [ ] Fontes importadas

## 📝 Fase 3: Tipografia (20 min)

### 3.1 Adicionar Estilos de Heading

**Editar**: `src/css/custom.css`

**Copiar de**: `docs/context/frontend/guides/gemini-cli-theme-migration.md` (Seção "Fase 3: Tipografia")

-   [ ] Estilos h1-h6 adicionados
-   [ ] Hash links configurados
-   [ ] Inline code estilizado
-   [ ] Links customizados

## 🧩 Fase 4: Componentes (45 min)

### 4.1 Navbar

**Adicionar ao** `custom.css`:

```css
/* NAVBAR */
.navbar {
    height: 64px;
    box-shadow: 0 1px 0 0 var(--ifm-color-emphasis-200);
}
```

**Copiar resto de**: Migration Guide → Fase 4 → Passo 4.1

-   [ ] Navbar estilizado
-   [ ] Logo ajustado
-   [ ] Search bar customizado

### 4.2 Sidebar/Menu

**Adicionar ao** `custom.css`:

**Copiar de**: Migration Guide → Fase 4 → Passo 4.2

-   [ ] Menu items estilizados
-   [ ] Active state implementado
-   [ ] Hover effects adicionados
-   [ ] Collapsible animado

### 4.3 Code Blocks

**Adicionar ao** `custom.css`:

**Copiar de**: Migration Guide → Fase 4 → Passo 4.3

-   [ ] Code blocks com border radius
-   [ ] Syntax highlighting preservado
-   [ ] Copy button estilizado

### 4.4 Buttons

**Adicionar ao** `custom.css`:

**Copiar de**: Migration Guide → Fase 4 → Passo 4.6

-   [ ] Primary buttons
-   [ ] Secondary buttons
-   [ ] Hover animations

## 📱 Fase 5: Responsividade (15 min)

### 5.1 Media Queries

**Adicionar ao final do** `custom.css`:

**Copiar de**: Migration Guide → Fase 5

-   [ ] Mobile breakpoints (< 768px)
-   [ ] Tablet breakpoints (768-1024px)
-   [ ] Desktop breakpoints (> 1024px)

## 🧪 Fase 6: Testes (30 min)

### 6.1 Iniciar Servidor Local

```bash
cd docs/docusaurus
npm run start -- --port 3004
```

-   [ ] Servidor iniciado
-   [ ] Sem erros no console

### 6.2 Testes Visuais

#### Tema Claro

Abrir: `http://localhost:3004`

-   [ ] Cores aplicadas corretamente
-   [ ] Roxo primário (#9333EA) visível nos links
-   [ ] Tipografia Inter carregada
-   [ ] Sidebar com background correto (#FAFAFA)
-   [ ] Hover effects funcionando
-   [ ] Code blocks estilizados

#### Tema Escuro

Clicar no botão de tema → Dark

-   [ ] Transição suave
-   [ ] Cores dark mode aplicadas
-   [ ] Contraste adequado
-   [ ] Links visíveis
-   [ ] Code blocks legíveis

#### Responsividade

-   [ ] Mobile (< 768px): Layout compacto
-   [ ] Tablet (768-1024px): Layout intermediário
-   [ ] Desktop (> 1024px): Layout completo
-   [ ] Sidebar mobile funcional

### 6.3 Testes de Performance

```bash
# Build de produção
npm run build

# Servir build
npm run serve
```

**Abrir DevTools** → Lighthouse:

-   [ ] Performance > 90
-   [ ] Accessibility > 90
-   [ ] Best Practices > 90
-   [ ] SEO > 90

### 6.4 Validação de Acessibilidade

**Usar**: [WAVE Extension](https://wave.webaim.org/extension/)

-   [ ] Sem erros de contraste
-   [ ] Headings hierárquicos corretos
-   [ ] Links descritivos
-   [ ] Keyboard navigation funcional

## 🚀 Fase 7: Finalização (15 min)

### 7.1 Screenshots

```bash
# Capturar screenshots
mkdir -p docs/context/frontend/analysis/screenshots
```

**Capturar**:

-   [ ] Homepage light mode
-   [ ] Homepage dark mode
-   [ ] Sidebar aberto
-   [ ] Code block exemplo
-   [ ] Mobile view

### 7.2 Commit Changes

```bash
cd /home/marce/projetos/TradingSystem

# Adicionar arquivos
git add docs/docusaurus/src/css/
git add docs/docusaurus/src/theme/
git add docs/docusaurus/package*.json

# Commit
git commit -m "feat(docs): implement Gemini CLI theme

- Add Inter and JetBrains Mono fonts
- Implement purple color scheme (#9333EA)
- Customize navbar, sidebar, and components
- Add dark mode support
- Improve typography hierarchy
- Add responsive breakpoints

Ref: docs/context/frontend/GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md"
```

-   [ ] Arquivos adicionados
-   [ ] Commit com mensagem descritiva

### 7.3 Criar Pull Request

```bash
# Push branch
git push -u origin feature/gemini-cli-theme
```

**No GitHub**:

-   [ ] PR criado
-   [ ] Screenshots adicionados na descrição
-   [ ] Checklist incluído
-   [ ] Reviewers atribuídos

### 7.4 Documentação

**Atualizar**: `docs/context/frontend/README.md`

```markdown
## 🎨 Design System

### Cores (Atual) ✅

Primary: Purple (#9333EA) - Gemini CLI Theme
Background: White (#FFFFFF)
Text: Gray (#1F2937)
```

-   [ ] README atualizado
-   [ ] Status do tema documentado

## 📊 Métricas de Sucesso

### Antes vs Depois

| Métrica               | Antes | Depois | Meta |
| --------------------- | ----- | ------ | ---- |
| Lighthouse Score      | ?     | ?      | > 90 |
| Tempo de Carregamento | ?     | ?      | < 3s |
| Contraste (WCAG)      | ?     | ?      | AA   |
| Responsividade        | ✅    | ✅     | ✅   |

### User Feedback

-   [ ] Time aprovou design
-   [ ] Stakeholders reviram
-   [ ] Usuários testaram navegação

## 🐛 Troubleshooting Rápido

### Problema: Fontes não carregam

```bash
# Limpar cache
rm -rf node_modules/.cache
npm run start -- --port 3004
```

### Problema: Cores não aplicam

```css
/* Verificar ordem no custom.css */
@import "./gemini-theme.css"; /* DEVE vir primeiro */
```

### Problema: Dark mode quebrado

```javascript
// Verificar docusaurus.config.js
colorMode: {
  disableSwitch: false,  // Deve ser FALSE
}
```

### Problema: Build falha

```bash
# Verificar sintaxe CSS
npx stylelint "src/css/**/*.css"

# Limpar e rebuildar
npm run clear
npm run build
```

## 📚 Referências Rápidas

| Documento                                                       | Uso              |
| --------------------------------------------------------------- | ---------------- |
| [Resumo Executivo](../GEMINI-CLI-THEME-EXECUTIVE-SUMMARY.md)    | Overview geral   |
| [Guia Completo](./gemini-cli-theme-migration.md)                | Código detalhado |
| [Análise](../analysis/gemini-cli-style-extraction.md)           | Design system    |
| [Script Extração](../scripts/SCRIPT-EXTRACTION-INSTRUCTIONS.md) | Automação        |

## ⏱️ Tempo Real vs Estimado

| Fase      | Estimado   | Real | Desvio |
| --------- | ---------- | ---- | ------ |
| Fase 1    | 15 min     | ?    | ?      |
| Fase 2    | 30 min     | ?    | ?      |
| Fase 3    | 20 min     | ?    | ?      |
| Fase 4    | 45 min     | ?    | ?      |
| Fase 5    | 15 min     | ?    | ?      |
| Fase 6    | 30 min     | ?    | ?      |
| Fase 7    | 15 min     | ?    | ?      |
| **Total** | **2h 50m** | ?    | ?      |

## ✨ Próximo Nível (Opcional)

### Melhorias Futuras

-   [ ] Adicionar animações custom
-   [ ] Implementar search personalizado
-   [ ] Criar componentes adicionais
-   [ ] Otimizar performance
-   [ ] Adicionar Easter eggs
-   [ ] Implementar PWA features

### Design System Completo

-   [ ] Criar Storybook
-   [ ] Documentar todos os componentes
-   [ ] Adicionar testes visuais
-   [ ] Criar guia de marca

---

**Última Atualização**: 2025-10-19  
**Status**: ✅ Ready to Use  
**Dificuldade**: 🟡 Intermediate
