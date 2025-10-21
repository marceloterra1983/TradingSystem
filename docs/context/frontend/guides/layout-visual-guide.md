---
title: Customizable Layout Visual Guide
sidebar_position: 60
tags: [frontend, visual, layout, ux, guide]
domain: frontend
type: guide
summary: Visual reference for the drag-and-drop layout system with examples and interaction patterns
status: active
last_review: 2025-10-17
---

# Customizable Layout Visual Guide

Visual reference and interaction guide for the **Customizable Layout System**.

## Layout Components Anatomy

### Page Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  Page Title                                                     │
│  Optional subtitle                                              │
├─────────────────────────────────────────────────────────────────┤
│  [1] [2] [3] [4]  [Resetar]  [Recolher Tudo / Expandir Tudo]  │ ← LayoutControls
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ ║ Card Header  ▼ │  │ ║ Card Header  ▼ │                     │
│  │ ║               │  │ ║               │                     │
│  │ ║ Content       │  │ ║ Content       │                     │ ← DraggableGridLayout
│  │ ║               │  │ ║               │                     │
│  └─────────────────┘  └─────────────────┘                     │
│                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐                     │
│  │ ║ Card Header  ▶ │  │ ║ Card Header  ▼ │                     │
│  └─────────────────┘  │ ║               │                     │
│                        │ ║ Content       │                     │
│                        └─────────────────┘                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Card Anatomy

```
┌───────────────────────────────────────┐
│ ║  Card Title                       ▼  │  ← Header (click to collapse/expand)
│ ║                                      │     ║ = Drag handle (vertical bar)
│ ║  ┌────────────────────────────────┐ │     ▼/▶ = Collapse indicator
│ ║  │                                │ │
│ ║  │  Card Content                  │ │
│ ║  │  (visible when expanded)       │ │
│ ║  │                                │ │  ← Content (collapsible)
│ ║  │                                │ │
│ ║  └────────────────────────────────┘ │
│ ║                                      │
└───────────────────────────────────────┘
  ↑
  Drag handle appears on hover
  (thin gray bar, turns cyan on hover)
```

### Drag Handle States

**Default (no hover)**:
```
┌────────────────────┐
│   Card Header     ▼│
│                    │
│   Content...       │
└────────────────────┘
```

**Hover (drag handle visible)**:
```
┌────────────────────┐
│║  Card Header     ▼│  ← Gray vertical bar visible
│║                   │
│║  Content...       │
└────────────────────┘
```

**Hover on handle (ready to drag)**:
```
┌────────────────────┐
│║  Card Header     ▼│  ← Cyan vertical bar, cursor: grab
│║                   │
│║  Content...       │
└────────────────────┘
```

**Dragging**:
```
┌────────────────────┐
│║  Card Header     ▼│  ← Opacity reduced, cursor: grabbing
│║                   │     Pointer events disabled
│║  Content...       │
└────────────────────┘
```

## Column Layouts

### 1 Column Layout
```
┌─────────────────────────────────────────┐
│  [1] [2] [3] [4]  [Resetar]             │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │ ║ Section 1                      ▼│  │
│  │ ║ Content...                      │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ ║ Section 2                      ▼│  │
│  │ ║ Content...                      │  │
│  └───────────────────────────────────┘  │
│                                          │
│  ┌───────────────────────────────────┐  │
│  │ ║ Section 3                      ▼│  │
│  │ ║ Content...                      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘

Use case: Full-width content, forms, detailed views
```

### 2 Column Layout (Default)
```
┌─────────────────────────────────────────────────────┐
│  [1] [2] [3] [4]  [Resetar]                         │
├─────────────────────────────────────────────────────┤
│  ┌───────────────────┐  ┌───────────────────┐      │
│  │ ║ Section 1      ▼│  │ ║ Section 2      ▼│      │
│  │ ║ Content...      │  │ ║ Content...      │      │
│  └───────────────────┘  └───────────────────┘      │
│                                                      │
│  ┌───────────────────┐  ┌───────────────────┐      │
│  │ ║ Section 3      ▼│  │ ║ Section 4      ▼│      │
│  │ ║ Content...      │  │ ║ Content...      │      │
│  └───────────────────┘  └───────────────────┘      │
└─────────────────────────────────────────────────────┘

Use case: Balanced dashboard, side-by-side comparison
```

### 3 Column Layout
```
┌──────────────────────────────────────────────────────────────┐
│  [1] [2] [3] [4]  [Resetar]                                  │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ ║ Sec 1    ▼│  │ ║ Sec 2    ▼│  │ ║ Sec 3    ▼│         │
│  │ ║ Content   │  │ ║ Content   │  │ ║ Content   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ ║ Sec 4    ▼│  │ ║ Sec 5    ▼│  │ ║ Sec 6    ▼│         │
│  │ ║ Content   │  │ ║ Content   │  │ ║ Content   │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└──────────────────────────────────────────────────────────────┘

Use case: Multiple metrics, status cards, monitoring
```

### 4 Column Layout (Dense)
```
┌────────────────────────────────────────────────────────────────────┐
│  [1] [2] [3] [4]  [Resetar]                                        │
├────────────────────────────────────────────────────────────────────┤
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                   │
│  │║ S1   ▼│  │║ S2   ▼│  │║ S3   ▼│  │║ S4   ▼│                   │
│  │║ ...   │  │║ ...   │  │║ ...   │  │║ ...   │                   │
│  └────────┘  └────────┘  └────────┘  └────────┘                   │
│                                                                     │
│  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐                   │
│  │║ S5   ▼│  │║ S6   ▼│  │║ S7   ▼│  │║ S8   ▼│                   │
│  │║ ...   │  │║ ...   │  │║ ...   │  │║ ...   │                   │
│  └────────┘  └────────┘  └────────┘  └────────┘                   │
└────────────────────────────────────────────────────────────────────┘

Use case: Compact display, many small sections, KPIs
```

## Interaction Patterns

### 1. Dragging a Card

**Step 1: Hover over card**
```
┌─────────────────┐
│   Card Header  ▼│  ← No drag handle visible
│   Content...    │
└─────────────────┘

        ↓ Mouse enters card area

┌─────────────────┐
│║  Card Header  ▼│  ← Gray drag handle appears
│║  Content...    │
└─────────────────┘
```

**Step 2: Hover over drag handle**
```
┌─────────────────┐
│║  Card Header  ▼│  ← Cyan drag handle, cursor: grab
│║  Content...    │
└─────────────────┘
```

**Step 3: Click and drag**
```
┌─────────────────┐
│║  Card Header  ▼│  ← Opacity: 50%, cursor: grabbing
│║  Content...    │     Following cursor
└─────────────────┘
```

**Step 4: Drop in target column**
```
Column 1              Column 2
┌─────────────┐      ┌─────────────────┐
│║ Card A    ▼│      │ [Drop Zone]     │ ← Highlighted drop zone
└─────────────┘      │                 │
                     │                 │
                     └─────────────────┘

        ↓ Release mouse

Column 1              Column 2
┌─────────────┐      ┌─────────────────┐
│║ Card A    ▼│      │║ Card B        ▼│ ← Card moved to new position
└─────────────┘      │║ Content...     │
                     └─────────────────┘
```

### 2. Collapsing/Expanding Cards

**Expanded Card**
```
┌───────────────────────────────────┐
│ ║  Section Title              ▼   │  ← Click header to collapse
│ ║                                  │     ▼ = Expanded indicator
│ ║  ┌────────────────────────────┐ │
│ ║  │                            │ │
│ ║  │  Content visible           │ │
│ ║  │                            │ │
│ ║  └────────────────────────────┘ │
└───────────────────────────────────┘

        ↓ Click header

┌───────────────────────────────────┐
│ ║  Section Title              ▶   │  ← Collapsed state
└───────────────────────────────────┘     ▶ = Collapsed indicator
                                           Content hidden
```

**Collapsed Card**
```
┌───────────────────────────────────┐
│ ║  Section Title              ▶   │  ← Click to expand
└───────────────────────────────────┘

        ↓ Click header

┌───────────────────────────────────┐
│ ║  Section Title              ▼   │
│ ║                                  │
│ ║  ┌────────────────────────────┐ │
│ ║  │                            │ │
│ ║  │  Content visible           │ │
│ ║  │                            │ │
│ ║  └────────────────────────────┘ │
└───────────────────────────────────┘
```

### 3. Collapse All / Expand All

**Before "Recolher Tudo" (Collapse All)**
```
┌─────────────┐  ┌─────────────┐
│║ Card 1    ▼│  │║ Card 2    ▼│
│║ Content... │  │║ Content... │
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│║ Card 3    ▼│  │║ Card 4    ▼│
│║ Content... │  │║ Content... │
└─────────────┘  └─────────────┘

        ↓ Click "Recolher Tudo"

┌─────────────┐  ┌─────────────┐
│║ Card 1    ▶│  │║ Card 2    ▶│  ← All cards collapsed
└─────────────┘  └─────────────┘

┌─────────────┐  ┌─────────────┐
│║ Card 3    ▶│  │║ Card 4    ▶│
└─────────────┘  └─────────────┘
```

### 4. Reset Layout

**Custom Layout**
```
Column 1              Column 2              Column 3
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│║ Card C    ▼│      │║ Card A    ▼│      │║ Card B    ▼│
└─────────────┘      └─────────────┘      └─────────────┘

┌─────────────┐
│║ Card D    ▼│
└─────────────┘

        ↓ Click "Resetar"

Column 1              Column 2              Column 3
┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│║ Card A    ▼│      │║ Card B    ▼│      │║ Card C    ▼│
└─────────────┘      └─────────────┘      └─────────────┘

                     ┌─────────────┐
                     │║ Card D    ▼│
                     └─────────────┘

Default distribution restored
```

## Responsive Behavior

### Desktop (>1024px)
```
4 Columns Selected:
┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 1  │ │ 2  │ │ 3  │ │ 4  │  ← Respects user selection
└────┘ └────┘ └────┘ └────┘
```

### Tablet (768px - 1024px)
```
4 Columns Selected → Auto-adjusts to 2:
┌──────────┐ ┌──────────┐
│    1     │ │    2     │
└──────────┘ └──────────┘
┌──────────┐ ┌──────────┐
│    3     │ │    4     │  ← Maximum 2 columns on tablet
└──────────┘ └──────────┘

3 Columns Selected → Auto-adjusts to 2:
┌──────────┐ ┌──────────┐
│    1     │ │    2     │
└──────────┘ └──────────┘
┌──────────┐
│    3     │
└──────────┘
```

### Mobile (&lt;768px)
```
Any Columns Selected → Always 1:
┌────────────────────┐
│         1          │
└────────────────────┘
┌────────────────────┐
│         2          │  ← Always stacked on mobile
└────────────────────┘
┌────────────────────┐
│         3          │
└────────────────────┘
```

## Visual Feedback States

### Drop Zones

**Inactive Drop Zone**
```
┌─────────────────────┐
│                     │
│   Column Empty      │  ← Dashed border (gray)
│                     │
└─────────────────────┘
```

**Active Drop Zone (dragging over)**
```
┌─────────────────────┐
│                     │
│   Drop Here         │  ← Dashed border (cyan)
│                     │     Background highlight
└─────────────────────┘
```

**Drop Zone with Content**
```
┌─────────────────────┐
│ ║  Card 1         ▼ │
│ ║  Content...       │
└─────────────────────┘
┌─────────────────────┐  ← Insert position indicator
│ [Drop Here]         │     (appears between cards)
└─────────────────────┘
┌─────────────────────┐
│ ║  Card 2         ▼ │
│ ║  Content...       │
└─────────────────────┘
```

### Position Indicators

**During Drag**
```
Column 1              Column 2
┌─────────────┐
│║ Card A    ▼│      ┌─────────────────┐
└─────────────┘      │ [Position 1]    │ ← Insert indicator
                     └─────────────────┘
┌─────────────┐      ┌─────────────────┐
│║ Card B    ▼│      │║ Card C        ▼│
└─────────────┘      └─────────────────┘
                     ┌─────────────────┐
    ↑                │ [Position 2]    │ ← Insert indicator
Dragging Card D      └─────────────────┘
```

### Card States

**Normal State**
```
┌───────────────────┐
│ ║  Card Title   ▼ │  ← White bg (light mode)
│ ║                 │     Dark bg (dark mode)
│ ║  Content...     │
└───────────────────┘
```

**Hover State**
```
┌───────────────────┐
│ ║  Card Title   ▼ │  ← Drag handle visible (gray)
│ ║                 │     Subtle bg color change
│ ║  Content...     │
└───────────────────┘
```

**Drag Handle Hover**
```
┌───────────────────┐
│ ║  Card Title   ▼ │  ← Drag handle cyan + thicker
│ ║                 │     Cursor: grab
│ ║  Content...     │
└───────────────────┘
```

**Dragging State**
```
┌───────────────────┐
│ ║  Card Title   ▼ │  ← Opacity: 50%
│ ║                 │     Cursor: grabbing
│ ║  Content...     │     Pointer events: none
└───────────────────┘
```

**Collapsed State**
```
┌───────────────────┐
│ ║  Card Title   ▶ │  ← Chevron pointing right
└───────────────────┘     Content hidden
```

## Color Scheme

### Light Mode
```
Background:         White (#ffffff)
Card Background:    White (#ffffff)
Card Border:        Gray-200 (#e5e7eb)
Drag Handle:        Gray-300 (#d1d5db)
Drag Handle Hover:  Cyan-500 (#06b6d4)
Text:              Gray-900 (#111827)
Drop Zone Border:   Gray-300 (#d1d5db)
Drop Zone Active:   Cyan-500 (#06b6d4)
```

### Dark Mode
```
Background:         Gray-900 (#111827)
Card Background:    Gray-800 (#1f2937)
Card Border:        Gray-700 (#374151)
Drag Handle:        Gray-600 (#4b5563)
Drag Handle Hover:  Cyan-400 (#22d3ee)
Text:              White (#ffffff)
Drop Zone Border:   Gray-600 (#4b5563)
Drop Zone Active:   Cyan-400 (#22d3ee)
```

## Real-World Examples

### EscopoPage (Documentation Page)
```
Default: 2 Columns, 7 Sections

Column 1                    Column 2
┌─────────────────────┐    ┌─────────────────────┐
│ ║ Overview        ▼ │    │ ║ Objectives      ▼ │
│ ║ Project summary   │    │ ║ Key goals         │
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│ ║ Architecture    ▼ │    │ ║ Tech Stack      ▼ │
│ ║ System design     │    │ ║ Technologies      │
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│ ║ Systems         ▼ │    │ ║ Requirements    ▼ │
│ ║ Microservices     │    │ ║ Functional reqs   │
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐
│ ║ Constraints     ▼ │
│ ║ Limitations       │
└─────────────────────┘
```

### ConnectionsPage (Status Dashboard)
```
Default: 3 Columns, 5 Sections

Col 1                Col 2                Col 3
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│║ ProfitDLL ▼│    │║ WebSocket ▼│    │║ Services  ▼│
│║ Connected  │    │║ Active     │    │║ 5/5 Up    │
└─────────────┘    └─────────────┘    └─────────────┘

┌─────────────┐    ┌─────────────┐
│║ History   ▼│    │║ Network   ▼│
│║ Events     │    │║ Metrics    │
└─────────────┘    └─────────────┘
```

### SettingsPage (Configuration)
```
Default: 2 Columns, 7 Sections

Column 1                    Column 2
┌─────────────────────┐    ┌─────────────────────┐
│ ║ User Profile    ▼ │    │ ║ Notifications   ▼ │
│ ║ Name, email, 2FA  │    │ ║ Email, push alerts│
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│ ║ Appearance      ▼ │    │ ║ Language        ▼ │
│ ║ Theme, dark mode  │    │ ║ PT-BR, EN-US      │
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐    ┌─────────────────────┐
│ ║ Security        ▼ │    │ ║ Data Storage    ▼ │
│ ║ Password, session │    │ ║ Cache, backups    │
└─────────────────────┘    └─────────────────────┘

┌─────────────────────┐
│ ║ Performance     ▼ │
│ ║ API, rendering    │
└─────────────────────┘
```

## Keyboard Shortcuts (Future Enhancement)

```
Planned shortcuts:

Ctrl + 1-4:     Switch to 1-4 columns
Ctrl + R:       Reset layout
Ctrl + E:       Expand all cards
Ctrl + C:       Collapse all cards
Arrow Keys:     Navigate between cards
Space:          Toggle card collapse
Enter:          Focus card content
```

## Accessibility Features

```
✅ Implemented:
- Semantic HTML (header, section, main)
- ARIA labels for controls
- Keyboard navigation (Tab, Enter, Space)
- Focus indicators
- Screen reader support

🔄 In Progress:
- Keyboard drag-and-drop (Arrow keys)
- Announce state changes (ARIA live regions)
- High contrast mode support
```

## Related Documentation

- [Customizable Layout System](../features/customizable-layout.md) - Feature documentation
- [Implementation Guide](./implementing-customizable-pages.md) - Developer guide
- [Frontend README](../README.md) - Architecture overview
- [CollapsibleCard Standardization](./collapsible-card-standardization.md) - Component usage reference

## Questions?

For visual design questions or UX improvements, open an issue with the `frontend:ux` label.
