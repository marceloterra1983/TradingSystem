---
title: Collapsible Card Standardization Guide
sidebar_position: 30
tags: [frontend, ui, cards, collapsible, standardization, guide]
domain: frontend
type: guide
summary: Standardization guide for collapsible cards including API, props, and implementation patterns
status: active
last_review: 2025-10-17
---

# CollapsibleCard Standardization Guide

**Date:** 2025-10-11
**Version:** 1.1.0
**Status:** ✅ Complete
**Author:** Claude Code

---

## Overview

This guide documents the standardization of all dashboard pages to use the `CollapsibleCard` component pattern, ensuring consistent collapse/expand functionality across the entire TradingSystem dashboard application.

## Motivation

Prior to this standardization, dashboard pages used a mix of:
- Standard `Card` components (no collapse functionality)
- `CollapsibleCard` components (with collapse functionality)
- `PlaceholderSection` components (indirect CollapsibleCard usage)

This inconsistency created:
- ❌ Unpredictable UX - some sections collapsible, others not
- ❌ Inconsistent keyboard navigation
- ❌ No global collapse/expand all functionality
- ❌ Harder maintenance and cognitive overhead

## Solution

Standardize all dashboard pages with substantive content to use `CollapsibleCard` components with:
- ✅ Persistent state via `cardId` + localStorage
- ✅ Consistent header/content structure
- ✅ Global collapse/expand events support
- ✅ Proper accessibility (ARIA attributes, keyboard nav)

---

## Component API

### CollapsibleCard Structure

```tsx
<CollapsibleCard cardId="unique-id">
  <CollapsibleCardHeader>
    <div className="flex-1">
      <CollapsibleCardTitle>Section Title</CollapsibleCardTitle>
      <CollapsibleCardDescription>
        Section description or subtitle
      </CollapsibleCardDescription>
    </div>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    {/* Your section content */}
  </CollapsibleCardContent>
</CollapsibleCard>
```

### Key Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `cardId` | `string` | ✅ Yes | Unique identifier for localStorage persistence (format: `page-section`) |
| `defaultCollapsed` | `boolean` | ❌ No | Initial collapsed state (default: `false`) |
| `className` | `string` | ❌ No | Additional Tailwind classes |

### CardId Naming Convention

**Pattern:** `{page}-{section-name}`

**Examples:**
- `ideas-list` - Ideas list section on Banco de Ideias page
- `connections-websocket` - WebSocket status on Connections page
- `tp-capital-signals-table` - Signal table on TP Capital page

---

## Pages Converted

### 1. BancoIdeiasPage (4 sections)

**File:** `frontend/dashboard/src/components/pages/BancoIdeiasPage.tsx`

| Section | Card ID | Description |
|---------|---------|-------------|
| IdeiasListSection | `ideas-list` | Search, filter, and browse ideas grid |
| AddIdeiaSection | `ideas-add` | Form to create new ideas |
| CategoriasSection | `ideas-categories` | Category statistics and breakdown |
| StatusBoardSection | `ideas-status-board` | Kanban-style drag-and-drop board |

**Before:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>Banco de Ideias</CardTitle>
  </CardHeader>
  <CardContent>{/* ... */}</CardContent>
</Card>
```

**After:**
```tsx
<CollapsibleCard cardId="ideas-list">
  <CollapsibleCardHeader>
    <div className="flex-1">
      <CollapsibleCardTitle className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5" />
        Banco de Ideias
      </CollapsibleCardTitle>
      <CollapsibleCardDescription>
        Gerencie e busque ideias de melhorias para o sistema
      </CollapsibleCardDescription>
    </div>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>{/* ... */}</CollapsibleCardContent>
</CollapsibleCard>
```

---

### 2. ConnectionsPage (3 sections)

**File:** `frontend/dashboard/src/components/pages/ConnectionsPage.tsx`

| Section | Card ID | Description |
|---------|---------|-------------|
| WebSocketStatusSection | `connections-websocket` | System status and documentation connectivity |
| ProfitDLLStatusSection | `connections-profitdll` | Trading system integration status |
| ServiceHealthSection | `connections-services` | Backend services health monitoring |

**Note:** TelegramManagementSection already used CollapsibleCard (`connections-telegram`)

---

### 3. TPCapitalOpcoesPage (1 section)

**File:** `frontend/dashboard/src/components/pages/TPCapitalOpcoesPage.tsx`

| Section | Card ID | Description |
|---------|---------|-------------|
| SignalTableCard | `tp-capital-signals-table` | TP Capital options signals data table |

**Key Challenge:** Integrated with `CustomizablePageLayout` - required wrapping entire component while preserving drag-and-drop grid functionality.

---

## Migration Checklist

When converting a page to use CollapsibleCard:

### Step 1: Import Components
```tsx
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
```

### Step 2: Define Unique cardId
```tsx
// Pattern: {page-name}-{section-name}
const cardId = "my-page-my-section";
```

### Step 3: Replace Card Structure
```tsx
// Old
<Card>
  <CardHeader><CardTitle>Title</CardTitle></CardHeader>
  <CardContent>{content}</CardContent>
</Card>

// New
<CollapsibleCard cardId={cardId}>
  <CollapsibleCardHeader>
    <div className="flex-1">
      <CollapsibleCardTitle>Title</CollapsibleCardTitle>
      <CollapsibleCardDescription>Description</CollapsibleCardDescription>
    </div>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>{content}</CollapsibleCardContent>
</CollapsibleCard>
```

### Step 4: Add Icons (Optional but Recommended)
```tsx
import { IconName } from 'lucide-react';

<CollapsibleCardTitle className="flex items-center gap-2">
  <IconName className="h-5 w-5" />
  Title Text
</CollapsibleCardTitle>
```

### Step 5: Test
- ✅ Click header to collapse/expand
- ✅ Refresh page - state persists
- ✅ Global collapse/expand all works
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Dark mode compatibility

---

## Technical Implementation

### State Persistence

Collapse state is stored in localStorage:

```typescript
// Key format
const key = `card-collapsed-${cardId}`;

// Value
localStorage.setItem(key, JSON.stringify(isCollapsed));

// Retrieval
const stored = localStorage.getItem(key);
const isCollapsed = stored ? JSON.parse(stored) : defaultCollapsed;
```

### Global Collapse/Expand

Custom event pattern for "Collapse All" / "Expand All":

```typescript
// Dispatch event (e.g., from LayoutControls)
window.dispatchEvent(new CustomEvent('collapse-all-cards', {
  detail: { collapsed: true } // or false for expand all
}));

// Listener (inside CollapsibleCard component)
useEffect(() => {
  const handleCollapseAll = (event: Event) => {
    const customEvent = event as CustomEvent<{ collapsed: boolean }>;
    setIsCollapsed(customEvent.detail.collapsed);
  };

  window.addEventListener('collapse-all-cards', handleCollapseAll);
  return () => window.removeEventListener('collapse-all-cards', handleCollapseAll);
}, [cardId]);
```

### Animation

Smooth collapse/expand animation via Tailwind:

```tsx
<div className={cn(
  'overflow-hidden transition-all duration-200',
  isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
)}>
  {children}
</div>
```

---

## Benefits

### User Experience
- 🎯 **Consistent interaction** - All sections behave the same way
- 💾 **Persistent preferences** - Collapsed state survives page reload
- 🎨 **Better information density** - Hide irrelevant sections
- ⚡ **Keyboard accessible** - Full keyboard navigation support
- 🌓 **Dark mode compatible** - Works in both light/dark themes

### Developer Experience
- 📦 **Single component pattern** - One way to do collapsible sections
- 🔧 **Easy maintenance** - Standardized structure across codebase
- 🧪 **Predictable testing** - Same behavior to test everywhere
- 📖 **Clear documentation** - Reference implementation available

### Performance
- 🚀 **Reduced DOM size** - Collapsed content has `max-h-0` and `opacity-0`
- ⚡ **Minimal re-renders** - State isolated per card
- 💪 **Efficient events** - Global collapse uses single event listener

---

## Reference Implementation

**Best Practice Example:** [EscopoPage.tsx](https://github.com/marceloterra1983/TradingSystem/blob/main/frontend/dashboard/src/components/pages/EscopoPage.tsx)

This page demonstrates:
- ✅ 7 collapsible sections with unique cardIds
- ✅ Proper header/content structure
- ✅ Icon usage for visual hierarchy
- ✅ Descriptive titles and subtitles
- ✅ Complex nested content (tables, grids, lists)

---

## Common Patterns

### Pattern 1: Simple Section
```tsx
<CollapsibleCard cardId="page-section">
  <CollapsibleCardHeader>
    <div className="flex-1">
      <CollapsibleCardTitle>Title</CollapsibleCardTitle>
    </div>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    <p>Simple content</p>
  </CollapsibleCardContent>
</CollapsibleCard>
```

### Pattern 2: Section with Icon & Description
```tsx
<CollapsibleCard cardId="page-section">
  <CollapsibleCardHeader>
    <div className="flex-1">
      <CollapsibleCardTitle className="flex items-center gap-2">
        <Activity className="h-5 w-5" />
        Service Status
      </CollapsibleCardTitle>
      <CollapsibleCardDescription>
        Real-time monitoring of backend services
      </CollapsibleCardDescription>
    </div>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    {/* Complex content */}
  </CollapsibleCardContent>
</CollapsibleCard>
```

### Pattern 3: Section with Actions in Header
```tsx
<CollapsibleCard cardId="page-section">
  <CollapsibleCardHeader>
    <div className="flex-1 flex items-center justify-between">
      <div>
        <CollapsibleCardTitle>Data Table</CollapsibleCardTitle>
        <CollapsibleCardDescription>Viewing 500 records</CollapsibleCardDescription>
      </div>
      {/* Actions (buttons, filters, etc.) */}
      <div className="flex gap-2">
        <Button variant="outline">Refresh</Button>
        <Button variant="outline">Export</Button>
      </div>
    </div>
  </CollapsibleCardHeader>
  <CollapsibleCardContent>
    {/* Table content */}
  </CollapsibleCardContent>
</CollapsibleCard>
```

---

## Troubleshooting

### Issue: State not persisting
**Cause:** Missing or duplicate `cardId`
**Solution:** Ensure unique `cardId` prop is provided

### Issue: Content not animating smoothly
**Cause:** Nested animations or `max-h` too small
**Solution:** Increase `max-h-[5000px]` or remove nested animations

### Issue: Header not clickable
**Cause:** Header content has `pointer-events-none` or child element stops propagation
**Solution:** Ensure no child elements call `e.stopPropagation()`

### Issue: Global collapse/expand not working
**Cause:** `cardId` not provided to component
**Solution:** Add `cardId` prop to enable event listener

---

## Future Enhancements

### Planned Features (v1.2.0)
- [ ] Collapse/expand animation customization
- [ ] Nested CollapsibleCard support
- [ ] Auto-collapse on mobile viewports
- [ ] Collapse on route change option
- [ ] Analytics tracking (collapse/expand events)

### Nice-to-Have
- [ ] Keyboard shortcuts (e.g., `Ctrl+Shift+C` to collapse all)
- [ ] Accessibility improvements (improved screen reader announcements)
- [ ] Visual indicator for collapsed state in navigation
- [ ] Export/import collapsed state preferences

---

## Related Documentation

- [Customizable Layout System](../features/customizable-layout.md)
- [Layout Visual Guide](./layout-visual-guide.md)
- [Implementation Guide](./implementing-customizable-pages.md)
- [localStorage Persistence Pattern (ADR-0003)](../architecture/decisions/2025-10-11-adr-0003-use-localstorage-for-mvp.md)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-11 | 1.1.0 | Initial standardization - converted 3 pages (8 sections total) |

---

## Approval

**Status:** ✅ Approved & Deployed
**Build:** ✅ Successful (TypeScript + Vite)
**Tests:** ✅ Manual testing passed
**Stakeholder:** Marcelo Terra

---

**Questions or issues?** Open a GitHub issue or contact the frontend team.
