---
title: "ADR-0002: Use shadcn/ui + Radix UI for Design System"
sidebar_position: 20
tags: [frontend, architecture, ui, design-system, shadcn, radix, adr]
domain: frontend
type: adr
summary: Decision to adopt shadcn/ui and Radix UI as the foundation for the Dashboard design system
status: active
last_review: 2025-10-17
---

# ADR-0002: Use shadcn/ui + Radix UI for Design System

## Status
**Accepted** - 2025-10-11

## Context

The TradingSystem Dashboard requires a comprehensive UI component library with:
- **Accessibility**: WCAG 2.1 AA compliance for professional trading applications
- **Customization**: Full control over styling and behavior
- **Type Safety**: Complete TypeScript support
- **Dark Mode**: First-class dark mode support
- **Performance**: Minimal bundle size impact
- **Consistency**: Unified design language across the application

### Requirements
1. **Accessibility First**: Keyboard navigation, ARIA attributes, screen reader support
2. **Headless Architecture**: Separation of behavior and styling
3. **Tailwind CSS Integration**: Seamless styling with utility classes
4. **Copy-Paste Philosophy**: Own the code, no npm dependency hell
5. **Rich Component Set**: Dialogs, dropdowns, tooltips, popovers, etc.
6. **Active Maintenance**: Regular updates, bug fixes, new components

### Options Considered

| Library | Architecture | Bundle Impact | Customization | Accessibility | TypeScript | License |
|---------|--------------|---------------|---------------|---------------|------------|---------|
| **shadcn/ui + Radix** | Headless | Minimal (tree-shakeable) | Full | Excellent | Excellent | MIT |
| Material UI | Opinionated | Large (~100 KB) | Limited | Good | Good | MIT |
| Ant Design | Opinionated | Large (~200 KB) | Limited | Good | Good | MIT |
| Chakra UI | Opinionated | Medium (~50 KB) | Medium | Excellent | Good | MIT |
| Headless UI | Headless | Minimal | Full | Excellent | Good | MIT |
| Mantine | Opinionated | Medium (~80 KB) | Medium | Good | Excellent | MIT |

## Decision

We will use **shadcn/ui** (built on **Radix UI**) as the foundation for our design system.

### Rationale

1. **Copy-Paste Philosophy**
   - Components live in your codebase (`src/components/ui/`)
   - Full ownership and customization
   - No breaking changes from npm updates
   - Easy to modify for specific use cases

2. **Headless Architecture**
   - Radix UI provides unstyled, accessible primitives
   - shadcn/ui adds beautiful Tailwind CSS styling
   - Complete separation of behavior and appearance
   - Flexibility to match any design language

3. **Accessibility Built-In**
   - Radix UI is WCAG 2.1 AA compliant
   - Keyboard navigation works out of the box
   - Proper ARIA attributes and roles
   - Focus management and screen reader support

4. **Minimal Bundle Impact**
   - Tree-shakeable: Only import what you use
   - No massive runtime library
   - Components are individually importable
   - ~2-5 KB per component (vs. 100+ KB for full UI libraries)

5. **First-Class Dark Mode**
   - Dark mode support via CSS variables
   - Smooth theme transitions
   - No JavaScript theme switching overhead
   - Respects system preferences

6. **Excellent TypeScript Support**
   - Radix UI is written in TypeScript
   - Full type inference for props
   - Autocomplete and IntelliSense in IDEs
   - Catches errors at compile time

7. **Tailwind CSS Integration**
   - Perfect match for Tailwind workflows
   - Uses utility classes for styling
   - Consistent with our existing styling approach
   - No CSS-in-JS runtime overhead

8. **Active Ecosystem**
   - shadcn/ui: 50K+ GitHub stars, active development
   - Radix UI: Backed by Modulz (Stitches creators)
   - Regular component additions
   - Large community and resources

## Implementation

### Installation & Setup
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add components as needed
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add dropdown-menu
```

### Component Structure
```
src/components/ui/
├── button.tsx           # Button primitive
├── card.tsx             # Card layout component
├── dialog.tsx           # Modal dialog (Radix Dialog)
├── dropdown-menu.tsx    # Dropdown (Radix DropdownMenu)
├── input.tsx            # Text input
├── label.tsx            # Form label
├── select.tsx           # Select dropdown (Radix Select)
├── table.tsx            # Table primitives
├── textarea.tsx         # Textarea input
├── badge.tsx            # Status badge
└── collapsible-card.tsx # Custom composite component
```

### Example Component Usage
```typescript
// components/pages/ConnectionsPage.tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function BotFormDialog() {
  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar Bot</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="bot-username">Username</Label>
            <Input
              id="bot-username"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <Button onClick={handleSubmit}>Salvar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Custom Components
We extend shadcn/ui with custom composite components:
```typescript
// components/ui/collapsible-card.tsx
import { Card, CardHeader, CardContent } from './card';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@radix-ui/react-collapsible';

export function CollapsibleCard({ children, cardId }) {
  return (
    <Collapsible>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader>{/* ... */}</CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
```

### Design Tokens (Tailwind CSS Variables)
```css
/* src/index.css */
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 221.2 83.2% 53.3%;
    --primary-foreground: 210 40% 98%;
    /* ... */
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 217.2 91.2% 59.8%;
    --primary-foreground: 222.2 47.4% 11.2%;
    /* ... */
  }
}
```

## Consequences

### Positive
✅ **Full Control**: Own the component code, modify as needed
✅ **No Dependency Hell**: No npm package updates to worry about
✅ **Tiny Bundle Size**: Tree-shakeable, minimal runtime overhead
✅ **Accessibility**: WCAG 2.1 AA compliant out of the box
✅ **TypeScript Excellence**: Full type safety and inference
✅ **Dark Mode**: Built-in, CSS variable-based theming
✅ **Tailwind Native**: Perfect integration with utility classes
✅ **Active Community**: Large ecosystem, frequent updates

### Negative
⚠️ **Manual Updates**: Need to manually update components (copy-paste new versions)
⚠️ **Learning Curve**: Requires understanding Radix UI primitives
⚠️ **No Official Support**: Community-driven, not backed by a company
⚠️ **Migration Friction**: Harder to switch to another UI library later

### Mitigation Strategies
- **Update Script**: Create script to sync component updates from shadcn/ui
- **Documentation**: Document component usage patterns in design system guide
- **Component Library**: Build Storybook or similar showcase for design system
- **Testing**: Unit test custom components and composite patterns

## Alternatives Considered

### Material UI (MUI)
**Pros**: Battle-tested, comprehensive components, enterprise support
**Cons**: 100 KB+ bundle, opinionated design, limited customization
**Verdict**: **Rejected** - Bundle size too large, design language too opinionated

### Ant Design
**Pros**: Rich component set, popular in enterprise
**Cons**: 200 KB+ bundle, Chinese-centric design, heavy customization overhead
**Verdict**: **Rejected** - Bundle size prohibitive, design doesn't match requirements

### Chakra UI
**Pros**: Excellent accessibility, good TypeScript support
**Cons**: CSS-in-JS runtime overhead, opinionated theming system
**Verdict**: **Rejected** - Prefer static Tailwind over runtime CSS-in-JS

### Headless UI (by Tailwind Labs)
**Pros**: Minimal bundle, Tailwind-native, simple API
**Cons**: Limited component set, less mature than Radix UI
**Verdict**: **Considered** - Good alternative but Radix UI has richer primitives

## Related Decisions
- Tailwind CSS 3.4 for utility-first styling
- Lucide React for icon library (replaces Hero Icons)
- Dark mode strategy (system preference + manual toggle)

## References
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Documentation](https://www.radix-ui.com/)
- [Tailwind CSS Documentation](https://tailwindcss.com/)
- [Web Accessibility Guidelines (WCAG 2.1)](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Decision Date**: 2025-10-11
**Decision Maker**: Frontend Team
**Implementation Status**: ✅ Implemented (Dashboard uses shadcn/ui extensively)
**Review Date**: 2025-04-11 (6 months)
