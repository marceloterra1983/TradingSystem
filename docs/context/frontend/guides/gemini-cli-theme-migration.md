---
title: "Guia de Migração: Tema Gemini CLI para Docusaurus"
tags: ["docusaurus", "theme", "migration", "gemini-cli", "implementation"]
domain: "frontend"
type: "guide"
summary: "Guia passo a passo para implementar o tema do Gemini CLI no nosso Docusaurus"
status: "active"
last_review: "2025-10-19"
---

# Guia de Migração: Tema Gemini CLI para Docusaurus

> **Objetivo**: Implementar o design system do Gemini CLI no nosso Docusaurus, mantendo a identidade visual profissional e moderna.

## 📋 Índice

1. [Pré-requisitos](#pré-requisitos)
2. [Fase 1: Configuração Básica](#fase-1-configuração-básica)
3. [Fase 2: Sistema de Cores](#fase-2-sistema-de-cores)
4. [Fase 3: Tipografia](#fase-3-tipografia)
5. [Fase 4: Componentes](#fase-4-componentes)
6. [Fase 5: Responsividade](#fase-5-responsividade)
7. [Fase 6: Testes](#fase-6-testes)
8. [Troubleshooting](#troubleshooting)

## 🎯 Pré-requisitos

### Ferramentas Necessárias

-   ✅ Node.js 18+ instalado
-   ✅ Docusaurus 3.x configurado
-   ✅ Git para versionamento
-   ✅ VSCode com extensões Tailwind/CSS

### Estrutura de Arquivos

```
docs/
├── docusaurus/
│   ├── src/
│   │   ├── css/
│   │   │   ├── custom.css           # CSS customizado (criar/editar)
│   │   │   └── gemini-theme.css     # Tema Gemini CLI (criar)
│   │   ├── components/              # Componentes customizados
│   │   └── theme/                   # Overrides do tema
│   ├── static/
│   │   └── fonts/                   # Fontes customizadas
│   ├── docusaurus.config.js         # Configuração principal
│   └── package.json
```

## 🚀 Fase 1: Configuração Básica

### Passo 1.1: Instalar Dependências

```bash
cd docs/docusaurus

# Instalar fontes do Google
npm install @fontsource/inter @fontsource/jetbrains-mono

# Instalar plugin de temas (se necessário)
npm install @docusaurus/theme-live-codeblock

# Instalar Swizzle para customização
# (já vem com Docusaurus)
```

### Passo 1.2: Configurar docusaurus.config.js

```javascript
// docs/docusaurus/docusaurus.config.js

const config = {
    title: "TradingSystem Docs",
    tagline: "Sistema de Trading Local com Clean Architecture",

    themeConfig: {
        // Navbar configuration
        navbar: {
            title: "TradingSystem",
            logo: {
                alt: "TradingSystem Logo",
                src: "img/logo.svg",
                srcDark: "img/logo-dark.svg",
            },
            items: [
                {
                    type: "docSidebar",
                    sidebarId: "contextSidebar",
                    position: "left",
                    label: "Docs",
                },
                {
                    href: "https://github.com/seu-usuario/TradingSystem",
                    label: "GitHub",
                    position: "right",
                },
            ],
        },

        // Footer configuration
        footer: {
            style: "dark",
            links: [
                {
                    title: "Docs",
                    items: [
                        {
                            label: "Get Started",
                            to: "/docs/intro",
                        },
                    ],
                },
            ],
            copyright: `Copyright © ${new Date().getFullYear()} TradingSystem`,
        },

        // Color mode configuration
        colorMode: {
            defaultMode: "light",
            disableSwitch: false,
            respectPrefersColorScheme: true,
        },

        // Prism theme for code blocks
        prism: {
            theme: require("prism-react-renderer/themes/github"),
            darkTheme: require("prism-react-renderer/themes/dracula"),
            additionalLanguages: ["bash", "json", "yaml", "typescript", "python", "csharp"],
        },

        // Algolia search (opcional)
        algolia: {
            appId: "YOUR_APP_ID",
            apiKey: "YOUR_API_KEY",
            indexName: "tradingsystem",
        },
    },
};

module.exports = config;
```

### Passo 1.3: Importar Fontes

```javascript
// docs/docusaurus/src/theme/Root.js (criar se não existir)

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

## 🎨 Fase 2: Sistema de Cores

### Passo 2.1: Criar Arquivo de Tema

Crie o arquivo `docs/docusaurus/src/css/gemini-theme.css`:

```css
/**
 * Gemini CLI Theme for Docusaurus
 * Adapted from: https://geminicli.com/docs/
 */

:root {
    /* ==================== */
    /* PRIMARY COLORS       */
    /* ==================== */
    --gemini-primary: #9333ea;
    --gemini-primary-dark: #7e22ce;
    --gemini-primary-darker: #7213ce;
    --gemini-primary-darkest: #5e0fc7;
    --gemini-primary-light: #a855f7;
    --gemini-primary-lighter: #c084fc;
    --gemini-primary-lightest: #e9d5ff;

    /* ==================== */
    /* BACKGROUND COLORS    */
    /* ==================== */
    --gemini-bg-primary: #ffffff;
    --gemini-bg-secondary: #f8f9fa;
    --gemini-bg-surface: #ffffff;
    --gemini-bg-hover: rgba(147, 51, 234, 0.05);

    /* ==================== */
    /* TEXT COLORS          */
    /* ==================== */
    --gemini-text-primary: #1f2937;
    --gemini-text-secondary: #6b7280;
    --gemini-text-tertiary: #9ca3af;

    /* ==================== */
    /* BORDER COLORS        */
    /* ==================== */
    --gemini-border: #e5e7eb;
    --gemini-border-light: #f3f4f6;

    /* ==================== */
    /* SIDEBAR              */
    /* ==================== */
    --gemini-sidebar-bg: #fafafa;
    --gemini-sidebar-hover: #f3f4f6;
    --gemini-sidebar-active: #ede9fe;
    --gemini-sidebar-active-text: #7c3aed;

    /* ==================== */
    /* INTERACTIVE          */
    /* ==================== */
    --gemini-input-bg: #f9fafb;
    --gemini-input-border: #d1d5db;
    --gemini-button-secondary: #f3f4f6;

    /* ==================== */
    /* CODE                 */
    /* ==================== */
    --gemini-code-bg: #f6f8fa;
    --gemini-code-color: #c41a16;
    --gemini-code-border: #e5e7eb;

    /* ==================== */
    /* SPACING              */
    /* ==================== */
    --gemini-space-xs: 0.25rem; /* 4px */
    --gemini-space-sm: 0.5rem; /* 8px */
    --gemini-space-md: 1rem; /* 16px */
    --gemini-space-lg: 1.5rem; /* 24px */
    --gemini-space-xl: 2rem; /* 32px */
    --gemini-space-2xl: 3rem; /* 48px */
    --gemini-space-3xl: 4rem; /* 64px */

    /* ==================== */
    /* TRANSITIONS          */
    /* ==================== */
    --gemini-transition-fast: 150ms;
    --gemini-transition-base: 200ms;
    --gemini-transition-slow: 300ms;
    --gemini-easing: cubic-bezier(0.4, 0, 0.2, 1);
}

/* ==================== */
/* DARK MODE            */
/* ==================== */
[data-theme="dark"] {
    --gemini-bg-primary: #111827;
    --gemini-bg-secondary: #1f2937;
    --gemini-bg-surface: #1f2937;
    --gemini-bg-hover: rgba(168, 85, 247, 0.1);

    --gemini-text-primary: #f9fafb;
    --gemini-text-secondary: #d1d5db;
    --gemini-text-tertiary: #9ca3af;

    --gemini-border: #374151;
    --gemini-border-light: #4b5563;

    --gemini-sidebar-bg: #1f2937;
    --gemini-sidebar-hover: #374151;
    --gemini-sidebar-active: #4c1d95;
    --gemini-sidebar-active-text: #c084fc;

    --gemini-input-bg: #1f2937;
    --gemini-input-border: #4b5563;
    --gemini-button-secondary: #374151;

    --gemini-code-bg: #1f2937;
    --gemini-code-color: #f87171;
    --gemini-code-border: #374151;
}
```

### Passo 2.2: Mapear para Variáveis do Docusaurus

Edite `docs/docusaurus/src/css/custom.css`:

```css
/**
 * Custom CSS for TradingSystem Documentation
 * Applying Gemini CLI Theme
 */

@import "./gemini-theme.css";

:root {
    /* ==================== */
    /* DOCUSAURUS OVERRIDES */
    /* ==================== */

    /* Primary Colors */
    --ifm-color-primary: var(--gemini-primary);
    --ifm-color-primary-dark: var(--gemini-primary-dark);
    --ifm-color-primary-darker: var(--gemini-primary-darker);
    --ifm-color-primary-darkest: var(--gemini-primary-darkest);
    --ifm-color-primary-light: var(--gemini-primary-light);
    --ifm-color-primary-lighter: var(--gemini-primary-lighter);
    --ifm-color-primary-lightest: var(--gemini-primary-lightest);

    /* Background */
    --ifm-background-color: var(--gemini-bg-primary);
    --ifm-background-surface-color: var(--gemini-bg-secondary);
    --ifm-hover-overlay: var(--gemini-bg-hover);

    /* Text */
    --ifm-color-content: var(--gemini-text-primary);
    --ifm-color-content-secondary: var(--gemini-text-secondary);
    --ifm-color-emphasis-300: var(--gemini-text-tertiary);

    /* Borders */
    --ifm-color-emphasis-200: var(--gemini-border);
    --ifm-toc-border-color: var(--gemini-border);

    /* Sidebar/Menu */
    --ifm-menu-color: var(--gemini-text-secondary);
    --ifm-menu-color-active: var(--gemini-sidebar-active-text);
    --ifm-menu-color-background-active: var(--gemini-sidebar-active);
    --ifm-menu-color-background-hover: var(--gemini-sidebar-hover);

    /* Typography */
    --ifm-font-family-base: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    --ifm-font-family-monospace: "JetBrains Mono", "Fira Code", "Monaco", monospace;
    --ifm-font-size-base: 16px;
    --ifm-line-height-base: 1.7;
    --ifm-heading-font-weight: 700;

    /* Heading Sizes */
    --ifm-h1-font-size: 3rem;
    --ifm-h2-font-size: 2rem;
    --ifm-h3-font-size: 1.5rem;
    --ifm-h4-font-size: 1.25rem;
    --ifm-h5-font-size: 1.125rem;
    --ifm-h6-font-size: 1rem;

    /* Code */
    --ifm-code-font-size: 0.875rem;
    --ifm-code-background: var(--gemini-code-bg);
    --ifm-code-border-radius: 4px;

    /* Other */
    --ifm-navbar-height: 64px;
    --ifm-spacing-horizontal: var(--gemini-space-md);
    --ifm-spacing-vertical: var(--gemini-space-md);

    /* Transitions */
    --ifm-transition-fast: var(--gemini-transition-fast);
    --ifm-transition-slow: var(--gemini-transition-slow);

    /* Links */
    --ifm-link-color: var(--ifm-color-primary);
    --ifm-link-hover-color: var(--ifm-color-primary-dark);
    --ifm-link-decoration: none;
    --ifm-link-hover-decoration: underline;
}

/* ==================== */
/* DARK MODE OVERRIDES  */
/* ==================== */
[data-theme="dark"] {
    --ifm-background-color: var(--gemini-bg-primary);
    --ifm-background-surface-color: var(--gemini-bg-secondary);
    --ifm-color-content: var(--gemini-text-primary);
    --ifm-color-content-secondary: var(--gemini-text-secondary);
    --ifm-menu-color: var(--gemini-text-secondary);
    --ifm-code-background: var(--gemini-code-bg);
}
```

## 📝 Fase 3: Tipografia

### Passo 3.1: Estilos de Heading

Adicione ao `custom.css`:

```css
/* ==================== */
/* TYPOGRAPHY STYLES    */
/* ==================== */

h1,
h2,
h3,
h4,
h5,
h6 {
    font-weight: var(--ifm-heading-font-weight);
    letter-spacing: -0.01em;
    color: var(--ifm-color-content);
}

h1 {
    font-size: var(--ifm-h1-font-size);
    font-weight: 800;
    letter-spacing: -0.02em;
    line-height: 1.2;
    margin-bottom: var(--gemini-space-lg);
}

h2 {
    font-size: var(--ifm-h2-font-size);
    line-height: 1.3;
    margin-top: var(--gemini-space-2xl);
    margin-bottom: var(--gemini-space-md);
}

h3 {
    font-size: var(--ifm-h3-font-size);
    font-weight: 600;
    line-height: 1.4;
    margin-top: var(--gemini-space-xl);
    margin-bottom: var(--gemini-space-sm);
}

/* Anchor links */
.hash-link {
    opacity: 0;
    transition: opacity var(--ifm-transition-fast);
    color: var(--ifm-color-primary-light);
    margin-left: var(--gemini-space-sm);
}

h1:hover .hash-link,
h2:hover .hash-link,
h3:hover .hash-link,
h4:hover .hash-link {
    opacity: 1;
}

/* Paragraphs */
p {
    line-height: var(--ifm-line-height-base);
    margin-bottom: var(--gemini-space-md);
}

/* Inline code */
code {
    font-family: var(--ifm-font-family-monospace);
    font-size: var(--ifm-code-font-size);
    background: var(--ifm-code-background);
    padding: 0.2em 0.4em;
    border-radius: var(--ifm-code-border-radius);
    color: var(--gemini-code-color);
    border: 1px solid var(--gemini-code-border);
}

/* Links */
a {
    color: var(--ifm-link-color);
    text-decoration: var(--ifm-link-decoration);
    font-weight: 500;
    transition: color var(--ifm-transition-fast) var(--gemini-easing);
}

a:hover {
    color: var(--ifm-link-hover-color);
    text-decoration: var(--ifm-link-hover-decoration);
}
```

## 🧩 Fase 4: Componentes

### Passo 4.1: Navbar

```css
/* ==================== */
/* NAVBAR               */
/* ==================== */

.navbar {
    height: var(--ifm-navbar-height);
    box-shadow: 0 1px 0 0 var(--ifm-color-emphasis-200);
    background: var(--ifm-background-color);
    transition: box-shadow var(--ifm-transition-fast);
}

.navbar__logo {
    height: 32px;
}

.navbar__title {
    font-size: 1.25rem;
    font-weight: 600;
}

/* Search bar */
.navbar__search-input {
    background: var(--gemini-input-bg);
    border: 1px solid var(--gemini-input-border);
    border-radius: 8px;
    padding: 0.5rem 2.5rem 0.5rem 1rem;
    transition: all var(--ifm-transition-fast);
}

.navbar__search-input:focus {
    outline: none;
    border-color: var(--ifm-color-primary);
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
}
```

### Passo 4.2: Sidebar/Menu

```css
/* ==================== */
/* SIDEBAR/MENU         */
/* ==================== */

.menu {
    padding: var(--gemini-space-md);
}

.menu__link {
    border-radius: 6px;
    padding: var(--gemini-space-sm) var(--gemini-space-md);
    font-size: 0.875rem;
    transition: all var(--ifm-transition-fast) var(--gemini-easing);
}

.menu__link:hover {
    background: var(--ifm-menu-color-background-hover);
    color: var(--ifm-color-content);
}

.menu__link--active {
    background: var(--ifm-menu-color-background-active);
    color: var(--ifm-menu-color-active);
    font-weight: 500;
}

.menu__list-item-collapsible {
    border-radius: 6px;
}

.menu__caret {
    transition: transform var(--ifm-transition-fast) var(--gemini-easing);
}

.menu__list-item-collapsible--active .menu__caret {
    transform: rotate(180deg);
}

/* Sidebar background */
.theme-doc-sidebar-container {
    background: var(--gemini-sidebar-bg);
    border-right: 1px solid var(--ifm-color-emphasis-200);
}
```

### Passo 4.3: Code Blocks

```css
/* ==================== */
/* CODE BLOCKS          */
/* ==================== */

.prism-code {
    border-radius: 8px;
    border: 1px solid var(--ifm-color-emphasis-200);
    font-size: var(--ifm-code-font-size);
    line-height: 1.7;
}

.prism-code[class*="language-"] {
    padding: var(--gemini-space-md);
}

/* Code block header (with language tag) */
.codeBlockTitle {
    background: var(--gemini-bg-secondary);
    border-bottom: 1px solid var(--ifm-color-emphasis-200);
    padding: var(--gemini-space-sm) var(--gemini-space-md);
    font-size: 0.875rem;
    font-weight: 600;
}

/* Copy button */
.clean-btn {
    border-radius: 6px;
    transition: all var(--ifm-transition-fast);
}

.clean-btn:hover {
    background: var(--gemini-sidebar-hover);
}
```

### Passo 4.4: Admonitions (Alertas)

```css
/* ==================== */
/* ADMONITIONS          */
/* ==================== */

.alert {
    border-radius: 8px;
    border-width: 1px;
    border-left-width: 4px;
    padding: var(--gemini-space-md);
    margin-bottom: var(--gemini-space-lg);
}

.alert--info {
    border-left-color: var(--ifm-color-info);
    background: rgba(13, 110, 253, 0.05);
}

.alert--warning {
    border-left-color: var(--ifm-color-warning);
    background: rgba(255, 193, 7, 0.05);
}

.alert--danger {
    border-left-color: var(--ifm-color-danger);
    background: rgba(220, 53, 69, 0.05);
}

.alert--success {
    border-left-color: var(--ifm-color-success);
    background: rgba(25, 135, 84, 0.05);
}
```

### Passo 4.5: Cards

```css
/* ==================== */
/* CARDS                */
/* ==================== */

.card {
    background: var(--ifm-background-surface-color);
    border: 1px solid var(--ifm-color-emphasis-200);
    border-radius: 8px;
    padding: var(--gemini-space-lg);
    margin-bottom: var(--gemini-space-md);
    transition: all var(--ifm-transition-fast) var(--gemini-easing);
}

.card:hover {
    border-color: var(--ifm-color-primary);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.1);
    transform: translateY(-2px);
}

.card__header {
    font-size: 1.125rem;
    font-weight: 600;
    margin-bottom: var(--gemini-space-sm);
}

.card__body {
    color: var(--ifm-color-content-secondary);
    font-size: 0.875rem;
    line-height: 1.6;
}
```

### Passo 4.6: Buttons

```css
/* ==================== */
/* BUTTONS              */
/* ==================== */

.button {
    border-radius: 6px;
    font-weight: 500;
    padding: var(--gemini-space-sm) var(--gemini-space-lg);
    transition: all var(--ifm-transition-fast) var(--gemini-easing);
}

.button--primary {
    background: var(--ifm-color-primary);
    color: white;
}

.button--primary:hover {
    background: var(--ifm-color-primary-dark);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
}

.button--secondary {
    background: var(--gemini-button-secondary);
    color: var(--ifm-color-content);
    border: 1px solid var(--ifm-color-emphasis-200);
}

.button--secondary:hover {
    background: var(--gemini-sidebar-hover);
    border-color: var(--ifm-color-primary);
}

.button:active {
    transform: translateY(0);
}
```

## 📱 Fase 5: Responsividade

```css
/* ==================== */
/* RESPONSIVE DESIGN    */
/* ==================== */

/* Mobile (< 768px) */
@media (max-width: 768px) {
    :root {
        --ifm-h1-font-size: 2rem; /* 32px */
        --ifm-h2-font-size: 1.5rem; /* 24px */
        --ifm-h3-font-size: 1.25rem; /* 20px */
        --ifm-spacing-horizontal: 1rem;
    }

    .navbar {
        padding: 0 var(--gemini-space-md);
    }

    .container {
        padding: 0 var(--gemini-space-md);
    }

    .menu {
        padding: var(--gemini-space-sm);
    }
}

/* Tablet (768px - 1024px) */
@media (min-width: 768px) and (max-width: 1024px) {
    .theme-doc-sidebar-container {
        width: 240px;
    }
}

/* Desktop (> 1024px) */
@media (min-width: 1024px) {
    .theme-doc-sidebar-container {
        width: 280px;
    }
}
```

## 🧪 Fase 6: Testes

### Checklist de Testes

#### Tema Claro

-   [ ] Cores aplicadas corretamente
-   [ ] Contraste adequado (WCAG AA)
-   [ ] Links visíveis e distintos
-   [ ] Sidebar navegável
-   [ ] Code blocks legíveis

#### Tema Escuro

-   [ ] Cores dark mode aplicadas
-   [ ] Contraste adequado
-   [ ] Transição suave entre temas
-   [ ] Sem "flash" branco ao carregar

#### Responsividade

-   [ ] Mobile (< 768px): Layout compacto
-   [ ] Tablet (768-1024px): Layout intermediário
-   [ ] Desktop (> 1024px): Layout completo
-   [ ] Menu mobile funcional

#### Performance

-   [ ] Fontes carregam rapidamente
-   [ ] Transições suaves (60fps)
-   [ ] Sem layout shifts (CLS < 0.1)
-   [ ] Time to Interactive < 3s

### Scripts de Teste

```bash
# Iniciar servidor de desenvolvimento
cd docs/docusaurus
npm run start -- --port 3004

# Abrir em navegador
# http://localhost:3004

# Build de produção
npm run build

# Servir build local
npm run serve
```

## 🔧 Troubleshooting

### Problema: Fontes não carregam

```bash
# Reinstalar dependências
npm install @fontsource/inter @fontsource/jetbrains-mono --force

# Verificar importação no Root.js
cat src/theme/Root.js
```

### Problema: Cores não aplicam

```css
/* Verificar ordem de importação no custom.css */
@import "./gemini-theme.css"; /* Deve vir ANTES */

/* Verificar se variáveis existem */
:root {
    --test: var(--gemini-primary); /* Deve resolver para #9333EA */
}
```

### Problema: Tema escuro não funciona

```javascript
// Verificar colorMode no docusaurus.config.js
colorMode: {
  defaultMode: 'light',
  disableSwitch: false,           // Deve ser false
  respectPrefersColorScheme: true,
}
```

### Problema: Responsividade quebrada

```css
/* Verificar viewport meta tag no HTML */
<meta name="viewport" content="width=device-width, initial-scale=1.0">

/* Testar media queries */
@media (max-width: 768px) {
    body {
        background: red;
    } /* Debug */
}
```

## 📚 Recursos Adicionais

### Documentação Oficial

-   [Docusaurus Styling](https://docusaurus.io/docs/styling-layout)
-   [CSS Variables](https://docusaurus.io/docs/styling-layout#styling-your-site-with-infima)
-   [Swizzling](https://docusaurus.io/docs/swizzling)

### Ferramentas

-   [Chrome DevTools](https://developers.google.com/web/tools/chrome-devtools)
-   [Lighthouse](https://developers.google.com/web/tools/lighthouse)
-   [WAVE Accessibility](https://wave.webaim.org/)

### Referências

-   [Análise do Tema](./gemini-cli-style-extraction.md)
-   [Site Original](https://geminicli.com/docs/)

---

**Status**: ✅ Completo  
**Versão**: 1.0  
**Última Atualização**: 2025-10-19
