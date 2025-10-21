---
title: Customizable Layout System
sidebar_position: 20
tags: [frontend, layout, drag-and-drop, ux, feature]
domain: frontend
type: reference
summary: Drag-and-drop grid layout system with collapsible cards and persistence for dashboard pages
status: active
last_review: 2025-10-17
---

# Customizable Layout System

The **Customizable Layout System** provides a flexible, user-configurable grid layout with drag-and-drop functionality for all dashboard pages. Users can reorganize sections, adjust column counts, collapse/expand cards, and persist their preferences.

## Overview

### Key Features

- **🎯 Drag-and-Drop**: Intuitive card repositioning with visual feedback
- **📊 Grid Layouts**: 1-4 column configurations with responsive breakpoints
- **💾 Persistence**: Auto-save layout preferences per page to localStorage
- **🔄 Collapsible Cards**: Expand/collapse sections independently
- **♻️ Reset**: One-click restore to default layout
- **📱 Responsive**: Mobile-first design with tablet/desktop breakpoints

### Architecture

```
CustomizablePageLayout
├── LayoutControls (column selector, reset, collapse all)
├── DraggableGridLayout (drag-and-drop grid)
│   ├── Droppable Zones (columns)
│   └── Draggable Items (cards with isolated drag handles)
└── useCustomLayout (state management + persistence)
```

## Components

### 1. CustomizablePageLayout

**Location**: `frontend/apps/dashboard/src/components/layout/CustomizablePageLayout.tsx`

Main wrapper component that combines title, controls, and draggable grid.

```tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';

export function MyPage() {
  const sections = [
    { id: 'section-1', content: <Section1Component /> },
    { id: 'section-2', content: <Section2Component /> },
  ];

  return (
    <CustomizablePageLayout
      pageId="my-page"
      title="My Page"
      subtitle="Optional description"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

**Props**:
- `pageId` (string): Unique identifier for localStorage persistence
- `title` (string): Page title displayed in header
- `subtitle` (string, optional): Subtitle/description
- `sections` (array): Array of `{ id: string, content: ReactNode }`
- `defaultColumns` (1-4): Initial column count

### 2. DraggableGridLayout

**Location**: `frontend/apps/dashboard/src/components/layout/DraggableGridLayout.tsx`

Implements the drag-and-drop grid using `@dnd-kit`.

**Key Features**:
- **Isolated Drag Handle**: Vertical bar on the left of each card
- **Visual Feedback**: Position indicators, drop zones, hover highlights
- **Sortable Columns**: Each column is a droppable zone
- **Activation Constraint**: 8px movement threshold to prevent accidental drags

**Drag Handle Design**:
```
┌─────────────────────┐
│ ║  Card Header     ▼ │  ← Drag: grab the ║ bar
│ ║                    │     Click header: collapse/expand
│ ║  Card Content      │
│ ║                    │
└─────────────────────┘
  ↑
  Drag handle (appears on hover)
```

### 3. LayoutControls

**Location**: `frontend/apps/dashboard/src/components/layout/LayoutControls.tsx`

Control bar for layout management.

**Controls**:
- **Column Buttons**: 1, 2, 3, 4 columns
- **Reset Button**: Restore default layout
- **Collapse All/Expand All**: Toggle all cards at once
- **Drag Hint**: Visual reminder about drag functionality

### 4. CollapsibleCard

**Location**: `frontend/apps/dashboard/src/components/ui/collapsible-card.tsx`

Card component with built-in collapse/expand functionality.

```tsx
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from '../ui/collapsible-card';

export function MySection() {
  return (
    <CollapsibleCard cardId="unique-section-id" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Section Title</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div>Section content...</div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

**Props**:
- `cardId` (string): Unique ID for state persistence
- `defaultCollapsed` (boolean): Initial collapsed state
- `children`: Card content (Header + Content)

**State Persistence**: Collapse state saved to localStorage per card ID.

### 5. useCustomLayout Hook

**Location**: `frontend/apps/dashboard/src/components/layout/useCustomLayout.tsx`

React hook for layout state management and persistence.

```tsx
const {
  columns,              // Current column count (1-4)
  setColumns,           // Set column count
  getComponentColumn,   // Get column index for component
  moveComponent,        // Move component to column
  getComponentsInColumn,// Get all components in column
  resetLayout,          // Reset to default
} = useCustomLayout({
  pageId: 'my-page',
  componentIds: ['comp1', 'comp2', 'comp3'],
  defaultColumns: 2,
});
```

**localStorage Schema**:
```json
{
  "tradingSystem_layout_my-page": {
    "columns": 2,
    "componentLayout": {
      "comp1": 0,  // Column index
      "comp2": 1,
      "comp3": 0
    }
  }
}
```

## Usage Guide

### Creating a New Page

**Step 1**: Create section components with `CollapsibleCard`

```tsx
// MyPageSections.tsx
import { CollapsibleCard, ... } from '../ui/collapsible-card';
import { PlaceholderSection } from '../ui/placeholder-section';

export function OverviewSection() {
  return (
    <CollapsibleCard cardId="my-page-overview">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Overview</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <PlaceholderSection
          cardId="overview-content"
          title="System Overview"
          description="Key metrics and status"
          icon={<Activity className="w-5 h-5 text-cyan-500" />}
        />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

export function MetricsSection() {
  return (
    <CollapsibleCard cardId="my-page-metrics">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Metrics</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {/* Real content */}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

**Step 2**: Create page component with `CustomizablePageLayout`

```tsx
// MyPageNew.tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { OverviewSection, MetricsSection } from './MyPageSections';

export function MyPageNew() {
  const sections = [
    { id: 'overview', content: <OverviewSection /> },
    { id: 'metrics', content: <MetricsSection /> },
  ];

  return (
    <CustomizablePageLayout
      pageId="my-page"
      title="My Page"
      subtitle="Description of the page"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

**Step 3**: Register in navigation

```tsx
// data/navigation.tsx
import { MyPageNew } from '../components/pages/MyPageNew';

// In the section:
{
  id: 'my-page',
  title: 'My Page',
  header: {
    title: 'My Page',
    subtitle: 'Description',
  },
  customContent: <MyPageNew />,  // Use customContent (not parts)
}
```

### Best Practices

#### ✅ DO:
- Always use `CollapsibleCard` (not plain `Card`)
- Provide unique `cardId` for state persistence
- Use `customContent` in navigation (not `parts`)
- Let `DraggableGridLayout` manage drag handles
- Use `PlaceholderSection` for "to be implemented" sections

#### ❌ DON'T:
- Add drag handlers manually to cards
- Use `parts` array for pages with CustomizablePageLayout
- Forget `cardId` - collapse state won't persist
- Apply drag `listeners` directly on card (conflicts with collapse)

### Responsive Breakpoints

```css
/* Mobile: < 768px */
grid-cols-1  /* Always 1 column */

/* Tablet: 768px - 1024px */
3 columns → 2 columns
4 columns → 2 columns

/* Desktop: > 1024px */
Respects user selection (1-4 columns)
```

## Implementation Examples

### ✅ Implemented Pages

#### 1. EscopoPage
**File**: `frontend/apps/dashboard/src/components/pages/EscopoPageNew.tsx`

7 collapsible sections: Overview, Objectives, Architecture, Tech Stack, Systems, Requirements, Constraints

```tsx
const sections = [
  { id: 'overview', content: <OverviewSection /> },
  { id: 'objectives', content: <ObjectivesSection /> },
  // ... 5 more sections
];

return (
  <CustomizablePageLayout
    pageId="escopo"
    title="Escopo do Sistema"
    subtitle="Visão completa da arquitetura e objetivos do projeto"
    sections={sections}
    defaultColumns={2}
  />
);
```

#### 2. ConnectionsPage
**File**: `frontend/apps/dashboard/src/components/pages/ConnectionsPageNew.tsx`

5 sections: ProfitDLL Status, WebSocket, Service Status, Connection History, Network Monitor

#### 3. BancoIdeiasPage
**File**: `frontend/apps/dashboard/src/components/pages/BancoIdeiasPageNew.tsx`

6 sections: Idea Board, Quick Stats, Filters, Priority Matrix, Recent Activity, Archive

#### 4. SettingsPage
**File**: `frontend/apps/dashboard/src/components/pages/SettingsPage.tsx`

7 sections: User Profile, Notifications, Appearance, Language, Security, Data Storage, Performance

### Migration Status

| Page | Status | Notes |
|------|--------|-------|
| EscopoPage | ✅ Migrated | Using CustomizablePageLayout |
| ConnectionsPage | ✅ Migrated | Using CustomizablePageLayout |
| BancoIdeiasPage | ✅ Migrated | Using CustomizablePageLayout |
| SettingsPage | ✅ Implemented | New page with CustomizablePageLayout |
| PRDsPage | ✅ Implemented | Uses CustomizablePageLayout |
| DocsPage | ✅ Implemented | iFrame integration with layout |

## Technical Details

### Dependencies

```json
{
  "@dnd-kit/core": "^6.0.8",
  "@dnd-kit/sortable": "^7.0.2",
  "@dnd-kit/utilities": "^3.2.1",
  "lucide-react": "^0.263.1",
  "react": "^18.2.0",
  "tailwindcss": "^3.4.1"
}
```

### Drag-and-Drop Implementation

**Activation Constraint**: 8px movement threshold
```tsx
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
);
```

**Isolated Drag Handle**:
```tsx
// In DraggableGridLayout
<div ref={setActivatorNodeRef} className="drag-handle">
  <div className="w-1.5 h-full bg-gray-300 dark:bg-gray-600..." />
</div>
```

**Collision Detection**: `closestCorners` strategy for better UX

### Performance Optimizations

- **Memoization**: `useCallback` prevents unnecessary re-renders
- **Lazy Loading**: Cards render content only when expanded
- **Debounced Saves**: localStorage writes batched
- **Minimal Re-renders**: Only affected components update

### Troubleshooting

#### Layout Not Persisting
**Cause**: Inconsistent `pageId` or localStorage disabled

**Solution**:
```tsx
// Ensure pageId is consistent
<CustomizablePageLayout pageId="my-page" ... />

// Check localStorage
console.log(localStorage.getItem('tradingSystem_layout_my-page'));
```

#### Drag Not Working
**Cause**: Missing dependencies or conflicting event handlers

**Solution**:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Verify no manual drag listeners on cards.

#### Collapse/Drag Conflict
**Status**: ✅ Resolved

**Solution**: Isolated drag handle using `setActivatorNodeRef`
- Drag handle: Vertical bar on the left
- Card header: Free for collapse/expand clicks

## Future Enhancements

- [ ] Undo/Redo for layout changes
- [ ] Export/Import layout configurations
- [ ] 5-6 column options
- [ ] Masonry layout (variable height columns)
- [ ] Shared layouts between users
- [ ] Layout templates/presets
- [ ] Keyboard shortcuts for layout control

## Related Documentation

- [Frontend README](../README.md) - Frontend architecture overview
- [Design System](../references/design-system.md) - shadcn/ui components
- [Navigation ADR](../architecture/decisions/2025-10-11-adr-0004-use-react-router-v6-for-navigation.md) - Route configuration
- [State Management ADR](../architecture/decisions/2025-10-11-adr-0001-use-zustand-for-state-management.md) - Zustand patterns

## Questions?

For implementation questions or feature requests, open an issue with the `frontend:layout` label or review the [Implementation Guide](../guides/implementing-customizable-pages.md) for technical details.
