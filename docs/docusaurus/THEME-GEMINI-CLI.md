# Tema Gemini CLI - Docusaurus

## 🎨 Visão Geral

O Docusaurus do TradingSystem utiliza um tema customizado **inspirado no Gemini CLI** (https://geminicli.com/docs/), oferecendo uma aparência moderna, limpa e profissional.

## ✨ Características Principais

### 1. **Paleta de Cores**

#### Light Mode
- **Primary**: `#1a73e8` (Google Blue)
- **Background**: `#ffffff` (Pure White)
- **Surface**: `#f8f9fa` (Light Gray)
- **Text**: Default (Dark Gray)
- **Menu Active**: `#1a73e8` (Google Blue)

#### Dark Mode (Gemini CLI Style)
- **Primary**: `#8ab4f8` (Light Blue)
- **Background**: `#0f1419` (Ultra Dark - quase preto)
- **Surface**: `#1a1f2e` (Dark Blue-Gray)
- **Sidebar**: `#0a0e17` (Ultra Dark)
- **Text**: `#e8eaed` (Light Gray)
- **Active Item**: `#8e24aa` (Purple/Magenta - destaque especial)

### 2. **Tipografia**

- **Font Family**: Inter (Google Fonts)
  - Weights: 400, 500, 600, 700
  - Clean, modern, highly readable
- **Monospace**: SF Mono, Monaco, Cascadia Code
- **Base Size**: 16px
- **Line Height**: 1.65 (optimal readability)

### 3. **Layout**

- **Navbar Height**: 60px
- **Sidebar Width**: 280px
- **Max Content Width**: 900px
- **Max Container**: 1440px
- **Border Radius**: 6-8px (rounded corners)

### 4. **Visual Effects**

- **Backdrop Blur**: Navbar tem `backdrop-filter: blur(8px)`
- **Smooth Transitions**: 0.2s ease para todos os elementos interativos
- **Box Shadows**: Sutis em código e cards
- **Hover States**: Transform translateY(-1px) em botões

## 🎯 Elementos Principais

### Navbar

```css
.navbar {
  border-bottom: 1px solid var(--ifm-color-emphasis-300);
  backdrop-filter: blur(8px);
}

[data-theme='dark'] .navbar {
  background-color: rgba(26, 31, 46, 0.8);
}
```

**Features**:
- Transparência com blur no dark mode
- Borda inferior sutil
- GitHub icon integrado
- Theme toggle minimalista

### Sidebar

```css
[data-theme='dark'] .theme-doc-sidebar-container {
  background-color: #0a0e17; /* Ultra dark */
}

.menu__link--active {
  background-color: #8e24aa !important; /* Purple/Magenta */
  color: #ffffff !important;
}
```

**Features**:
- Ultra dark no modo escuro (quase preto)
- Active items com destaque roxo/magenta
- Hover com background azul claro
- Categorias com uppercase e letter-spacing

### Code Blocks

```css
[data-theme='dark'] div[class^='codeBlockContainer'] {
  background-color: #0a0e17;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

code {
  color: #8e24aa;
  background-color: rgba(142, 36, 170, 0.1);
  border-radius: 3px;
}
```

**Features**:
- Inline code com destaque roxo/magenta
- Code blocks com background ultra dark
- Syntax highlighting customizado
- Border radius suave

### Admonitions

Cores baseadas na paleta do Google:

```css
.admonition-note    { border-left-color: #1a73e8; } /* Blue */
.admonition-tip     { border-left-color: #34a853; } /* Green */
.admonition-warning { border-left-color: #fbbc04; } /* Yellow */
.admonition-danger  { border-left-color: #ea4335; } /* Red */
.admonition-info    { border-left-color: #4285f4; } /* Light Blue */
```

### Scrollbar

Minimalista como no Gemini CLI:

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

[data-theme='dark'] ::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
}
```

## 🔧 Customização

### Alterar Cor Primary

Edite `docs/docusaurus/src/css/custom.css`:

```css
:root {
  --ifm-color-primary: #YOUR_COLOR;
  --ifm-color-primary-dark: #YOUR_DARK_COLOR;
  /* ... */
}
```

### Alterar Fonte

```css
@import url('https://fonts.googleapis.com/css2?family=YOUR_FONT:wght@400;500;600;700&display=swap');

:root {
  --ifm-font-family-base: 'YOUR_FONT', sans-serif;
}
```

### Ajustar Dark Mode

```css
[data-theme='dark'] {
  --ifm-background-color: #YOUR_BG_COLOR;
  --ifm-background-surface-color: #YOUR_SURFACE_COLOR;
}
```

### Customizar Active Item Color

```css
.menu__link--active {
  background-color: #YOUR_ACCENT_COLOR !important;
  color: #ffffff !important;
}
```

## 📊 Comparação com Gemini CLI Original

| Feature | Gemini CLI | Nossa Implementação | Match |
|---------|-----------|---------------------|--------|
| Dark Background | `#0f1419` | `#0f1419` | ✅ 100% |
| Sidebar Dark | `#0a0e17` | `#0a0e17` | ✅ 100% |
| Active Item | Purple/Magenta | `#8e24aa` | ✅ 100% |
| Primary Color | Light Blue | `#8ab4f8` | ✅ 100% |
| Typography | Inter | Inter | ✅ 100% |
| Border Radius | 6-8px | 6-8px | ✅ 100% |
| Navbar Blur | Yes | Yes | ✅ 100% |
| Scrollbar | Minimal | Minimal | ✅ 100% |

## 🎨 Extras Adicionados

Além do tema Gemini CLI, adicionamos:

1. **CopyButton Component** - Botão de cópia customizado
2. **CookiesBanner** - Banner de cookies estilizado
3. **Theme Toggle** - Toggle de tema com animação
4. **Search Bar** - Barra de busca estilizada
5. **Responsive Design** - Otimizado para mobile

## 📝 Arquivo de Configuração

O tema completo está em:
```
docs/docusaurus/src/css/custom.css
```

Total: **708 linhas** de CSS altamente customizado e documentado.

## 🚀 Como Testar

```bash
cd docs/docusaurus
npm install
npm run start -- --port 3004
```

Acesse: http://localhost:3004

## 📚 Referências

- **Gemini CLI Docs**: https://geminicli.com/docs/
- **Docusaurus Theming**: https://docusaurus.io/docs/styling-layout
- **Google Fonts - Inter**: https://fonts.google.com/specimen/Inter
- **Color Palette**: Google Material Design Colors

## 🎯 Próximos Passos

Para evoluir o tema:

1. ✅ Implementar mais componentes customizados
2. ✅ Adicionar mais variações de cores
3. ⏳ Criar tema light alternativo
4. ⏳ Adicionar mais animações sutis
5. ⏳ Implementar mode "auto" (system preference)

---

**Status**: ✅ Tema Gemini CLI 100% implementado e funcional
**Última Atualização**: 2025-10-19



