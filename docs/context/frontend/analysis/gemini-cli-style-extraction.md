---
title: "Análise Completa do Estilo Gemini CLI"
tags: ["design", "ui", "docusaurus", "gemini-cli", "style-guide"]
domain: "frontend"
type: "analysis"
summary: "Análise detalhada do design system do Gemini CLI para adaptação ao nosso Docusaurus"
status: "in-progress"
last_review: "2025-10-19"
sidebar_position: 1
---

# Análise Completa do Estilo Gemini CLI

> **Objetivo**: Extrair e documentar todos os aspectos visuais da documentação do Gemini CLI (https://geminicli.com/docs/) para implementação no nosso Docusaurus.

## 📊 Visão Geral

A documentação do Gemini CLI apresenta um design moderno, limpo e profissional com excelente hierarquia visual e navegação intuitiva.

### Características Principais

-   ✅ **Design System Consistente**: Cores, tipografia e espaçamentos padronizados
-   ✅ **Navegação Clara**: Sidebar colapsável com categorias bem organizadas
-   ✅ **Tema Duplo**: Suporte para modo claro e escuro
-   ✅ **Tipografia Hierárquica**: Boa distinção entre níveis de heading
-   ✅ **Links Destacados**: Cor roxa/lilás para links com bom contraste
-   ✅ **Responsividade**: Layout adaptável para diferentes tamanhos de tela

## 🎨 Sistema de Cores

### Paleta Principal (Light Mode)

#### Background & Surfaces

```css
--background-primary: #ffffff; /* Fundo principal branco puro */
--background-secondary: #f8f9fa; /* Fundo secundário cinza claro */
--surface: #ffffff; /* Cards e superfícies */
--border: #e5e7eb; /* Bordas sutis */
```

#### Text Colors

```css
--text-primary: #1f2937; /* Texto principal escuro */
--text-secondary: #6b7280; /* Texto secundário cinza médio */
--text-tertiary: #9ca3af; /* Texto terciário cinza claro */
```

#### Brand & Accent Colors

```css
--primary: #9333ea; /* Roxo/Púrpura principal - links e destaques */
--primary-hover: #7e22ce; /* Hover mais escuro */
--primary-light: #c084fc; /* Versão clara do roxo */
--accent: #8b5cf6; /* Lilás para acentos */
```

#### Sidebar & Navigation

```css
--sidebar-background: #fafafa; /* Fundo da sidebar levemente off-white */
--sidebar-hover: #f3f4f6; /* Hover na sidebar */
--sidebar-active: #ede9fe; /* Item ativo com toque de roxo */
--sidebar-active-text: #7c3aed; /* Texto do item ativo */
```

#### Interactive Elements

```css
--button-primary: #9333ea; /* Botão primário roxo */
--button-secondary: #f3f4f6; /* Botão secundário cinza */
--input-background: #f9fafb; /* Background de inputs */
--input-border: #d1d5db; /* Borda de inputs */
```

### Paleta Dark Mode (Futuro)

```css
--dark-background-primary: #111827; /* Fundo principal escuro */
--dark-background-secondary: #1f2937; /* Fundo secundário */
--dark-surface: #374151; /* Superfícies */
--dark-text-primary: #f9fafb; /* Texto claro */
--dark-text-secondary: #d1d5db; /* Texto secundário */
--dark-border: #374151; /* Bordas escuras */
```

## 🔤 Tipografia

### Font Families

```css
--font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans",
    "Droid Sans", "Helvetica Neue", sans-serif;

--font-mono: "JetBrains Mono", "Fira Code", "Monaco", "Consolas", "Courier New", monospace;
```

### Hierarquia de Texto

#### Headings

```css
/* H1 - Título Principal */
.h1 {
    font-size: 3rem; /* 48px */
    font-weight: 800; /* Extra Bold */
    line-height: 1.2;
    letter-spacing: -0.02em;
    color: var(--text-primary);
    margin-bottom: 1.5rem;
}

/* H2 - Seções Principais */
.h2 {
    font-size: 2rem; /* 32px */
    font-weight: 700; /* Bold */
    line-height: 1.3;
    letter-spacing: -0.01em;
    color: var(--text-primary);
    margin-top: 2.5rem;
    margin-bottom: 1rem;
}

/* H3 - Subseções */
.h3 {
    font-size: 1.5rem; /* 24px */
    font-weight: 600; /* Semi Bold */
    line-height: 1.4;
    color: var(--text-primary);
    margin-top: 2rem;
    margin-bottom: 0.75rem;
}

/* H4 - Subtópicos */
.h4 {
    font-size: 1.25rem; /* 20px */
    font-weight: 600;
    line-height: 1.5;
    color: var(--text-primary);
    margin-top: 1.5rem;
    margin-bottom: 0.5rem;
}
```

#### Body Text

```css
/* Parágrafo Normal */
.body {
    font-size: 1rem; /* 16px */
    font-weight: 400;
    line-height: 1.7;
    color: var(--text-primary);
    margin-bottom: 1rem;
}

/* Texto Pequeno */
.small {
    font-size: 0.875rem; /* 14px */
    font-weight: 400;
    line-height: 1.6;
    color: var(--text-secondary);
}

/* Texto Muito Pequeno */
.xs {
    font-size: 0.75rem; /* 12px */
    font-weight: 400;
    line-height: 1.5;
    color: var(--text-tertiary);
}
```

#### Links

```css
.link {
    color: var(--primary);
    text-decoration: none;
    font-weight: 500;
    transition: color 0.2s ease;
}

.link:hover {
    color: var(--primary-hover);
    text-decoration: underline;
}

/* Link com ícone (âncora de seção) */
.link-anchor {
    color: var(--primary-light);
    opacity: 0;
    transition: opacity 0.2s ease;
    margin-left: 0.5rem;
}

.heading:hover .link-anchor {
    opacity: 1;
}
```

#### Code

```css
/* Inline Code */
.code-inline {
    font-family: var(--font-mono);
    font-size: 0.875em;
    background: var(--input-background);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    color: #c41a16; /* Vermelho para destaque */
    border: 1px solid var(--border);
}

/* Code Block */
.code-block {
    font-family: var(--font-mono);
    font-size: 0.875rem;
    line-height: 1.7;
    background: #f6f8fa;
    padding: 1rem;
    border-radius: 8px;
    overflow-x: auto;
    border: 1px solid var(--border);
}
```

## 📐 Layout & Grid System

### Container Widths

```css
.container {
    max-width: 1440px;
    margin: 0 auto;
    padding: 0 2rem;
}

.content-container {
    max-width: 880px; /* Largura ideal para leitura */
    margin: 0 auto;
}
```

### Sidebar Layout

```css
.sidebar {
    width: 280px;
    position: fixed;
    top: 64px; /* Altura do header */
    left: 0;
    height: calc(100vh - 64px);
    background: var(--sidebar-background);
    border-right: 1px solid var(--border);
    overflow-y: auto;
    padding: 1.5rem 1rem;
}

.main-content {
    margin-left: 280px; /* Largura da sidebar */
    padding: 2rem;
    min-height: calc(100vh - 64px);
}
```

### Header/Navbar

```css
.header {
    height: 64px;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: var(--background-primary);
    border-bottom: 1px solid var(--border);
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 0 2rem;
}

.header-logo {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 1.25rem;
    font-weight: 600;
}

.header-nav {
    display: flex;
    gap: 2rem;
    margin-left: auto;
    align-items: center;
}
```

### Spacing System

```css
:root {
    --space-xs: 0.25rem; /* 4px */
    --space-sm: 0.5rem; /* 8px */
    --space-md: 1rem; /* 16px */
    --space-lg: 1.5rem; /* 24px */
    --space-xl: 2rem; /* 32px */
    --space-2xl: 3rem; /* 48px */
    --space-3xl: 4rem; /* 64px */
}
```

## 🧩 Componentes

### 1. Sidebar Navigation

#### Estrutura

```html
<nav class="sidebar">
    <div class="sidebar-section">
        <button class="sidebar-section-toggle">
            <span>Get Started</span>
            <svg><!-- chevron icon --></svg>
        </button>
        <ul class="sidebar-section-items">
            <li><a href="#" class="sidebar-item active">Introduction</a></li>
            <li><a href="#" class="sidebar-item">Installation</a></li>
        </ul>
    </div>
</nav>
```

#### Estilos

```css
.sidebar-section {
    margin-bottom: 1rem;
}

.sidebar-section-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    font-weight: 600;
    font-size: 0.875rem;
    color: var(--text-primary);
    cursor: pointer;
    border-radius: 6px;
    transition: background 0.2s ease;
}

.sidebar-section-toggle:hover {
    background: var(--sidebar-hover);
}

.sidebar-item {
    display: block;
    padding: 0.5rem 0.75rem 0.5rem 1.5rem;
    color: var(--text-secondary);
    text-decoration: none;
    font-size: 0.875rem;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.sidebar-item:hover {
    background: var(--sidebar-hover);
    color: var(--text-primary);
}

.sidebar-item.active {
    background: var(--sidebar-active);
    color: var(--sidebar-active-text);
    font-weight: 500;
}
```

### 2. Search Bar

```css
.search-container {
    position: relative;
    width: 100%;
    max-width: 400px;
}

.search-input {
    width: 100%;
    padding: 0.5rem 2.5rem 0.5rem 1rem;
    background: var(--input-background);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    font-size: 0.875rem;
    transition: all 0.2s ease;
}

.search-input:focus {
    outline: none;
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
}

.search-kbd {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    padding: 0.25rem 0.5rem;
    background: var(--background-secondary);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 0.75rem;
    font-family: var(--font-mono);
    color: var(--text-tertiary);
}
```

### 3. Theme Switcher

```css
.theme-switcher {
    position: relative;
    display: inline-block;
}

.theme-button {
    padding: 0.5rem;
    background: var(--button-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: all 0.2s ease;
}

.theme-button:hover {
    background: var(--sidebar-hover);
    border-color: var(--primary);
}

.theme-dropdown {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    min-width: 160px;
    padding: 0.5rem;
    z-index: 50;
}

.theme-option {
    display: flex;
    align-items: center;
    padding: 0.5rem 0.75rem;
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s ease;
}

.theme-option:hover {
    background: var(--sidebar-hover);
}

.theme-option.active {
    background: var(--primary);
    color: white;
}
```

### 4. Copy as Markdown Button

```css
.copy-button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: var(--button-secondary);
    border: 1px solid var(--border);
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-primary);
    cursor: pointer;
    transition: all 0.2s ease;
}

.copy-button:hover {
    background: var(--sidebar-hover);
    border-color: var(--primary);
}

.copy-button:active {
    transform: scale(0.98);
}

.copy-button svg {
    width: 1rem;
    height: 1rem;
}
```

### 5. Breadcrumb Navigation

```css
.breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--background-secondary);
    border-radius: 8px;
}

.breadcrumb-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--text-secondary);
    font-size: 0.875rem;
}

.breadcrumb-item a {
    color: var(--primary);
    text-decoration: none;
}

.breadcrumb-item a:hover {
    text-decoration: underline;
}

.breadcrumb-separator {
    color: var(--text-tertiary);
}
```

### 6. Content Cards (Lista de Links)

```css
.content-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: all 0.2s ease;
}

.content-card:hover {
    border-color: var(--primary);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.1);
    transform: translateY(-2px);
}

.content-card-title {
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 0.5rem;
}

.content-card-description {
    font-size: 0.875rem;
    color: var(--text-secondary);
    line-height: 1.6;
}
```

## 🎭 Animações & Transições

### Transições Padrão

```css
:root {
    --transition-fast: 150ms;
    --transition-base: 200ms;
    --transition-slow: 300ms;
    --easing: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Aplicação em elementos */
.interactive {
    transition: all var(--transition-base) var(--easing);
}
```

### Hover Effects

```css
/* Links */
.link {
    position: relative;
    transition: color var(--transition-fast) var(--easing);
}

.link::after {
    content: "";
    position: absolute;
    bottom: -2px;
    left: 0;
    width: 0;
    height: 2px;
    background: var(--primary);
    transition: width var(--transition-base) var(--easing);
}

.link:hover::after {
    width: 100%;
}

/* Botões */
.button {
    transition: all var(--transition-base) var(--easing);
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
}

.button:active {
    transform: translateY(0);
}
```

### Sidebar Collapse Animation

```css
.sidebar-section-items {
    max-height: 0;
    overflow: hidden;
    transition: max-height var(--transition-slow) var(--easing);
}

.sidebar-section.expanded .sidebar-section-items {
    max-height: 1000px;
}

.sidebar-section-toggle svg {
    transition: transform var(--transition-base) var(--easing);
}

.sidebar-section.expanded .sidebar-section-toggle svg {
    transform: rotate(180deg);
}
```

### Scroll Animations

```css
/* Smooth scroll */
html {
    scroll-behavior: smooth;
}

/* Fade in on scroll */
@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.fade-in-up {
    animation: fadeInUp var(--transition-slow) var(--easing);
}
```

## 📱 Responsividade

### Breakpoints

```css
:root {
    --breakpoint-sm: 640px; /* Mobile */
    --breakpoint-md: 768px; /* Tablet */
    --breakpoint-lg: 1024px; /* Desktop */
    --breakpoint-xl: 1280px; /* Large Desktop */
    --breakpoint-2xl: 1536px; /* Extra Large */
}
```

### Media Queries

#### Mobile (< 768px)

```css
@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        left: -280px;
        transition: left var(--transition-slow) var(--easing);
        z-index: 200;
    }

    .sidebar.open {
        left: 0;
    }

    .main-content {
        margin-left: 0;
    }

    .header {
        padding: 0 1rem;
    }

    .container {
        padding: 0 1rem;
    }

    /* Tipografia móvel */
    .h1 {
        font-size: 2rem; /* 32px em vez de 48px */
    }

    .h2 {
        font-size: 1.5rem; /* 24px em vez de 32px */
    }
}
```

#### Tablet (768px - 1024px)

```css
@media (min-width: 768px) and (max-width: 1024px) {
    .sidebar {
        width: 240px;
    }

    .main-content {
        margin-left: 240px;
    }
}
```

## 🎯 Implementação no Docusaurus

### Arquivo de Configuração do Tema

**Localização**: `docs/src/css/custom.css`

```css
/**
 * Gemini CLI Theme Adaptation for Docusaurus
 * Based on: https://geminicli.com/docs/
 */

:root {
    /* === CORES === */
    /* Primary Colors */
    --ifm-color-primary: #9333ea;
    --ifm-color-primary-dark: #7e22ce;
    --ifm-color-primary-darker: #7213ce;
    --ifm-color-primary-darkest: #5e0fc7;
    --ifm-color-primary-light: #a855f7;
    --ifm-color-primary-lighter: #c084fc;
    --ifm-color-primary-lightest: #e9d5ff;

    /* Background Colors */
    --ifm-background-color: #ffffff;
    --ifm-background-surface-color: #f8f9fa;
    --ifm-hover-overlay: rgba(147, 51, 234, 0.05);

    /* Text Colors */
    --ifm-color-content: #1f2937;
    --ifm-color-content-secondary: #6b7280;
    --ifm-color-emphasis-300: #9ca3af;

    /* Sidebar */
    --ifm-menu-color: #6b7280;
    --ifm-menu-color-active: #7c3aed;
    --ifm-menu-color-background-active: #ede9fe;
    --ifm-menu-color-background-hover: #f3f4f6;

    /* Borders */
    --ifm-color-emphasis-200: #e5e7eb;
    --ifm-toc-border-color: #e5e7eb;

    /* === TIPOGRAFIA === */
    --ifm-font-family-base: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
    --ifm-font-family-monospace: "JetBrains Mono", "Fira Code", "Monaco", monospace;

    --ifm-font-size-base: 16px;
    --ifm-line-height-base: 1.7;

    --ifm-heading-font-weight: 700;
    --ifm-h1-font-size: 3rem;
    --ifm-h2-font-size: 2rem;
    --ifm-h3-font-size: 1.5rem;
    --ifm-h4-font-size: 1.25rem;

    /* === SPACING === */
    --ifm-spacing-horizontal: 1rem;
    --ifm-spacing-vertical: 1rem;
    --ifm-navbar-height: 64px;

    /* === TRANSITIONS === */
    --ifm-transition-fast: 150ms;
    --ifm-transition-slow: 300ms;

    /* === OUTROS === */
    --ifm-code-font-size: 0.875rem;
    --ifm-code-background: #f6f8fa;
    --ifm-code-border-radius: 4px;

    --ifm-blockquote-color: #6b7280;
    --ifm-blockquote-border-left-width: 4px;
    --ifm-blockquote-border-color: var(--ifm-color-primary);

    --ifm-table-border-color: #e5e7eb;
    --ifm-link-color: var(--ifm-color-primary);
    --ifm-link-hover-color: var(--ifm-color-primary-dark);

    --ifm-button-padding-horizontal: 1.5rem;
    --ifm-button-padding-vertical: 0.75rem;
}

/* === DARK MODE === */
[data-theme="dark"] {
    --ifm-background-color: #111827;
    --ifm-background-surface-color: #1f2937;
    --ifm-color-content: #f9fafb;
    --ifm-color-content-secondary: #d1d5db;
    --ifm-hover-overlay: rgba(168, 85, 247, 0.1);

    --ifm-menu-color: #d1d5db;
    --ifm-menu-color-active: #c084fc;
    --ifm-menu-color-background-active: #4c1d95;
    --ifm-menu-color-background-hover: #374151;

    --ifm-color-emphasis-200: #374151;
    --ifm-toc-border-color: #374151;

    --ifm-code-background: #1f2937;
    --ifm-table-border-color: #374151;
}

/* === CUSTOMIZAÇÕES ESPECÍFICAS === */

/* Navbar */
.navbar {
    box-shadow: 0 1px 0 0 var(--ifm-color-emphasis-200);
}

/* Sidebar */
.menu__link {
    border-radius: 6px;
    transition: all var(--ifm-transition-fast) ease;
}

.menu__link:hover {
    background: var(--ifm-menu-color-background-hover);
}

.menu__link--active {
    background: var(--ifm-menu-color-background-active);
    color: var(--ifm-menu-color-active);
    font-weight: 500;
}

/* Headings com anchor links */
.hash-link {
    opacity: 0;
    transition: opacity var(--ifm-transition-fast);
    color: var(--ifm-color-primary-light);
}

.hash-link:hover,
h2:hover .hash-link,
h3:hover .hash-link {
    opacity: 1;
}

/* Code blocks */
.prism-code {
    border-radius: 8px;
    border: 1px solid var(--ifm-color-emphasis-200);
}

/* Links */
a {
    text-decoration: none;
    position: relative;
}

a:hover {
    text-decoration: underline;
}

/* Botões */
.button {
    border-radius: 6px;
    font-weight: 500;
    transition: all var(--ifm-transition-fast) ease;
}

.button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.2);
}

/* Search bar */
.navbar__search-input {
    background: var(--ifm-background-surface-color);
    border: 1px solid var(--ifm-color-emphasis-200);
    border-radius: 8px;
    transition: all var(--ifm-transition-fast);
}

.navbar__search-input:focus {
    border-color: var(--ifm-color-primary);
    box-shadow: 0 0 0 3px rgba(147, 51, 234, 0.1);
}

/* Breadcrumbs */
.breadcrumbs {
    background: var(--ifm-background-surface-color);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
}

/* Cards */
.card {
    border: 1px solid var(--ifm-color-emphasis-200);
    border-radius: 8px;
    transition: all var(--ifm-transition-fast);
}

.card:hover {
    border-color: var(--ifm-color-primary);
    box-shadow: 0 4px 12px rgba(147, 51, 234, 0.1);
    transform: translateY(-2px);
}

/* Responsivo */
@media (max-width: 768px) {
    :root {
        --ifm-h1-font-size: 2rem;
        --ifm-h2-font-size: 1.5rem;
        --ifm-h3-font-size: 1.25rem;
    }
}
```

## 📋 Próximos Passos

### Fase 1: Setup Básico

-   [ ] Criar arquivo `custom.css` com variáveis do tema
-   [ ] Importar fontes Inter e JetBrains Mono
-   [ ] Configurar cores no `docusaurus.config.js`
-   [ ] Testar tema claro e escuro

### Fase 2: Componentes

-   [ ] Customizar sidebar navigation
-   [ ] Ajustar search bar
-   [ ] Implementar breadcrumbs
-   [ ] Estilizar code blocks

### Fase 3: Refinamentos

-   [ ] Adicionar animações e transições
-   [ ] Ajustar responsividade
-   [ ] Otimizar performance
-   [ ] Testar em diferentes navegadores

### Fase 4: Documentação

-   [ ] Criar guia de estilo
-   [ ] Documentar componentes customizados
-   [ ] Criar exemplos de uso
-   [ ] Adicionar screenshots de comparação

## 🔗 Recursos Adicionais

### Scripts de Extração

Um script bash foi criado para extrair CSS e HTML adicional:

```bash
# Ver: docs/context/frontend/scripts/extract-gemini-style.sh
bash docs/context/frontend/scripts/extract-gemini-style.sh
```

### Referências

-   Site original: https://geminicli.com/docs/
-   Docusaurus theming: https://docusaurus.io/docs/styling-layout
-   Inter font: https://rsms.me/inter/
-   JetBrains Mono: https://www.jetbrains.com/lp/mono/

---

**Status**: 🚧 Em Progresso  
**Última Atualização**: 2025-10-19  
**Responsável**: Architect Mode
