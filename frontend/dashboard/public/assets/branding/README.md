# TradingSystem - Branding Assets

## 📁 Arquivos Disponíveis

| Arquivo | Dimensões | Uso |
|---------|-----------|-----|
| `logo-icon.svg` | 64x64px | Favicon, ícone standalone |
| `logo-compact.svg` | 180x40px | Sidebar e headers (light mode) |
| `logo-compact-dark.svg` | 180x40px | Sidebar e headers (dark mode) |
| `logo-full.svg` | 200x48px | Páginas e banners |

## 🎨 Design

- **Fundo**: `#0f172a` (Slate-900)
- **Linha**: `#06b6d4` (Cyan-500) - Gráfico de trading
- **Texto**: `#0f172a` (light) / `#f1f5f9` (dark)

## 🚀 Uso

### Favicon
```html
<link rel="icon" type="image/svg+xml" href="/assets/branding/logo-icon.svg" />
```

### Logo na Sidebar
```tsx
const logoSrc = resolvedTheme === 'dark'
  ? '/assets/branding/logo-compact-dark.svg'
  : '/assets/branding/logo-compact.svg';

<img src={logoSrc} alt="TradingSystem" className="h-10 w-auto" />
```

## 📖 Documentação Completa

Para documentação completa sobre o sistema de branding, veja:
`/docs/static/img/README.md`

---

Criado em: Outubro 2025

