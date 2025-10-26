---
title: Action Button Standardization Guide
sidebar_position: 20
tags: [frontend, ui, buttons, standardization, guide]
domain: frontend
type: guide
summary: Standardization guide for action buttons including styles, variants, and usage patterns
status: active
last_review: "2025-10-17"
---

# Action Button Standardization Guide

**Date:** 2025-10-11
**Version:** 1.2.0
**Status:** ✅ Complete
**Author:** Claude Code

---

## Overview

This guide documents the standardization of action buttons (View, Edit, Delete, Check, Uncheck) across all dashboard pages to ensure consistent UX, accessibility, and maintainability.

## Motivation

Prior to standardization, action buttons had inconsistent implementations:
- ❌ **Varied sizes** - Some buttons were "sm", others had custom sizes
- ❌ **Inconsistent colors** - Delete buttons had different red shades
- ❌ **Mixed patterns** - Icon buttons vs text buttons vs icon+text
- ❌ **No tooltips** - Users couldn't understand button purpose on hover
- ❌ **Accessibility issues** - Missing ARIA attributes, poor keyboard nav

## Solution

Created reusable `ActionButtons` components with:
- ✅ **Consistent sizing** - All buttons 9x9 (h-9 w-9), icons 4x4 (h-4 w-4)
- ✅ **Standard colors** - Gray for view/edit, red for delete, green for check
- ✅ **Icon-only design** - Clean, compact, modern appearance
- ✅ **Tooltips** - Every button has descriptive tooltip
- ✅ **Accessibility** - Proper ARIA from shadcn/ui Button component
- ✅ **Dark mode** - Works seamlessly in both themes

---

## Component API

### ActionButtons (Group Component)

Use when you need multiple action buttons together:

```tsx
import { ActionButtons } from '../ui/action-buttons';

<ActionButtons
  onView={() => handleView()}
  onEdit={() => handleEdit()}
  onDelete={() => handleDelete()}
  onCheck={() => handleCheck()}
  onUncheck={() => handleUncheck()}
  viewTooltip="Visualizar"
  editTooltip="Editar"
  deleteTooltip="Deletar"
  checkTooltip="Verificar"
  uncheckTooltip="Desmarcar"
  editDisabled={false}
  deleteDisabled={false}
/>
```

**Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onView` | `() => void` | No | - | View button click handler |
| `onEdit` | `() => void` | No | - | Edit button click handler |
| `onDelete` | `() => void` | No | - | Delete button click handler |
| `onCheck` | `() => void` | No | - | Check button click handler |
| `onUncheck` | `() => void` | No | - | Uncheck button click handler |
| `viewTooltip` | `string` | No | 'Visualizar' | View button tooltip |
| `editTooltip` | `string` | No | 'Editar' | Edit button tooltip |
| `deleteTooltip` | `string` | No | 'Deletar' | Delete button tooltip |
| `checkTooltip` | `string` | No | 'Verificar' | Check button tooltip |
| `uncheckTooltip` | `string` | No | 'Desmarcar' | Uncheck button tooltip |
| `editDisabled` | `boolean` | No | `false` | Disable edit button |
| `deleteDisabled` | `boolean` | No | `false` | Disable delete button |
| `className` | `string` | No | - | Additional CSS classes |

**Behavior:**
- Only buttons with defined handlers are rendered
- Buttons appear in order: View, Edit, Delete, Check, Uncheck
- Spacing: `gap-1` between buttons

---

### Individual Button Components

Use when you need a single action button:

#### ViewButton
```tsx
import { ViewButton } from '../ui/action-buttons';

<ViewButton
  onClick={() => handleView()}
  tooltip="Ver detalhes"
  disabled={false}
/>
```

#### EditButton
```tsx
import { EditButton } from '../ui/action-buttons';

<EditButton
  onClick={() => handleEdit()}
  tooltip="Editar registro"
  disabled={loading}
/>
```

#### DeleteButton
```tsx
import { DeleteButton } from '../ui/action-buttons';

<DeleteButton
  onClick={() => handleDelete()}
  tooltip="Excluir permanentemente"
  disabled={loading}
/>
```

#### CheckButton
```tsx
import { CheckButton } from '../ui/action-buttons';

<CheckButton
  onClick={() => handleVerify()}
  tooltip="Verificar conexão"
/>
```

#### UncheckButton
```tsx
import { UncheckButton } from '../ui/action-buttons';

<UncheckButton
  onClick={() => handleDeactivate()}
  tooltip="Desativar"
/>
```

**Individual Button Props:**

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onClick` | `() => void` | Yes | - | Button click handler |
| `tooltip` | `string` | No | Component-specific | Tooltip text |
| `disabled` | `boolean` | No | `false` | Disable button |
| `className` | `string` | No | - | Additional CSS classes |

---

## Design Specifications

### Button Dimensions
- **Size**: `h-9 w-9` (36x36px)
- **Padding**: `p-0` (icon centered)
- **Icon Size**: `h-4 w-4` (16x16px)
- **Gap**: `gap-1` (4px between buttons in group)

### Colors & Hover States

| Button | Icon | Hover Background | Text/Icon Color |
|--------|------|------------------|-----------------|
| **View** | `Eye` | `hover:bg-gray-100` / `dark:hover:bg-gray-800` | `text-gray-600` / `dark:text-gray-400` |
| **Edit** | `Edit2` | `hover:bg-gray-100` / `dark:hover:bg-gray-800` | `text-gray-600` / `dark:text-gray-400` |
| **Delete** | `Trash2` | `hover:bg-red-50` / `dark:hover:bg-red-950` | `text-red-600 hover:text-red-700` |
| **Check** | `Check` | `hover:bg-green-50` / `dark:hover:bg-green-950` | `text-green-600 hover:text-green-700` |
| **Uncheck** | `X` | `hover:bg-gray-100` / `dark:hover:bg-gray-800` | `text-gray-600` |

### Accessibility
- **ARIA**: Inherited from shadcn/ui Button component
- **Keyboard**: Tab navigation, Enter/Space activation
- **Tooltips**: Via `title` attribute (future: use Tooltip component)
- **Focus**: Visible focus ring via Tailwind defaults

---

## Pages Updated

### 1. BancoIdeiasPage ✅

**File:** `frontend/dashboard/src/components/pages/BancoIdeiasPage.tsx`

**Changes:**
- Created `IdeaActions` component using `ActionButtons`
- Refactored dialog components to controlled pattern (open/onOpenChange)
- View, Edit, Delete buttons now use standardized components
- Edit/Delete disabled when using fallback data

**Before:**
```tsx
<Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Visualizar">
  <Eye className="h-5 w-5" />
</Button>
<Button variant="ghost" size="sm" className="h-9 w-9 p-0" title="Editar">
  <Edit2 className="h-5 w-5" />
</Button>
<Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-600">
  <Trash2 className="h-5 w-5" />
</Button>
```

**After:**
```tsx
<ActionButtons
  onView={() => setShowView(true)}
  onEdit={() => setShowEdit(true)}
  onDelete={() => setShowDelete(true)}
  editDisabled={usingFallbackData}
  deleteDisabled={usingFallbackData}
/>
```

**Benefits:**
- 3 inline button definitions → 1 clean ActionButtons component
- Consistent sizing and colors
- Proper disabled state handling
- Cleaner separation of concerns

---

### 2. ConnectionsPage ✅

**File:** `frontend/dashboard/src/components/pages/ConnectionsPage.tsx`

**Changes:**
- Updated bot table actions to use `ActionButtons` (Edit, Delete, Check)
- Replaced description view buttons with `ViewButton`
- Channel table description buttons updated to `ViewButton`

**Telegram Bots Table - Before:**
```tsx
<div className="flex flex-wrap gap-2">
  <Button size="sm" variant="outline" onClick={() => openEdit(bot)}>
    Editar
  </Button>
  <Button size="sm" variant="destructive" onClick={() => handleDelete(bot.localId)}>
    Excluir
  </Button>
  <Button size="sm" variant="ghost" onClick={() => handleCheck(bot.localId)}>
    Verificar
  </Button>
</div>
```

**Telegram Bots Table - After:**
```tsx
<ActionButtons
  onEdit={() => openEdit(bot)}
  onDelete={() => handleDelete(bot.localId)}
  onCheck={() => handleCheck(bot.localId)}
  editTooltip="Editar bot"
  deleteTooltip="Excluir bot"
  checkTooltip="Verificar conexão"
/>
```

**Description View - Before:**
```tsx
<Button size="sm" variant="ghost" onClick={() => setDescriptionPreview({...})}>
  <Eye className="h-4 w-4" />
</Button>
```

**Description View - After:**
```tsx
<ViewButton
  onClick={() => setDescriptionPreview({...})}
  tooltip="Ver descrição"
/>
```

**Benefits:**
- 3 text buttons → 3 icon buttons (more compact)
- Check button now has proper green hover state
- Description view buttons standardized across bot and channel tables
- Consistent spacing (no `flex-wrap` needed)

---

## Migration Checklist

When converting a page to use standardized action buttons:

### Step 1: Import Components
```tsx
import { ActionButtons, ViewButton, EditButton, DeleteButton, CheckButton } from '../ui/action-buttons';
```

### Step 2: Identify Existing Buttons
- Find all `<Button>` components with icons: `Eye`, `Edit2`, `Trash2`, `Check`, `X`
- Note their click handlers and conditions

### Step 3: Replace with Standard Components

**For multiple buttons together:**
```tsx
// Old
<div className="flex gap-2">
  <Button onClick={handleEdit}>Edit</Button>
  <Button onClick={handleDelete}>Delete</Button>
</div>

// New
<ActionButtons
  onEdit={handleEdit}
  onDelete={handleDelete}
/>
```

**For single buttons:**
```tsx
// Old
<Button variant="ghost" onClick={handleView}>
  <Eye className="h-4 w-4" />
</Button>

// New
<ViewButton onClick={handleView} />
```

### Step 4: Add Tooltips
```tsx
<ActionButtons
  onEdit={handleEdit}
  onDelete={handleDelete}
  editTooltip="Editar registro"
  deleteTooltip="Excluir permanentemente"
/>
```

### Step 5: Handle Disabled States
```tsx
<ActionButtons
  onEdit={handleEdit}
  onDelete={handleDelete}
  editDisabled={isLoading || readOnly}
  deleteDisabled={isLoading || hasReferences}
/>
```

### Step 6: Test
- ✅ Click each button - correct handler fires
- ✅ Hover - correct tooltip appears
- ✅ Disabled states work properly
- ✅ Keyboard navigation (Tab, Enter, Space)
- ✅ Dark mode - buttons look correct

---

## Common Patterns

### Pattern 1: CRUD Table Actions
```tsx
<table>
  <tbody>
    {items.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>
          <ActionButtons
            onView={() => handleView(item)}
            onEdit={() => handleEdit(item)}
            onDelete={() => handleDelete(item.id)}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Pattern 2: Card Grid Actions
```tsx
<div className="grid grid-cols-3 gap-4">
  {items.map(item => (
    <Card key={item.id}>
      <CardHeader>{item.title}</CardHeader>
      <CardContent>{item.description}</CardContent>
      <CardFooter className="flex justify-end">
        <ActionButtons
          onEdit={() => handleEdit(item)}
          onDelete={() => handleDelete(item.id)}
          editDisabled={item.status === 'locked'}
        />
      </CardFooter>
    </Card>
  ))}
</div>
```

### Pattern 3: Single Action with Dialog
```tsx
function ItemCard({ item }) {
  const [showView, setShowView] = useState(false);

  return (
    <>
      <Card>
        <CardContent>
          {item.description}
          <ViewButton onClick={() => setShowView(true)} />
        </CardContent>
      </Card>

      {showView && (
        <ViewDialog item={item} open={showView} onOpenChange={setShowView} />
      )}
    </>
  );
}
```

### Pattern 4: Conditional Actions
```tsx
<ActionButtons
  onView={handleView}
  onEdit={canEdit ? handleEdit : undefined}  // Only show if canEdit
  onDelete={canDelete ? handleDelete : undefined}  // Only show if canDelete
  onCheck={needsVerification ? handleCheck : undefined}
/>
```

### Pattern 5: View-Only Description
```tsx
<td>
  {item.description ? (
    <ViewButton
      onClick={() => showDescriptionModal(item)}
      tooltip="Ver descrição completa"
    />
  ) : (
    <span className="text-xs text-gray-400">—</span>
  )}
</td>
```

---

## Troubleshooting

### Issue: Buttons too large/small
**Cause:** Custom `size` or `className` overriding defaults
**Solution:** Remove `size` prop, use standard `h-9 w-9`

### Issue: Wrong hover color
**Cause:** Custom `className` or `variant` prop
**Solution:** Remove overrides, let ActionButtons handle colors

### Issue: Tooltip not showing
**Cause:** Missing `tooltip` prop or browser tooltip disabled
**Solution:** Add `tooltip` prop with descriptive text

### Issue: Icon size inconsistent
**Cause:** Icon size not specified or wrong size
**Solution:** All icons should be `h-4 w-4`

### Issue: Buttons not in correct order
**Cause:** Passing handlers in wrong order
**Solution:** ActionButtons always renders in order: View, Edit, Delete, Check, Uncheck

---

## Future Enhancements

### Planned for v1.3.0
- [ ] Replace `title` tooltips with shadcn/ui Tooltip component
- [ ] Add keyboard shortcuts (e.g., `e` for Edit, `Del` for Delete)
- [ ] Add confirmation dialogs for Delete button
- [ ] Add loading states (spinner icon when action in progress)
- [ ] Add success/error animations

### Nice-to-Have
- [ ] Batch action buttons (select multiple, delete all)
- [ ] Contextual menu on right-click
- [ ] Action history (undo/redo)
- [ ] Custom icon support
- [ ] Button grouping with dropdown (More actions...)

---

## Related Documentation

- [CollapsibleCard Standardization](./collapsible-card-standardization.md)
- [shadcn/ui Button Component](https://ui.shadcn.com/docs/components/button)
- [Lucide Icons](https://lucide.dev/)
- [Tailwind Dark Mode](https://tailwindcss.com/docs/dark-mode)

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-10-11 | 1.2.0 | Initial standardization - 2 pages, 8+ action button groups |

---

## Approval

**Status:** ✅ Approved & Deployed
**Build:** ✅ Successful (TypeScript + Vite)
**Tests:** ✅ Manual testing passed
**Stakeholder:** Marcelo Terra

---

**Questions or issues?** Open a GitHub issue or contact the frontend team.
