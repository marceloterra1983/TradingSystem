# Frontend Component Library

> **UI Components catalog** - Radix UI + Tailwind CSS + TypeScript
> **Last Updated:** 2025-11-05

## Component Categories

### Base Components (Radix UI)

| Component | Location | Props | Usage |
|-----------|----------|-------|-------|
| Button | `components/ui/button.tsx` | variant, size, disabled | `<Button variant="default">Click</Button>` |
| Dialog | `components/ui/dialog.tsx` | open, onOpenChange | `<Dialog><DialogContent>...</DialogContent></Dialog>` |
| Select | `components/ui/select.tsx` | value, onValueChange | `<Select><SelectTrigger>...</SelectTrigger></Select>` |
| Checkbox | `components/ui/checkbox.tsx` | checked, onCheckedChange | `<Checkbox checked={true} />` |
| Tabs | `components/ui/tabs.tsx` | value, onValueChange | `<Tabs><TabsList>...</TabsList></Tabs>` |
| Tooltip | `components/ui/tooltip.tsx` | content | `<Tooltip content="Help"><Button/></Tooltip>` |
| ScrollArea | `components/ui/scroll-area.tsx` | className | `<ScrollArea className="h-[400px]">...</ScrollArea>` |

### Button Component

**File:** `frontend/dashboard/src/components/ui/button.tsx`

**Variants:**
- `default` - Primary button (blue)
- `destructive` - Danger button (red)
- `outline` - Outlined button
- `ghost` - Transparent button
- `link` - Link style button

**Sizes:**
- `default` - Normal size
- `sm` - Small
- `lg` - Large
- `icon` - Icon only (square)

**Example:**
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default" size="lg" onClick={handleClick}>
  Save Changes
</Button>

<Button variant="destructive" size="sm">
  Delete
</Button>

<Button variant="ghost" size="icon">
  <TrashIcon />
</Button>
```

### Dialog Component

**File:** `frontend/dashboard/src/components/ui/dialog.tsx`

**Structure:**
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    <div>Content here</div>
    <DialogFooter>
      <Button onClick={() => setIsOpen(false)}>Close</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Select Component

**File:** `frontend/dashboard/src/components/ui/select.tsx`

**Example:**
```tsx
<Select value={value} onValueChange={setValue}>
  <SelectTrigger className="w-[200px]">
    <SelectValue placeholder="Select option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

## Custom Components

### WorkspaceCard

**File:** `frontend/dashboard/src/components/workspace/WorkspaceCard.tsx`

**Props:**
```typescript
interface WorkspaceCardProps {
  item: WorkspaceItem;
  onEdit: (item: WorkspaceItem) => void;
  onDelete: (id: string) => void;
}
```

**Example:**
```tsx
<WorkspaceCard
  item={item}
  onEdit={(item) => setEditItem(item)}
  onDelete={(id) => deleteItem(id)}
/>
```

### SearchBar

**File:** `frontend/dashboard/src/components/SearchBar.tsx`

**Props:**
```typescript
interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onSearch?: () => void;
}
```

### LoadingSpinner

**File:** `frontend/dashboard/src/components/LoadingSpinner.tsx`

**Variants:**
- `default` - Standard spinner
- `small` - Small spinner (16px)
- `large` - Large spinner (48px)

```tsx
<LoadingSpinner size="default" />
```

## Design Tokens

### Colors

```typescript
const colors = {
  primary: '#1e40af',      // Blue-700
  secondary: '#64748b',    // Slate-500
  accent: '#f59e0b',       // Amber-500
  success: '#10b981',      // Emerald-500
  warning: '#f59e0b',      // Amber-500
  error: '#ef4444',        // Red-500
};
```

### Typography

```typescript
const fontSizes = {
  xs: '0.75rem',    // 12px
  sm: '0.875rem',   // 14px
  base: '1rem',     // 16px
  lg: '1.125rem',   // 18px
  xl: '1.25rem',    // 20px
  '2xl': '1.5rem',  // 24px
  '3xl': '1.875rem', // 30px
  '4xl': '2.25rem', // 36px
};
```

### Spacing

```typescript
const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
};
```

## Accessibility

All components follow **WCAG 2.1 Level AA** guidelines:

- ✅ Keyboard navigation
- ✅ Screen reader support (ARIA labels)
- ✅ Focus indicators
- ✅ Color contrast (4.5:1 minimum)
- ✅ Touch targets (44x44px minimum)

## Testing Components

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/ui/button';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

## Resources

- **Radix UI Docs:** https://www.radix-ui.com/primitives/docs/overview/introduction
- **Tailwind CSS Docs:** https://tailwindcss.com/docs
- **Component Source:** [frontend/dashboard/src/components/ui/](../../frontend/dashboard/src/components/ui/)
