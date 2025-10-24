---
title: Button Standards - TradingSystem Dashboard
sidebar_position: 1
tags:
  - documentation
domain: shared
type: guide
summary: 'RULE: All "Add" buttons must use ONLY the "+" icon, NO TEXT.'
status: active
last_review: '2025-10-23'
---

# Button Standards - TradingSystem Dashboard

## Add Button Standard (Site-Wide)

**RULE: All "Add" buttons must use ONLY the "+" icon, NO TEXT.**

### ✅ Correct Usage

```tsx
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';

// Correct: Icon-only with tooltip
<Button
  onClick={handleAdd}
  className="h-10 w-10 p-0"
  title="Adicionar Ideia"
>
  <Plus className="h-5 w-5" />
</Button>
```

### ❌ Incorrect Usage

```tsx
// Wrong: Contains text
<Button onClick={handleAdd}>
  <Plus className="h-4 w-4 mr-2" />
  Adicionar Ideia
</Button>

// Wrong: Text only
<Button onClick={handleAdd}>
  Add New Item
</Button>
```

## Rationale

1. **Consistency**: Universal "+" symbol is recognized globally
2. **Space-saving**: Icon-only buttons take less space in headers
3. **Clean design**: Maintains visual hierarchy without text clutter
4. **Accessibility**: `title` attribute provides context on hover

## Implementation Checklist

- [x] BancoIdeiasPage.tsx - "Adicionar Ideia" button
- [x] ConnectionsPage.tsx - "Adicionar Bot" button
- [x] ConnectionsPage.tsx - "Adicionar Canal" button
- [x] action-buttons.tsx - AddButton component (standardized)

## Button Specifications

- **Size**: `h-10 w-10` (40x40px)
- **Padding**: `p-0` (icon centered)
- **Icon**: `h-5 w-5` (20x20px)
- **Variant**: `default` for primary action
- **Accessibility**: Always include `title` attribute

## Related Components

- `src/components/ui/action-buttons.tsx` - Contains `AddButton` reusable component
- `src/components/ui/button.tsx` - Base Button component from shadcn/ui
