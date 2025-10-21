# Guia de Migração de Tema - Docusaurus

## 🎯 Objetivo

Este guia documenta como migrar ou ajustar o tema do Docusaurus para outros estilos populares de documentação.

## 📦 Temas Populares de Documentação

### 1. Gemini CLI (ATUAL) ✅

**Características**:
- Dark mode ultra escuro (`#0f1419`)
- Accent color roxo/magenta (`#8e24aa`)
- Typography: Inter
- Visual: Minimalista, moderno, clean

**Arquivo**: `src/css/custom.css` (atual)

---

### 2. GitHub Docs Style

**Características**:
- Background: `#0d1117` (dark) / `#ffffff` (light)
- Primary: `#58a6ff` (blue)
- Accent: `#f85149` (red)
- Typography: -apple-system, SF Pro

**Como Migrar**:

```css
[data-theme='dark'] {
  --ifm-background-color: #0d1117;
  --ifm-background-surface-color: #161b22;
  --ifm-color-primary: #58a6ff;
  --ifm-navbar-background-color: #161b22;
}

.menu__link--active {
  background-color: #238636 !important; /* GitHub green */
  color: #ffffff !important;
}
```

---

### 3. Stripe Docs Style

**Características**:
- Background: `#0a2540` (dark blue)
- Primary: `#635bff` (purple)
- Accent: `#00d4ff` (cyan)
- Typography: Söhne, Inter

**Como Migrar**:

```css
[data-theme='dark'] {
  --ifm-background-color: #0a2540;
  --ifm-background-surface-color: #0e3256;
  --ifm-color-primary: #635bff;
}

.menu__link--active {
  background: linear-gradient(90deg, #635bff 0%, #00d4ff 100%);
}
```

---

### 4. Vercel Docs Style

**Características**:
- Background: `#000000` (pure black)
- Primary: `#ffffff` (white)
- Accent: `#0070f3` (blue)
- Typography: Inter, SF Mono

**Como Migrar**:

```css
[data-theme='dark'] {
  --ifm-background-color: #000000;
  --ifm-background-surface-color: #111111;
  --ifm-color-primary: #0070f3;
  --ifm-font-color-base: #ffffff;
}

.navbar {
  border-bottom: 1px solid #333333;
}
```

---

### 5. Tailwind CSS Docs Style

**Características**:
- Background: `#0b1120` (dark blue-gray)
- Primary: `#06b6d4` (cyan)
- Accent: `#38bdf8` (light cyan)
- Typography: Inter, Fira Code

**Como Migrar**:

```css
[data-theme='dark'] {
  --ifm-background-color: #0b1120;
  --ifm-background-surface-color: #1e293b;
  --ifm-color-primary: #06b6d4;
}

code {
  color: #38bdf8;
  background-color: rgba(56, 189, 248, 0.1);
}
```

---

### 6. Material Design Docs

**Características**:
- Background: `#121212` (material dark)
- Primary: `#bb86fc` (purple)
- Accent: `#03dac6` (teal)
- Typography: Roboto, Roboto Mono

**Como Migrar**:

```css
@import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');

[data-theme='dark'] {
  --ifm-background-color: #121212;
  --ifm-background-surface-color: #1e1e1e;
  --ifm-color-primary: #bb86fc;
  --ifm-font-family-base: 'Roboto', sans-serif;
}

.menu__link--active {
  background-color: #03dac6 !important;
}
```

---

## 🔧 Processo de Migração Passo a Passo

### 1. Backup do Tema Atual

```bash
cd docs/docusaurus/src/css
cp custom.css custom.css.backup
```

### 2. Criar Nova Paleta de Cores

Use ferramentas como:
- **Coolors.co** - Gerador de paletas
- **Adobe Color** - Explorador de cores
- **Material Palette** - Paletas Material Design

### 3. Atualizar Variáveis CSS

Edite `custom.css` e substitua as variáveis:

```css
:root {
  /* Substitua estas variáveis */
  --ifm-color-primary: #NEW_COLOR;
  --ifm-color-primary-dark: #NEW_DARK_COLOR;
  /* ... */
}

[data-theme='dark'] {
  /* Substitua estas variáveis */
  --ifm-background-color: #NEW_BG;
  --ifm-background-surface-color: #NEW_SURFACE;
  /* ... */
}
```

### 4. Ajustar Componentes Específicos

```css
/* Navbar */
.navbar { /* ... */ }

/* Sidebar */
.theme-doc-sidebar-container { /* ... */ }

/* Active items */
.menu__link--active { /* ... */ }

/* Code blocks */
code { /* ... */ }
```

### 5. Testar o Tema

```bash
npm run start -- --port 3004
```

Abra http://localhost:3004 e verifique:
- ✅ Contraste de cores adequado
- ✅ Legibilidade do texto
- ✅ Hover states funcionando
- ✅ Dark mode consistente
- ✅ Mobile responsivo

### 6. Validar Acessibilidade

Use ferramentas:
- **axe DevTools** (Chrome Extension)
- **WAVE** (Web Accessibility Evaluation Tool)
- **Lighthouse** (Chrome DevTools)

Critérios mínimos:
- Contraste de texto: mínimo 4.5:1
- Contraste de UI: mínimo 3:1
- Focus states visíveis
- Temas funcionais para daltônicos

---

## 🎨 Ferramentas de Design

### Geradores de Tema

1. **Docusaurus Theme Generator**
   ```bash
   npx create-docusaurus@latest --theme-classic
   ```

2. **CSS Variables Generator**
   - Acesse: https://docusaurus.io/docs/styling-layout
   - Gere suas variáveis customizadas

### Ferramentas de Cor

1. **Color Contrast Checker**
   - https://webaim.org/resources/contrastchecker/

2. **Color Palette Generator**
   - https://coolors.co/
   - https://color.adobe.com/

3. **CSS Gradient Generator**
   - https://cssgradient.io/

### Fontes

1. **Google Fonts**
   - https://fonts.google.com/
   - Recomendadas: Inter, Roboto, Open Sans, Poppins

2. **Font Pairing**
   - https://fontpair.co/
   - Combine fontes harmoniosamente

---

## 📊 Matriz de Comparação de Temas

| Feature | Gemini CLI | GitHub | Stripe | Vercel | Tailwind | Material |
|---------|-----------|--------|--------|--------|----------|----------|
| Dark BG | `#0f1419` | `#0d1117` | `#0a2540` | `#000000` | `#0b1120` | `#121212` |
| Primary | `#8ab4f8` | `#58a6ff` | `#635bff` | `#0070f3` | `#06b6d4` | `#bb86fc` |
| Accent | `#8e24aa` | `#f85149` | `#00d4ff` | `#ffffff` | `#38bdf8` | `#03dac6` |
| Font | Inter | SF Pro | Söhne | Inter | Inter | Roboto |
| Style | Clean | Tech | Modern | Minimal | Vibrant | Material |

---

## 🚀 Temas Experimentais

### 1. Dracula Theme

```css
[data-theme='dark'] {
  --ifm-background-color: #282a36;
  --ifm-background-surface-color: #44475a;
  --ifm-color-primary: #bd93f9;
  --ifm-color-success: #50fa7b;
  --ifm-color-danger: #ff5555;
}
```

### 2. Nord Theme

```css
[data-theme='dark'] {
  --ifm-background-color: #2e3440;
  --ifm-background-surface-color: #3b4252;
  --ifm-color-primary: #88c0d0;
  --ifm-color-success: #a3be8c;
}
```

### 3. Monokai Theme

```css
[data-theme='dark'] {
  --ifm-background-color: #272822;
  --ifm-background-surface-color: #3e3d32;
  --ifm-color-primary: #66d9ef;
  --ifm-color-success: #a6e22e;
}
```

---

## 📝 Checklist de Migração

- [ ] Backup do tema atual
- [ ] Escolher nova paleta de cores
- [ ] Atualizar variáveis CSS
- [ ] Testar em light mode
- [ ] Testar em dark mode
- [ ] Verificar contraste de cores
- [ ] Testar em mobile
- [ ] Validar acessibilidade
- [ ] Revisar todos os componentes
- [ ] Documentar mudanças
- [ ] Commit e push

---

## 🔗 Recursos Externos

### Documentação Oficial
- [Docusaurus Styling](https://docusaurus.io/docs/styling-layout)
- [Infima CSS Framework](https://infima.dev/)
- [CSS Variables](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)

### Inspiração de Design
- [Gemini CLI](https://geminicli.com/docs/)
- [GitHub Docs](https://docs.github.com/)
- [Stripe Docs](https://stripe.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)

### Acessibilidade
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [A11y Project](https://www.a11yproject.com/)

---

**Última Atualização**: 2025-10-19
**Tema Atual**: Gemini CLI ✅



