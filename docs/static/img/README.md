# TradingSystem - Sistema de Logo e Branding

## 🎨 Design do Logo

O logo oficial do TradingSystem apresenta um design minimalista e moderno que representa perfeitamente um sistema de trading algorítmico de alta frequência.

### Elementos do Design

- **Background**: Quadrado com cantos arredondados em azul escuro profundo (`#0f172a` - Slate-900)
- **Linha**: Gráfico de trading em cyan vibrante (`#06b6d4` - Cyan-500)
- **Estilo**: Flat design, limpo e profissional
- **Formato**: Linha angular que simula um gráfico de tendência em alta

## 📁 Arquivos de Logo

### Docusaurus (Documentação)

| Arquivo | Uso | Dimensões | Descrição |
|---------|-----|-----------|-----------|
| `logo.svg` | Navbar dark mode, Favicon | 64x64px | Logo completo com fundo escuro |
| `logo-light.svg` | Navbar light mode | 64x64px | Apenas a linha cyan (sem fundo) |
| `favicon.svg` | Favicon do browser | 32x32px | Versão compacta para ícone |

### Dashboard (Frontend)

Os arquivos do dashboard estão em `/frontend/dashboard/public/assets/branding/`:

| Arquivo | Uso | Dimensões | Descrição |
|---------|-----|-----------|-----------|
| `logo-icon.svg` | Favicon | 64x64px | Ícone quadrado completo |
| `logo-compact.svg` | Sidebar light mode | 180x40px | Logo + texto para light mode |
| `logo-compact-dark.svg` | Sidebar dark mode | 180x40px | Logo + texto para dark mode |
| `logo-full.svg` | Headers e páginas | 200x48px | Versão completa com texto |

## 🎯 Especificações Técnicas

### Cores

```css
/* Dark Background */
--logo-bg: #0f172a;        /* Slate-900 */

/* Primary Line */
--logo-line: #06b6d4;      /* Cyan-500 */

/* Text (Light Mode) */
--logo-text-light: #0f172a;   /* Slate-900 */

/* Text (Dark Mode) */
--logo-text-dark: #f1f5f9;    /* Slate-100 */
```

### Geometria da Linha

```svg
<!-- Trading chart line path -->
<path 
  d="M 12 48 L 24 24 L 32 40 L 40 16 L 52 32"
  stroke="#06b6d4"
  stroke-width="4"
  stroke-linecap="round"
  stroke-linejoin="round"
/>
```

### Border Radius

- **Full Size (64px)**: `rx="12"` (18.75%)
- **Compact (40px)**: `rx="8"` (20%)
- **Favicon (32px)**: `rx="6"` (18.75%)

## 🚀 Uso no Código

### Docusaurus Config

```javascript
{
  favicon: 'img/favicon.svg',
  themeConfig: {
    navbar: {
      logo: {
        src: 'img/logo-light.svg',    // Light mode
        srcDark: 'img/logo.svg',       // Dark mode
        width: 32,
        height: 32,
      }
    }
  }
}
```

### Dashboard HTML

```html
<link rel="icon" type="image/svg+xml" href="/assets/branding/logo-icon.svg" />
```

### React Component

```tsx
const logoSrc = theme === 'dark'
  ? '/assets/branding/logo-compact-dark.svg'
  : '/assets/branding/logo-compact.svg';
  
<img src={logoSrc} alt="TradingSystem" className="h-10 w-auto" />
```

## 🎨 Animações e Efeitos

### Hover Effect (CSS)

```css
.navbar__logo {
  transition: transform 0.3s ease, filter 0.3s ease;
}

.navbar__logo:hover {
  transform: scale(1.1) rotate(5deg);
  filter: drop-shadow(0 0 8px rgba(6, 182, 212, 0.5));
}
```

## 📐 Diretrizes de Uso

### ✅ Permitido

- Usar em documentação oficial
- Usar em aplicações do TradingSystem
- Redimensionar mantendo proporções
- Aplicar em fundos claros ou escuros apropriados

### ❌ Não Permitido

- Alterar as cores do logo
- Distorcer ou deformar
- Adicionar sombras ou efeitos não especificados
- Rotacionar (exceto o efeito hover de 5°)
- Usar em baixa resolução que comprometa a qualidade

## 🔄 Versões Futuras

Possíveis adições planejadas:

- [ ] Versão animada (SVG com animação)
- [ ] Versão monocromática (preto/branco)
- [ ] Versão horizontal para banners
- [ ] Ícones para redes sociais (1200x1200, 1200x628)
- [ ] Versão PNG em múltiplas resoluções

## 📝 Changelog

### v1.0.0 - 2025-10-26

- ✨ Design inicial do logo
- ✨ Criação de todas as variantes (light/dark/compact)
- ✨ Implementação no Docusaurus e Dashboard
- ✨ Animações de hover
- ✨ Documentação completa

---

**Criado por**: TradingSystem Team  
**Data**: Outubro 2025  
**Licença**: Uso interno do TradingSystem

