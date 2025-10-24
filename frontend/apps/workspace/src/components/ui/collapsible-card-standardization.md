# Collapsible Card Standardization Guide

## 🎯 Critical Requirement

**ALL pages using `CustomizablePageLayout` MUST use `CollapsibleCard` for ALL sections.**

This is a mandatory requirement for:
- ✅ Drag-and-drop functionality
- ✅ Collapse/Expand all feature
- ✅ State persistence
- ✅ Consistent UX

## ❌ What NOT to Do

### ❌ Using plain `<Card>` components
```tsx
// ❌ WRONG - Will NOT work with CustomizablePageLayout
<Card>
  <CardHeader>
    <CardTitle>My Section</CardTitle>
  </CardHeader>
  <CardContent>
    <p>Content here</p>
  </CardContent>
</Card>
```

### ❌ Using plain `<div>` elements
```tsx
// ❌ WRONG - No collapse/expand functionality
<div className="border rounded-lg p-4">
  <h3>My Section</h3>
  <p>Content here</p>
</div>
```

### ❌ Using links/buttons directly in sections
```tsx
// ❌ WRONG - Links should be INSIDE CollapsibleCard
const sections = [
  {
    id: 'section1',
    content: (
      <a href="http://example.com" className="...">
        Click me
      </a>
    ),
  },
];
```

## ✅ Correct Implementation

### ✅ Always use CollapsibleCard
```tsx
import { CollapsibleCard } from '../ui/collapsible-card';

// ✅ CORRECT - Full CollapsibleCard structure
<CollapsibleCard
  cardId="unique-id"
  title="Section Title"
  icon={<IconComponent className="w-5 h-5 text-color-500" />}
  defaultCollapsed={false}
>
  <div className="space-y-4">
    {/* Your content here */}
  </div>
</CollapsibleCard>
```

### ✅ Using CollapsibleCard with links/buttons
```tsx
// ✅ CORRECT - Links inside CollapsibleCard
<CollapsibleCard
  cardId="quick-access"
  title="Quick Access"
  icon={<Play className="w-5 h-5 text-cyan-500" />}
  defaultCollapsed={false}
>
  <div className="grid grid-cols-3 gap-4">
    <a href="http://localhost:5173" className="...">
      Dashboard
    </a>
    <a href="http://localhost:3000" className="...">
      Grafana
    </a>
  </div>
</CollapsibleCard>
```

## 📝 Required Props

### Mandatory Props
- **`cardId`** (string): Unique identifier for state persistence
  - Format: `{pageId}-{sectionName}`
  - Example: `"ports-quick-access"`, `"escopo-overview"`
  - Must be unique across the entire page

### Optional Props
- **`title`** (string): Card title displayed in header
- **`icon`** (ReactNode): Icon displayed before title
- **`defaultCollapsed`** (boolean): Initial collapse state (default: `false`)
- **`className`** (string): Additional CSS classes

## 🎨 Complete Example

```tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { CollapsibleCard } from '../ui/collapsible-card';
import { Server, Database, Monitor } from 'lucide-react';

export function MyPage() {
  // Section 1: Server Stats
  const serverSection = {
    id: 'servers',
    content: (
      <CollapsibleCard
        cardId="mypage-servers"
        title="Server Statistics"
        icon={<Server className="w-5 h-5 text-cyan-500" />}
        defaultCollapsed={false}
      >
        <div className="space-y-4">
          <p>Server uptime: 99.9%</p>
          <p>Active connections: 1,234</p>
        </div>
      </CollapsibleCard>
    ),
  };

  // Section 2: Database Info
  const databaseSection = {
    id: 'database',
    content: (
      <CollapsibleCard
        cardId="mypage-database"
        title="Database Status"
        icon={<Database className="w-5 h-5 text-purple-500" />}
        defaultCollapsed={false}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Table content */}
          </table>
        </div>
      </CollapsibleCard>
    ),
  };

  // Section 3: Monitoring
  const monitoringSection = {
    id: 'monitoring',
    content: (
      <CollapsibleCard
        cardId="mypage-monitoring"
        title="Monitoring Links"
        icon={<Monitor className="w-5 h-5 text-orange-500" />}
        defaultCollapsed={false}
      >
        <div className="grid grid-cols-2 gap-4">
          <a
            href="http://localhost:9090"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Prometheus
          </a>
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Grafana
          </a>
        </div>
      </CollapsibleCard>
    ),
  };

  return (
    <CustomizablePageLayout
      pageId="mypage"
      title="My Page"
      subtitle="Example page with collapsible cards"
      sections={[serverSection, databaseSection, monitoringSection]}
      defaultColumns={2}
    />
  );
}
```

## 🔍 Verification Checklist

Before submitting a new page, verify:

- [ ] All sections use `CollapsibleCard` component
- [ ] Every `CollapsibleCard` has a unique `cardId`
- [ ] `cardId` follows the format: `{pageId}-{sectionName}`
- [ ] No plain `<Card>`, `<div>`, or direct content in sections
- [ ] All links/buttons are INSIDE `CollapsibleCard` content
- [ ] Icons are properly imported and sized (`w-5 h-5`)
- [ ] `defaultCollapsed` is set (usually `false`)
- [ ] Page uses `CustomizablePageLayout` wrapper
- [ ] Sections array has proper structure: `{ id, content }`

## 📚 Reference Examples

✅ **Correct implementations to reference:**
- [PortsPage.tsx](../pages/PortsPage.tsx) - Shows all patterns (quick access, tables, stats)
- [EscopoPageNew.tsx](../pages/EscopoPageNew.tsx) - Reference implementation
- [ConnectionsPageNew.tsx](../pages/ConnectionsPageNew.tsx) - Complex forms and tables

## 🐛 Common Issues

### Issue: Collapse/Expand All doesn't work
**Cause**: Using plain `<Card>` instead of `CollapsibleCard`
**Solution**: Replace all `<Card>` with `<CollapsibleCard>`

### Issue: Drag-and-drop not working
**Cause**: Missing unique `cardId` or wrong component structure
**Solution**: Ensure all sections have `CollapsibleCard` with unique `cardId`

### Issue: State not persisting
**Cause**: `cardId` not unique or changing between renders
**Solution**: Use static string for `cardId`, not dynamic values

### Issue: Click events not working
**Cause**: Drag handle interfering with click events
**Solution**: This is already handled! The drag handle is isolated to the left border. Regular content clicks work normally.

## 📖 Related Documentation

- [Layout System README](../layout/README.md) - Full layout system documentation
- [CollapsibleCard Implementation](./collapsible-card.tsx) - Component source code
- [Navigation Patterns](../../data/navigation.tsx) - How to register pages

## 🚨 Breaking Changes

If you modify a page and remove `CollapsibleCard`:
- ❌ Collapse/Expand All will break
- ❌ Drag-and-drop will stop working
- ❌ State persistence will fail
- ❌ User experience will be inconsistent

**Always use CollapsibleCard in CustomizablePageLayout!**
