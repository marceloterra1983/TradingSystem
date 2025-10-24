# TradingSystem Brand Assets

## Logo Files

### Primary Logo
- **[logo.svg](logo.svg)** - Full logo with tagline (400x80px)
  - Use: Main website, documentation headers, presentations
  - Background: Light backgrounds (#ffffff, #f8fafc)

### Logo Variations
- **[logo-dark.svg](logo-dark.svg)** - Dark mode version (400x80px)
  - Use: Dark UI themes, dark backgrounds
  - Background: Dark backgrounds (#0f172a, #1e293b)

- **[logo-compact.svg](logo-compact.svg)** - Compact version without tagline (280x60px)
  - Use: Navigation bars, smaller spaces, mobile headers

- **[logo-icon.svg](logo-icon.svg)** - Icon only (60x80px)
  - Use: Favicons, app icons, social media avatars

## Design Specifications

### Logo Icon
- **Concept**: Stylized candlestick chart with upward trend line
- **Colors**:
  - Blue candlesticks: `#3b82f6` → `#1d4ed8` (gradient)
  - Green candlesticks: `#10b981` → `#059669` (gradient)
  - Trend line: `#f59e0b` (amber)

### Typography
- **Font Family**: Inter, Segoe UI, system-ui (sans-serif)
- **"Trading"**:
  - Weight: 700 (Bold)
  - Color: `#1e293b` (slate-800) / `#f1f5f9` (dark mode)
- **"System"**:
  - Weight: 700 (Bold)
  - Color: `#3b82f6` (blue-500) / `#60a5fa` (dark mode)
- **Tagline**: "HIGH-FREQUENCY ALGORITHMIC TRADING"
  - Weight: 500 (Medium)
  - Size: 11px
  - Color: `#64748b` (slate-500)
  - Letter spacing: 0.05em

## Usage Guidelines

### Clear Space
Maintain minimum clear space around the logo equal to the height of one candlestick icon.

### Minimum Sizes
- Full logo: 200px width minimum
- Compact logo: 140px width minimum
- Icon only: 32px width minimum

### DO's ✅
- Use on solid, high-contrast backgrounds
- Scale proportionally (maintain aspect ratio)
- Use official color versions when possible
- Use dark version on dark backgrounds (#1e293b or darker)
- Use light version on light backgrounds (#f8fafc or lighter)

### DON'Ts ❌
- Don't distort or stretch the logo
- Don't change colors or gradients
- Don't add effects (shadows, outlines, glows)
- Don't rotate or flip the logo
- Don't place on busy backgrounds that reduce legibility
- Don't recreate or modify the logo

## Color Palette

### Primary Colors
```css
--brand-blue-500: #3b82f6;
--brand-blue-700: #1d4ed8;
--brand-green-500: #10b981;
--brand-green-600: #059669;
--brand-amber-500: #f59e0b;
```

### Neutrals (Light Theme)
```css
--text-primary: #1e293b;    /* slate-800 */
--text-secondary: #64748b;  /* slate-500 */
--background: #ffffff;
```

### Neutrals (Dark Theme)
```css
--text-primary: #f1f5f9;    /* slate-100 */
--text-secondary: #94a3b8;  /* slate-400 */
--background: #0f172a;      /* slate-900 */
```

## Implementation Examples

### HTML
```html
<!-- Full logo -->
<img src="/assets/branding/logo.svg" alt="TradingSystem" width="400" height="80">

<!-- Dark mode -->
<img src="/assets/branding/logo-dark.svg" alt="TradingSystem" width="400" height="80">

<!-- Compact (navbar) -->
<img src="/assets/branding/logo-compact.svg" alt="TradingSystem" width="280" height="60">

<!-- Icon only (favicon) -->
<link rel="icon" type="image/svg+xml" href="/assets/branding/logo-icon.svg">
```

### CSS (Responsive)
```css
.logo {
  max-width: 400px;
  height: auto;
}

@media (max-width: 768px) {
  .logo {
    max-width: 280px;
  }
}

@media (prefers-color-scheme: dark) {
  .logo-light {
    display: none;
  }
  .logo-dark {
    display: block;
  }
}
```

### React Component
```tsx
import LogoLight from '@/assets/branding/logo.svg';
import LogoDark from '@/assets/branding/logo-dark.svg';
import LogoCompact from '@/assets/branding/logo-compact.svg';

export function Logo({ variant = 'full', className = '' }) {
  const { theme } = useTheme();

  const logoSrc = variant === 'compact'
    ? LogoCompact
    : (theme === 'dark' ? LogoDark : LogoLight);

  return (
    <img
      src={logoSrc}
      alt="TradingSystem"
      className={className}
    />
  );
}
```

## File Formats

All logos are provided in **SVG format** for:
- ✅ Infinite scalability (vector graphics)
- ✅ Small file sizes (~2-4KB)
- ✅ Sharp rendering on all displays (retina/4K)
- ✅ Easy integration with web projects

### Need PNG/JPG?
Use online converters or design tools to export at required dimensions:
- **Favicon**: 32x32, 64x64, 128x128 (PNG)
- **Social Media**: 1200x630 (PNG/JPG)
- **Print**: 300 DPI minimum (PNG/PDF)

## Questions?

For brand asset requests or modifications, contact the design team or create an issue in the repository.

---

**Version**: 1.0.0
**Last Updated**: 2025-10-09
**Designer**: Claude (Anthropic AI)
