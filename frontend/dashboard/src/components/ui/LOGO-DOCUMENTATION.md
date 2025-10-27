# Logo Component - Documentação

## 📋 Visão Geral

Componente React reutilizável para exibir o logo oficial do TradingSystem com suporte automático para dark/light mode.

## 🎯 Características

- ✅ **Múltiplas Variantes**: icon, compact, full
- ✅ **Tamanhos Flexíveis**: xs, sm, md, lg, xl
- ✅ **Dark/Light Mode**: Automático baseado no tema
- ✅ **Clicável**: Suporte para onClick opcional
- ✅ **Fallback**: Emoji 📊 se o SVG falhar
- ✅ **Hover Effects**: Scale e glow quando clicável
- ✅ **TypeScript**: Totalmente tipado

## 📦 Uso Básico

### Importação

```tsx
import { Logo } from '../components/ui/logo';
```

### Exemplos

#### Logo Ícone (Apenas símbolo)

```tsx
// Pequeno
<Logo variant="icon" size="sm" />

// Médio
<Logo variant="icon" size="md" />

// Grande
<Logo variant="icon" size="lg" />
```

#### Logo Compacto (Ícone + Texto)

```tsx
// Padrão - detecta tema automaticamente
<Logo variant="compact" size="md" />

// Em sidebar
<Logo variant="compact" size="md" className="my-custom-class" />
```

#### Logo Completo

```tsx
<Logo variant="full" size="lg" />
```

#### Logo Clicável

```tsx
<Logo 
  variant="icon" 
  size="md" 
  onClick={() => navigate('/')}
/>
```

#### Logo Apenas Ícone (forçado)

```tsx
// Força exibir apenas ícone mesmo em variante compact/full
<Logo variant="compact" iconOnly size="sm" />
```

## 🎨 Props

| Prop | Tipo | Padrão | Descrição |
|------|------|--------|-----------|
| `variant` | `'icon' \| 'compact' \| 'full'` | `'compact'` | Tipo de logo a exibir |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Tamanho do logo |
| `className` | `string` | `undefined` | Classes CSS adicionais |
| `iconOnly` | `boolean` | `false` | Forçar exibir apenas ícone |
| `onClick` | `() => void` | `undefined` | Callback ao clicar |

## 📐 Tamanhos

### Icon

| Size | Dimensões |
|------|-----------|
| `xs` | 24x24px |
| `sm` | 32x32px |
| `md` | 40x40px |
| `lg` | 48x48px |
| `xl` | 64x64px |

### Compact & Full

| Size | Altura |
|------|--------|
| `xs` | 24px |
| `sm` | 32px |
| `md` | 40px |
| `lg` | 48px |
| `xl` | 64px |

*Largura ajusta automaticamente mantendo proporções*

## 🎨 Variantes

### `variant="icon"`
- Apenas o símbolo quadrado com fundo
- Arquivo: `/assets/branding/logo-icon.svg`
- Uso: Favicons, ícones pequenos

### `variant="compact"` (Padrão)
- Símbolo + texto "TradingSystem"
- Arquivos:
  - Light: `/assets/branding/logo-compact.svg`
  - Dark: `/assets/branding/logo-compact-dark.svg`
- Uso: Sidebars, headers

### `variant="full"`
- Versão completa com espaçamento
- Arquivo: `/assets/branding/logo-full.svg`
- Uso: Landing pages, banners

## 🌓 Dark/Light Mode

O componente detecta automaticamente o tema atual usando `useTheme()` e carrega o arquivo SVG apropriado:

```tsx
// Light mode: logo-compact.svg (texto escuro)
// Dark mode: logo-compact-dark.svg (texto claro)
<Logo variant="compact" size="md" />
```

## ✨ Efeitos Hover

Quando a prop `onClick` é fornecida:

```tsx
<Logo variant="icon" size="md" onClick={handleClick} />
```

Efeitos aplicados:
- **Scale**: `scale(1.1)` - cresce 10%
- **Glow**: `drop-shadow(0 0 8px rgba(6,182,212,0.5))` - brilho cyan
- **Cursor**: `pointer`
- **Transition**: `300ms` - suave

## 🔧 Customização

### Classes Tailwind

```tsx
<Logo 
  variant="icon" 
  size="md"
  className="opacity-80 hover:opacity-100 mx-auto"
/>
```

### Inline Styles

```tsx
<div style={{ display: 'flex', justifyContent: 'center' }}>
  <Logo variant="compact" size="lg" />
</div>
```

## 📍 Onde Está Sendo Usado

### Sidebar (`LayoutSidebar.tsx`)

```tsx
{!isCollapsed ? (
  <Logo variant="compact" size="md" />
) : (
  <Logo variant="icon" size="sm" />
)}
```

### Header Mobile (`LayoutHeader.tsx`)

```tsx
{isMobile && (
  <Logo variant="icon" size="sm" className="lg:hidden" />
)}
```

### Favicon (`index.html`)

```html
<link rel="icon" type="image/svg+xml" href="/assets/branding/logo-icon.svg" />
```

## 🛠️ Troubleshooting

### Logo não aparece

1. **Verifique os arquivos SVG**:
   ```bash
   ls -la frontend/dashboard/public/assets/branding/
   ```

2. **Verifique o console**:
   - Erros de carregamento aparecem no console
   - Fallback automático para emoji 📊

### Logo borrado/pixelado

- Use SVG sempre que possível
- Se usar PNG, garanta 2x retina resolution

### Tema não muda

- Verifique se `ThemeContext` está funcionando
- Teste: `const { resolvedTheme } = useTheme()`

## 📚 Arquivos Relacionados

- **Componente**: `src/components/ui/logo.tsx`
- **SVG Icon**: `public/assets/branding/logo-icon.svg`
- **SVG Compact Light**: `public/assets/branding/logo-compact.svg`
- **SVG Compact Dark**: `public/assets/branding/logo-compact-dark.svg`
- **SVG Full**: `public/assets/branding/logo-full.svg`

## 🚀 Próximas Melhorias

- [ ] Animação de loading
- [ ] Suporte para imagem alternativa
- [ ] Versão animada (pulsante)
- [ ] Export como PNG para compartilhamento
- [ ] Modo de cor customizada

---

**Criado**: Outubro 2025  
**Versão**: 1.0.0  
**Autor**: TradingSystem Team

