---
title: Dark Mode Quick Reference
sidebar_position: 41
tags: [frontend, ui, dark-mode, theming, quick-reference]
domain: frontend
type: reference
summary: Quick reference for dark mode implementation with color mappings and common patterns
status: active
last_review: 2025-10-17
---

# Dark Mode Quick Reference

**⚠️ MANDATORY**: All new components MUST include dark mode support from the start.

---

## 📋 Pre-Development Checklist

Before creating any new page or component, review:
1. [Dark Mode Implementation Guide](./dark-mode.md) - Complete implementation guide
2. This quick reference for common patterns
3. Existing components (BancoIdeiasPage, EscopoPage) as examples

---

## 🎨 Color Mapping Cheat Sheet

```
Light Mode Shade → Dark Mode Shade
────────────────────────────────────
50  → 950   (lightest bg → darkest bg)
100 → 900   (light bg → dark bg)
200 → 800   (borders)
300 → 700   (borders)
400 → 600   (muted elements)
500 → 500   (usually same)
600 → 400   (text, icons)
700 → 300   (darker text)
800 → 200   (darkest text)
900 → 100   (primary text)

Special Cases:
white → gray-900
gray-50 → gray-950
```

---

## 🚀 Copy-Paste Patterns

### Pattern 1: Page Background
```tsx
className="bg-gray-50 dark:bg-gray-950"
```

### Pattern 2: Card/Container
```tsx
className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700"
```

### Pattern 3: Primary Text
```tsx
className="text-gray-900 dark:text-gray-100"
```

### Pattern 4: Secondary Text
```tsx
className="text-gray-600 dark:text-gray-400"
```

### Pattern 5: Colored Background (Category/Status)
```tsx
// Blue category
className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"

// Green category
className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800"

// Red alert
className="bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
```

### Pattern 6: Icon with Color
```tsx
<Icon className="text-blue-600 dark:text-blue-400" />
<Icon className="text-green-600 dark:text-green-400" />
<Icon className="text-red-600 dark:text-red-400" />
```

### Pattern 7: Button/Interactive Element
```tsx
className="bg-cyan-500 hover:bg-cyan-600
           dark:bg-cyan-600 dark:hover:bg-cyan-500
           text-white dark:text-white"
```

### Pattern 8: Hover State (Card/Row)
```tsx
className="hover:bg-gray-100 dark:hover:bg-gray-800"
```

### Pattern 9: Native Form Elements
```tsx
// Input, Select, Textarea
className="bg-white dark:bg-gray-800
           border border-gray-300 dark:border-gray-600
           text-gray-900 dark:text-gray-100
           placeholder:text-gray-400 dark:placeholder:text-gray-500
           focus:border-cyan-500 dark:focus:border-cyan-400"
```

### Pattern 10: Configuration Object
```tsx
const CATEGORY_CONFIG = {
  myCategory: {
    label: 'My Category',
    icon: MyIcon,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
  },
};

// Usage
<div className={CATEGORY_CONFIG.myCategory.bgColor}>
  <Icon className={CATEGORY_CONFIG.myCategory.color} />
</div>
```

---

## ⚡ Common Component Templates

### Alert Box (Success)
```tsx
<div className="bg-green-50 dark:bg-green-950
                border border-green-200 dark:border-green-800
                text-green-800 dark:text-green-400
                p-4 rounded-lg">
  <CheckCircle className="text-green-600 dark:text-green-400" />
  <p>Success message</p>
</div>
```

### Alert Box (Error)
```tsx
<div className="bg-red-50 dark:bg-red-950
                border border-red-200 dark:border-red-800
                text-red-800 dark:text-red-400
                p-4 rounded-lg">
  <AlertTriangle className="text-red-600 dark:text-red-400" />
  <p>Error message</p>
</div>
```

### Alert Box (Warning)
```tsx
<div className="bg-yellow-50 dark:bg-yellow-950
                border border-yellow-200 dark:border-yellow-800
                text-yellow-800 dark:text-yellow-400
                p-4 rounded-lg">
  <AlertCircle className="text-yellow-600 dark:text-yellow-400" />
  <p>Warning message</p>
</div>
```

### Category/Status Badge
```tsx
<span className="px-2 py-1 rounded-md text-xs font-medium
                 bg-blue-100 dark:bg-blue-900
                 text-blue-700 dark:text-blue-300
                 border border-blue-200 dark:border-blue-700">
  Badge Text
</span>
```

### Card with Hover
```tsx
<div className="bg-white dark:bg-gray-900
                border border-gray-200 dark:border-gray-700
                rounded-lg p-4
                hover:shadow-lg dark:hover:shadow-cyan-500/10
                hover:bg-gray-50 dark:hover:bg-gray-800
                transition-all">
  Card content
</div>
```

---

## 🧪 Testing Checklist

When you finish implementing a component, verify:

- [ ] Toggle theme button works
- [ ] All text is readable in both themes
- [ ] All backgrounds have dark variants
- [ ] All borders are visible (not too harsh)
- [ ] All icons have proper colors
- [ ] Hover states work in both themes
- [ ] No "invisible" elements (same color as background)
- [ ] Native form elements have dark styling
- [ ] Category/status badges have colored backgrounds
- [ ] Alert/message boxes display correctly

---

## 📚 Full Color Reference

### Neutral Grays
```tsx
bg-white          → dark:bg-gray-900
bg-gray-50        → dark:bg-gray-950
bg-gray-100       → dark:bg-gray-900
border-gray-200   → dark:border-gray-700
border-gray-300   → dark:border-gray-600
text-gray-900     → dark:text-gray-100
text-gray-600     → dark:text-gray-400
text-gray-500     → dark:text-gray-500
```

### Blues (Documentation, Primary)
```tsx
bg-blue-50        → dark:bg-blue-950
bg-blue-100       → dark:bg-blue-900
border-blue-200   → dark:border-blue-800
text-blue-600     → dark:text-blue-400
text-blue-700     → dark:text-blue-300
```

### Greens (Success, Data Capture)
```tsx
bg-green-50       → dark:bg-green-950
bg-green-100      → dark:bg-green-900
border-green-200  → dark:border-green-800
text-green-600    → dark:text-green-400
text-green-800    → dark:text-green-300
```

### Reds (Error, Danger, Risk)
```tsx
bg-red-50         → dark:bg-red-950
bg-red-100        → dark:bg-red-900
border-red-200    → dark:border-red-800
border-red-300    → dark:border-red-800
text-red-600      → dark:text-red-400
text-red-800      → dark:text-red-300
```

### Purples (Database, Review)
```tsx
bg-purple-50      → dark:bg-purple-950
bg-purple-100     → dark:bg-purple-900
border-purple-200 → dark:border-purple-800
text-purple-600   → dark:text-purple-400
text-purple-800   → dark:text-purple-300
```

### Oranges (Analytics, Warning)
```tsx
bg-orange-50      → dark:bg-orange-950
bg-orange-100     → dark:bg-orange-900
border-orange-200 → dark:border-orange-800
text-orange-600   → dark:text-orange-400
text-orange-800   → dark:text-orange-300
```

### Cyans (Dashboard, In Progress)
```tsx
bg-cyan-50        → dark:bg-cyan-950
bg-cyan-100       → dark:bg-cyan-900
border-cyan-200   → dark:border-cyan-800
text-cyan-600     → dark:text-cyan-400
text-cyan-700     → dark:text-cyan-300
```

---

## 🔗 Additional Resources

- **Full Guide**: [Dark Mode Implementation Guide](./dark-mode.md)
- **Frontend Overview**: [Frontend Documentation Hub](../README.md)
- **Real Documentation Examples**:
  - [Idea Bank Feature](../features/feature-idea-bank.md) - Category cards with colored backgrounds
  - [Dashboard Home Feature](../features/feature-dashboard-home.md) - Tech stack cards and alert boxes
- **Tailwind Docs**: https://tailwindcss.com/docs/dark-mode

---

**Last Updated**: 2025-10-09
**Version**: 1.0.0
