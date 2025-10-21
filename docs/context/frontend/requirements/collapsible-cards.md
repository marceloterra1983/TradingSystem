---
title: Collapsible Cards Requirements
sidebar_position: 10
tags: [frontend, requirements, ui, cards, collapsible]
domain: frontend
type: reference
summary: Requirements specification for collapsible card component including features and acceptance criteria
status: active
last_review: 2025-10-17
---

# 🚨 CRITICAL: Collapsible Cards Requirement

## Mandatory Requirement for All Pages

**ALL pages using `CustomizablePageLayout` MUST use `CollapsibleCard` for EVERY section.**

This is **NOT optional** - it is required for the system to function properly.

## ✅ What This Means

Every section in your page must be wrapped in a `CollapsibleCard`:

```tsx
// ✅ CORRECT
const section = {
  id: 'my-section',
  content: (
    <CollapsibleCard
      cardId="page-my-section"
      title="Section Title"
      icon={<Icon className="w-5 h-5 text-color-500" />}
      defaultCollapsed={false}
    >
      {/* Your content here */}
    </CollapsibleCard>
  ),
};
```

## ❌ What NOT to Do

```tsx
// ❌ WRONG - Plain Card
const section = {
  id: 'my-section',
  content: (
    <Card>
      <CardHeader>Title</CardHeader>
      <CardContent>Content</CardContent>
    </Card>
  ),
};

// ❌ WRONG - Plain div
const section = {
  id: 'my-section',
  content: <div>Content</div>,
};

// ❌ WRONG - Direct links
const section = {
  id: 'my-section',
  content: <a href="...">Link</a>,
};
```

## Why This Is Required

Without `CollapsibleCard`:
- ❌ Drag-and-drop will NOT work
- ❌ Collapse/Expand All will NOT work
- ❌ State persistence will NOT work
- ❌ User experience will be broken
- ❌ Your PR will be REJECTED

## How to Implement

1. **Import the component:**
   ```tsx
   import { CollapsibleCard } from '../ui/collapsible-card';
   ```

2. **Wrap ALL content in CollapsibleCard:**
   ```tsx
   <CollapsibleCard
     cardId="unique-id"           // REQUIRED: Unique per page
     title="Section Title"        // Optional
     icon={<IconComponent />}     // Optional
     defaultCollapsed={false}     // Optional (default: false)
   >
     {/* Your content */}
   </CollapsibleCard>
   ```

3. **Use in sections array:**
   ```tsx
   const sections = [
     {
       id: 'section-1',
       content: <CollapsibleCard ...>...</CollapsibleCard>,
     },
     {
       id: 'section-2',
       content: <CollapsibleCard ...>...</CollapsibleCard>,
     },
   ];
   ```

4. **Pass to CustomizablePageLayout:**
   ```tsx
   <CustomizablePageLayout
     pageId="my-page"
     title="My Page"
     sections={sections}
     defaultColumns={2}
   />
   ```

## Verification Checklist

Before creating a PR, verify:
- [ ] All sections use `CollapsibleCard`
- [ ] Every `CollapsibleCard` has unique `cardId`
- [ ] No plain `<Card>`, `<div>`, or direct content
- [ ] Collapse/Expand All button works
- [ ] Drag-and-drop works
- [ ] State persists on page reload

## Reference Examples

✅ **Good examples to follow:**
- [Ports Page Feature](../features/feature-ports-page.md) - 4 sections, all with CollapsibleCard
- [Escopo Page Feature](../features/feature-idea-bank.md) - Reference implementation
- [Connections Dashboard Spec](../features/feature-telegram-connections.md) - Complex example

## Documentation

📖 **Full guides:**
- [Collapsible Card Standardization Guide](../guides/collapsible-card-standardization.md)
- [Customizable Layout Guide](../features/customizable-layout.md)

## Questions?

If you're unsure about implementation:
1. Check the reference examples above
2. Read the full documentation
3. Ask in the team chat

**Remember: No exceptions - ALL sections MUST use CollapsibleCard!**
