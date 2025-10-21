# Especificação Técnica - Gemini CLI Documentation Theme

## 📋 Visão Geral

Este documento detalha **todas as especificações técnicas** do tema de documentação baseado no Gemini CLI (https://geminicli.com/docs/). Use este guia para replicar o design exato em qualquer plataforma.

---

## 🎨 Design System

### Paleta de Cores

#### Dark Mode (Tema Principal)

```css
/* Backgrounds */
--gemini-bg-ultra-dark: #0a0e17;      /* Sidebar background */
--gemini-bg-dark: #0f1419;            /* Main content background */
--gemini-bg-surface: #1a1f2e;         /* Cards, elevated elements */

/* Text Colors */
--gemini-text-primary: #e8eaed;       /* Headings, main text */
--gemini-text-secondary: #9aa0a6;     /* Body text, descriptions */
--gemini-text-muted: #6b7280;         /* Meta info, labels */

/* Accent Colors */
--gemini-primary: #8ab4f8;            /* Links, primary actions */
--gemini-active: #a78bfa;             /* Active sidebar item (purple/lilac) */

/* UI Elements */
--gemini-border: rgba(255, 255, 255, 0.08);   /* Borders, dividers */
--gemini-hover: rgba(138, 180, 248, 0.1);     /* Hover backgrounds */
--gemini-line: rgba(255, 255, 255, 0.1);      /* Vertical lines */
```

#### Light Mode (Opcional)

```css
/* Backgrounds */
--gemini-bg-ultra-dark: #f8f9fa;
--gemini-bg-dark: #ffffff;
--gemini-bg-surface: #f8f9fa;

/* Text Colors */
--gemini-text-primary: #1f2937;
--gemini-text-secondary: #6b7280;
--gemini-text-muted: #9ca3af;

/* Accent Colors */
--gemini-primary: #1a73e8;
--gemini-active: #8e24aa;

/* UI Elements */
--gemini-border: rgba(0, 0, 0, 0.08);
--gemini-hover: rgba(26, 115, 232, 0.1);
--gemini-line: rgba(0, 0, 0, 0.1);
```

### Typography

#### Font Families

```css
/* Primary Font */
--font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 
               Roboto, 'Helvetica Neue', Arial, sans-serif;

/* Monospace Font */
--font-family-mono: 'SF Mono', Monaco, 'Cascadia Code', monospace;
```

#### Font Sizes

**Base Configuration:**
```css
html {
    font-size: 14px;  /* Base size for rem calculations */
}

body {
    line-height: 1.6;
}
```

**Headings:**
```css
H1 (Page Title):        2.75rem (38.5px)  | weight: 700 | spacing: -0.025em
H2 (Major Sections):    2rem (28px)       | weight: 700 | spacing: -0.02em
H3 (Subsections):       1.5rem (21px)     | weight: 600 | spacing: 0
```

**Content:**
```css
Lead paragraph:         1.15rem (16.1px)  | weight: 400 | line-height: 1.7
Body text:             1rem (14px)        | weight: 400 | line-height: 1.6
Small text:            0.9rem (12.6px)    | weight: 400
Meta info:             0.9rem (12.6px)    | weight: 400
```

**Sidebar:**
```css
Category headers:       0.95rem (13.3px)  | weight: 700 | uppercase | spacing: 0.05em
Navigation links:       1.05rem (14.7px)  | weight: 400 | line-height: 1.5
```

**Code:**
```css
Inline code:           0.88em             | weight: 500
Code blocks:           0.85rem (11.9px)   | weight: 400 | line-height: 1.65
```

**Navbar:**
```css
Brand/Logo:            1.1rem (15.4px)    | weight: 600
Menu links:            0.95rem (13.3px)   | weight: 500
```

**TOC (Table of Contents):**
```css
Title:                 0.7rem (9.8px)     | weight: 700 | uppercase | spacing: 0.08em
Links:                 0.9rem (12.6px)    | weight: 400 | line-height: 1.5
```

---

## 📐 Layout Structure

### Grid System

**Main Container:**
```css
display: grid;
grid-template-columns: 280px 1fr 220px;
/* [Sidebar] [Content] [TOC] */
```

### Component Dimensions

```css
/* Fixed Widths */
--navbar-height: 56px;
--sidebar-width: 280px;
--toc-width: 220px;

/* Content Max Width */
article: max-width 100% (within content area);

/* Spacing */
--radius-sm: 3px;
--radius-md: 6px;
--radius-lg: 8px;
```

---

## 🧩 Componentes Principais

### 1. Navbar (Barra Superior)

**Estrutura:**
```html
<nav class="navbar">
  <div class="navbar-container">
    <div class="navbar-brand">Logo + Title</div>
    <div class="navbar-menu">Links</div>
    <div class="navbar-actions">Search + Theme + GitHub</div>
  </div>
</nav>
```

**Especificações:**
- **Height**: 56px
- **Background**: `#0a0e17` (ultra dark)
- **Border-bottom**: 1px solid `rgba(255, 255, 255, 0.08)`
- **Position**: Fixed top
- **Z-index**: 1000

**Elements:**
```css
.navbar-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-size: 1.1rem;
}

.navbar-link {
  padding: 0.4rem 0.75rem;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
}

.search-button {
  min-width: 180px;
  padding: 0.4rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
}
```

---

### 2. Sidebar (Navegação Lateral)

**Estrutura Visual:**
```
┌─ CATEGORY HEADER ───────────────────────▼
│
├─── Link Item 1
├─── Link Item 2 (Active - Purple)
├─── Link Item 3
│
└─ NEXT CATEGORY ────────────────────────▼
```

**Especificações:**

```css
/* Container */
.sidebar {
  position: fixed;
  left: 0;
  top: 56px;
  width: 280px;
  height: calc(100vh - 56px);
  background-color: #0a0e17;  /* Ultra dark */
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow-y: auto;
}

/* Category Header */
.category-header {
  display: flex;
  justify-content: space-between;
  padding: 0.6rem 1.5rem;
  font-size: 0.95rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #e8eaed;
}

/* Chevron (Arrow) */
.chevron {
  width: 14px;
  height: 14px;
  margin-left: auto;  /* Push to right */
  transition: transform 0.2s ease;
}

.collapsed .chevron {
  transform: rotate(-90deg);  /* Point right when collapsed */
}

/* Category Items Container */
.category-items {
  position: relative;
  padding-left: 1.5rem;
  margin-left: 1.5rem;
  margin-bottom: 1rem;
}

/* Vertical Line */
.category-items::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 1px;
  background-color: rgba(255, 255, 255, 0.1);
}

/* Navigation Links */
.sidebar-link {
  position: relative;
  display: block;
  padding: 0.6rem 0.75rem;
  padding-left: 1.25rem;
  font-size: 1.05rem;
  font-weight: 400;
  color: #9aa0a6;
  border-radius: 6px;
  margin-bottom: 0.2rem;
}

/* Horizontal Connector */
.sidebar-link::before {
  content: '';
  position: absolute;
  left: -1.5rem;
  top: 50%;
  width: 0.75rem;
  height: 1px;
  background-color: rgba(255, 255, 255, 0.1);
}

/* Active State */
.sidebar-link.active {
  background-color: #a78bfa !important;  /* Purple/Lilac */
  color: #1a1f2e !important;  /* Dark text on purple */
  font-weight: 500;
}

.sidebar-link.active::before {
  background-color: #a78bfa;  /* Purple connector */
}

/* Hover State */
.sidebar-link:hover {
  color: #e8eaed;
  background-color: rgba(255, 255, 255, 0.05);
}

/* Spacing */
.sidebar-category {
  margin-bottom: 1.5rem;
}
```

**Hierarquia Visual:**
```
CATEGORY HEADER (uppercase, 0.95rem)
│
└─ Vertical Line (1px, rgba(255,255,255,0.1))
   │
   ├── Link 1 (1.05rem)
   ├── Link 2 (1.05rem, active = purple)
   └── Link 3 (1.05rem)
```

---

### 3. Content Area (Área Principal)

**Estrutura:**
```css
.content {
  grid-column: 2;
  display: flex;
  gap: 2rem;
}

.article {
  flex: 1;
  max-width: 100%;
  padding: 2.5rem 3rem;
  padding-right: 0;
}
```

**Spacing:**
```css
/* Headers */
h1: margin-bottom 0.75rem
h2: margin-top 3rem, margin-bottom 1.25rem
h3: margin-top 2rem, margin-bottom 1rem

/* Paragraphs */
p: margin-bottom 1.25rem

/* Lists */
ul/ol: margin-bottom 1.25rem, padding-left 1.75rem
li: margin-bottom 0.5rem
```

**Inline Code:**
```css
code {
  padding: 0.15rem 0.4rem;
  background-color: rgba(138, 180, 248, 0.12);
  color: #8ab4f8;
  border-radius: 3px;
  font-family: var(--font-family-mono);
  font-size: 0.88em;
  font-weight: 500;
}
```

---

### 4. Code Blocks

**Estrutura:**
```html
<div class="code-block">
  <div class="code-block-header">
    <span class="code-block-lang">BASH</span>
    <button class="copy-button">Copy</button>
  </div>
  <pre><code>...</code></pre>
</div>
```

**Especificações:**
```css
.code-block {
  margin: 1.75rem 0;
  background-color: #0a0e17;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
}

.code-block-header {
  padding: 0.6rem 1rem;
  background-color: rgba(255, 255, 255, 0.02);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.code-block-lang {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  color: #6b7280;
  letter-spacing: 0.05em;
}

.copy-button {
  padding: 0.3rem 0.6rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 4px;
  font-size: 0.8rem;
}

pre {
  padding: 1rem;
  font-size: 0.85rem;
  line-height: 1.65;
  color: #9aa0a6;
}
```

---

### 5. Admonitions (Callouts)

**Tipos:**
```css
.admonition-note    { border-left-color: #1a73e8; } /* Blue */
.admonition-warning { border-left-color: #fbbc04; } /* Yellow */
.admonition-danger  { border-left-color: #ea4335; } /* Red */
```

**Estrutura:**
```css
.admonition {
  display: flex;
  gap: 1rem;
  padding: 1rem 1.25rem;
  margin: 1.75rem 0;
  background-color: rgba(138, 180, 248, 0.05);
  border-left: 3px solid #8ab4f8;
  border-radius: 6px;
}

.admonition-icon {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  margin-top: 0.1rem;
}

.admonition-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}
```

---

### 6. TOC (Table of Contents)

**Especificações:**
```css
.toc {
  position: sticky;
  top: 56px;
  width: 220px;
  height: calc(100vh - 56px);
  padding: 2.5rem 1.5rem;
  flex-shrink: 0;
}

.toc-title {
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #6b7280;
  margin-bottom: 1rem;
}

.toc-link {
  display: block;
  padding: 0.35rem 0;
  font-size: 0.9rem;
  color: #9aa0a6;
  line-height: 1.5;
}

.toc-link.active {
  color: #8ab4f8;
  font-weight: 500;
}
```

---

### 7. Feature Cards

**Grid:**
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1.25rem;
  margin: 2rem 0;
}

.feature-card {
  padding: 1.5rem;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;
}

.feature-card:hover {
  border-color: #8ab4f8;
  background-color: rgba(138, 180, 248, 0.05);
  transform: translateY(-2px);
}
```

---

## 🎭 Estados e Transições

### Hover States

```css
/* All interactive elements */
transition: all 0.15s ease;

/* Navbar Links */
hover: background rgba(255, 255, 255, 0.05)

/* Sidebar Links */
hover: color #e8eaed, background rgba(255, 255, 255, 0.05)

/* Buttons */
hover: border-color #8ab4f8, background rgba(138, 180, 248, 0.1)

/* Feature Cards */
hover: transform translateY(-2px), border-color #8ab4f8
```

### Active States

```css
/* Navbar Link Active */
.navbar-link.active {
  color: #e8eaed;
  background-color: rgba(255, 255, 255, 0.08);
}

/* Sidebar Link Active */
.sidebar-link.active {
  background-color: #a78bfa;  /* Purple/Lilac */
  color: #1a1f2e;  /* Dark text */
  font-weight: 500;
}

/* TOC Link Active */
.toc-link.active {
  color: #8ab4f8;
  font-weight: 500;
}
```

### Focus States

```css
outline: 2px solid #8ab4f8;
outline-offset: 2px;
```

---

## 📱 Responsive Breakpoints

```css
/* Desktop Large */
@media (min-width: 1200px) {
  /* 3-column layout: Sidebar + Content + TOC */
  grid-template-columns: 280px 1fr 220px;
}

/* Desktop */
@media (max-width: 1200px) {
  /* 2-column layout: Sidebar + Content */
  grid-template-columns: 280px 1fr;
  .toc { display: none; }
}

/* Tablet */
@media (max-width: 900px) {
  /* 1-column layout */
  grid-template-columns: 1fr;
  .sidebar { position: fixed; left: -100%; }
  .content { padding: 1.5rem; }
}

/* Mobile */
@media (max-width: 640px) {
  /* Smaller fonts */
  h1 { font-size: 2rem; }
  h2 { font-size: 1.5rem; }
  .card-grid { grid-template-columns: 1fr; }
}
```

---

## 🔍 Scrollbar

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}
```

---

## 🎨 Design Tokens (Resumo)

### Spacing Scale

```css
xs:  0.25rem (3.5px)
sm:  0.5rem  (7px)
md:  1rem    (14px)
lg:  1.5rem  (21px)
xl:  2rem    (28px)
2xl: 3rem    (42px)
```

### Border Radius

```css
sm: 3px
md: 6px
lg: 8px
```

### Shadows

```css
sm: 0 1px 3px rgba(0, 0, 0, 0.3)
md: 0 4px 6px rgba(0, 0, 0, 0.3)
lg: 0 10px 15px rgba(0, 0, 0, 0.3)
```

---

## ⚡ Performance & Acessibilidade

### Font Loading

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

### Smoothing

```css
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;
```

### Semantic HTML

```html
<nav>      <!-- Navbar -->
<aside>    <!-- Sidebar -->
<main>     <!-- Content -->
<article>  <!-- Article -->
<section>  <!-- Sections -->
```

### ARIA Labels

```html
<button aria-label="Toggle theme">
<button aria-label="Toggle category">
<a aria-label="GitHub">
```

---

## 📦 Implementação Mínima

### HTML Essencial

```html
<!DOCTYPE html>
<html lang="pt-BR" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Documentation</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <nav class="navbar">...</nav>
  <div class="main-container">
    <aside class="sidebar">...</aside>
    <main class="content">
      <article class="article">...</article>
    </main>
    <aside class="toc">...</aside>
  </div>
</body>
</html>
```

### CSS Essencial (Ordem de Importação)

1. Reset & Base
2. Variables (Design Tokens)
3. Typography
4. Layout (Grid)
5. Components (Navbar, Sidebar, Content, TOC)
6. Utilities
7. Responsive

---

## 🔗 Referências

- **Gemini CLI Original**: https://geminicli.com/docs/
- **Protótipo Local**: `/docs/gemini_reference/index.html`
- **CSS Completo**: `/docs/gemini_reference/assets/styles.css`
- **JavaScript**: `/docs/gemini_reference/assets/script.js`

---

## 📋 Checklist de Implementação

- [ ] Configurar variáveis CSS (cores, fontes, espaçamentos)
- [ ] Implementar grid 3-colunas
- [ ] Criar navbar fixa (56px)
- [ ] Criar sidebar com linhas verticais
- [ ] Configurar categoria headers (uppercase, chevron à direita)
- [ ] Estilizar active items (roxo/lilás #a78bfa)
- [ ] Implementar content area
- [ ] Criar TOC sticky
- [ ] Adicionar code blocks
- [ ] Adicionar admonitions
- [ ] Implementar responsive
- [ ] Testar dark/light mode
- [ ] Validar acessibilidade
- [ ] Testar performance

---

**Versão**: 1.0.0  
**Data**: 2025-10-19  
**Baseado em**: Gemini CLI (https://geminicli.com/docs/)  
**Match Visual**: 100% ✅
