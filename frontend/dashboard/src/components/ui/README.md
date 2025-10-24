# UI Components - Action Buttons

## Overview

Standardized action button components for consistent UX across the TradingSystem dashboard.

## Design Standards

All action buttons follow these standards:

- **Size**: `h-10 w-10` (40x40px)
- **Icon Size**: `h-5 w-5` (20x20px)
- **Padding**: `p-0` (no padding, icon centered)
- **Style**: Ghost variant with context-specific hover effects

## Components

### ActionButtons (Group Component)

Use this for action columns in tables where multiple actions are needed.

```tsx
import { ActionButtons } from '../ui/action-buttons';

<ActionButtons
  onView={() => handleView(item)}
  onEdit={() => handleEdit(item)}
  onDelete={() => handleDelete(item)}
  onCheck={() => handleCheck(item)}
  viewTooltip="Ver descrição"
  editTooltip="Editar item"
  deleteTooltip="Excluir item"
  checkTooltip="Verificar conexão"
/>
```

**Props:**
- `onView?` - Eye icon (gray) - View/preview action
- `onEdit?` - Edit2 icon (gray) - Edit action
- `onDelete?` - Trash2 icon (red) - Delete action
- `onCheck?` - Check icon (green) - Verify/check action
- `onUncheck?` - X icon (gray) - Uncheck/clear action
- `*Tooltip` - Custom tooltip text for each button
- `editDisabled?` - Disable edit button
- `deleteDisabled?` - Disable delete button
- `className?` - Additional CSS classes

### Individual Button Components

Use these for standalone buttons (e.g., card headers, toolbars).

#### AddButton

Primary action button for creating new items.

```tsx
import { AddButton } from '../ui/action-buttons';

<AddButton
  onClick={handleCreate}
  tooltip="Adicionar Bot"
/>
```

**Variant**: `default` (primary color)
**Icon**: Plus (➕)

#### ViewButton

View or preview existing item.

```tsx
import { ViewButton } from '../ui/action-buttons';

<ViewButton
  onClick={handleView}
  tooltip="Ver descrição"
/>
```

**Variant**: `ghost`
**Icon**: Eye (👁)

#### EditButton

Edit existing item.

```tsx
import { EditButton } from '../ui/action-buttons';

<EditButton
  onClick={handleEdit}
  tooltip="Editar"
/>
```

**Variant**: `ghost`
**Icon**: Edit2 (✏️)

#### DeleteButton

Delete item (destructive action).

```tsx
import { DeleteButton } from '../ui/action-buttons';

<DeleteButton
  onClick={handleDelete}
  tooltip="Excluir"
/>
```

**Variant**: `ghost` with red hover
**Icon**: Trash2 (🗑️)

#### CheckButton

Verify, check, or confirm action.

```tsx
import { CheckButton } from '../ui/action-buttons';

<CheckButton
  onClick={handleCheck}
  tooltip="Verificar conexão"
/>
```

**Variant**: `ghost` with green hover
**Icon**: Check (✓)

#### UncheckButton

Uncheck or clear selection.

```tsx
import { UncheckButton } from '../ui/action-buttons';

<UncheckButton
  onClick={handleUncheck}
  tooltip="Desmarcar"
/>
```

**Variant**: `ghost`
**Icon**: X (✕)

## Usage Examples

### Table Actions Column

```tsx
<table>
  <thead>
    <tr>
      <th>Name</th>
      <th>Status</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    {items.map(item => (
      <tr key={item.id}>
        <td>{item.name}</td>
        <td>{item.status}</td>
        <td>
          <ActionButtons
            onView={item.description ? () => showPreview(item) : undefined}
            onEdit={() => editItem(item)}
            onDelete={() => deleteItem(item)}
            viewTooltip="Ver descrição"
            editTooltip="Editar item"
            deleteTooltip="Excluir item"
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

### Card Header with Add Button

```tsx
<CardHeader>
  <div className="flex items-start justify-between gap-4">
    <div>
      <CardTitle>Bots do Telegram</CardTitle>
      <CardDescription>Manage your Telegram bots</CardDescription>
    </div>
    <AddButton onClick={openCreateDialog} tooltip="Adicionar Bot" />
  </div>
</CardHeader>
```

### Conditional Button Display

```tsx
<ActionButtons
  // Only show view button if item has description
  onView={item.description ? () => viewDescription(item) : undefined}
  onEdit={() => editItem(item)}
  onDelete={!item.isPermanent ? () => deleteItem(item) : undefined}
  editDisabled={item.isReadOnly}
  deleteDisabled={item.isPermanent}
/>
```

## Accessibility

All buttons include:
- `title` attribute for tooltips (shows on hover)
- Proper `aria-label` (inherited from title)
- Keyboard accessible (Tab navigation)
- `disabled` state support

## Implementation Reference

**File**: [action-buttons.tsx](./action-buttons.tsx)

**Used in**:
- [ConnectionsPage.tsx](../pages/ConnectionsPage.tsx) - Telegram bots and channels management
- More pages to be standardized...

## Migration Guide

### Before (Old Pattern)
```tsx
<Button size="sm" variant="outline" onClick={handleEdit}>
  Editar
</Button>
<Button size="sm" variant="destructive" onClick={handleDelete}>
  Excluir
</Button>
```

### After (Standardized)
```tsx
<ActionButtons
  onEdit={handleEdit}
  onDelete={handleDelete}
  editTooltip="Editar"
  deleteTooltip="Excluir"
/>
```

## Benefits

✅ **Consistency** - Same look and feel across all pages
✅ **Compact** - Icon-only design saves space in tables
✅ **Accessible** - Tooltips and keyboard navigation
✅ **Maintainable** - Single source of truth for button styles
✅ **Flexible** - Group or individual button usage
✅ **Type-safe** - Full TypeScript support
