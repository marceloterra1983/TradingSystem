---
title: Implementing Customizable Pages
sidebar_position: 70
tags: [frontend, tutorial, layout, customizable, guide]
domain: frontend
type: guide
summary: Step-by-step guide to creating new dashboard pages with customizable drag-and-drop layouts
status: active
last_review: 2025-10-18
---

# Implementing Customizable Pages

This guide walks you through creating a new dashboard page with the **Customizable Layout System**, including drag-and-drop, collapsible sections, and persistent user preferences.

## Prerequisites

- Basic understanding of React 18 and TypeScript
- Familiarity with Tailwind CSS
- Dashboard project set up and running

## Architecture Overview

### Architecture Diagrams

**Component Architecture - Source**

Download: [`customizable-layout-component-architecture.puml`](../../shared/diagrams/customizable-layout-component-architecture.puml)

**Component Architecture - Rendered**

See diagram source: [`customizable-layout-component-architecture.puml`](../../shared/diagrams/customizable-layout-component-architecture.puml)

Shows page components, layout system layers (CustomizablePageLayout, DraggableGridLayout, LayoutControls), UI components (CollapsibleCard), state management (useCustomLayout hook, localStorage), and @dnd-kit integration.

**User Interaction Flow - Source**

Download: [`customizable-layout-interaction-sequence.puml`](../../shared/diagrams/customizable-layout-interaction-sequence.puml)

**User Interaction Flow - Rendered**

See diagram source: [`customizable-layout-interaction-sequence.puml`](../../shared/diagrams/customizable-layout-interaction-sequence.puml)

Documents 5 user scenarios: initial load, drag-drop (target: `<100ms`), collapse/expand, column change, and reset.

**State Management Flow - Source**

Download: [`customizable-layout-state-diagram.puml`](../../shared/diagrams/customizable-layout-state-diagram.puml)

**State Management Flow - Rendered**

See diagram source: [`customizable-layout-state-diagram.puml`](../../shared/diagrams/customizable-layout-state-diagram.puml)

State machine showing layout initialization (localStorage check), state transitions (Idle → Dragging/UpdatingColumns/Resetting), and error recovery.

## Step-by-Step Implementation

### Step 1: Create Section Components

Create individual components for each section of your page. **Always use `CollapsibleCard`** for compatibility with the layout system.

**File**: `frontend/dashboard/src/components/pages/MyPageSections.tsx`

```tsx
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from '../ui/collapsible-card';
import { PlaceholderSection } from '../ui/placeholder-section';
import { Activity, TrendingUp, Users, Settings } from 'lucide-react';

// Section 1: Overview
export function OverviewSection() {
  return (
    <CollapsibleCard cardId="mypage-overview" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>System Overview</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <PlaceholderSection
          cardId="overview-content"
          title="Dashboard Overview"
          description="Key metrics and system status"
          icon={<Activity className="w-5 h-5 text-cyan-500" />}
        />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

// Section 2: Performance Metrics
export function MetricsSection() {
  return (
    <CollapsibleCard cardId="mypage-metrics" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Performance Metrics</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <PlaceholderSection
          cardId="metrics-content"
          title="Real-Time Metrics"
          description="Performance indicators and trends"
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

// Section 3: User Management
export function UsersSection() {
  return (
    <CollapsibleCard cardId="mypage-users" defaultCollapsed={true}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>User Management</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="p-4">
          {/* Your actual content here */}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            User list and permissions will be displayed here.
          </p>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}

// Section 4: Settings
export function SettingsSection() {
  return (
    <CollapsibleCard cardId="mypage-settings" defaultCollapsed={true}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Configuration</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <PlaceholderSection
          cardId="settings-content"
          title="System Settings"
          description="Configure system parameters"
          icon={<Settings className="w-5 h-5 text-purple-500" />}
        />
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

**Key Points**:
- **`cardId`**: Must be unique across the entire app for state persistence
- **`defaultCollapsed`**: Set initial collapsed state (true/false)
- **PlaceholderSection**: Use for "to be implemented" sections
- **Icons**: Import from `lucide-react` for consistency

### Step 2: Create Page Component

Create the main page component that assembles all sections.

**File**: `frontend/dashboard/src/components/pages/MyPageNew.tsx`

```tsx
import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import {
  OverviewSection,
  MetricsSection,
  UsersSection,
  SettingsSection,
} from './MyPageSections';

export function MyPageNew() {
  // Define sections array
  const sections = [
    {
      id: 'overview',
      content: <OverviewSection />,
    },
    {
      id: 'metrics',
      content: <MetricsSection />,
    },
    {
      id: 'users',
      content: <UsersSection />,
    },
    {
      id: 'settings',
      content: <SettingsSection />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="my-page"              // Unique ID for localStorage
      title="My Custom Page"         // Page title
      subtitle="Manage your system" // Optional subtitle
      sections={sections}            // Sections array
      defaultColumns={2}             // Initial column count (1-4)
    />
  );
}
```

**Props Explained**:
- **`pageId`**: Unique identifier for localStorage persistence (format: `tradingSystem_layout_my-page`)
- **`title`**: Displayed in the page header
- **`subtitle`**: Optional description shown below the title
- **`sections`**: Array of `{ id: string, content: ReactNode }`
- **`defaultColumns`**: Initial grid columns (1, 2, 3, or 4)

### Step 3: Register in Navigation

Add your page to the navigation configuration.

**File**: `frontend/dashboard/src/data/navigation.tsx`

```tsx
// Import your page component
import { MyPageNew } from '../components/pages/MyPageNew';

// Import icon (optional)
import { Sparkles } from 'lucide-react';

// Inside the navigationSections array, add to appropriate section:
{
  id: 'my-section',
  icon: <Sparkles className="w-5 h-5" />,
  label: 'My Section',
  pages: [
    {
      id: 'my-page',
      title: 'My Page',
      header: {
        title: 'My Custom Page',
        subtitle: 'Manage your system',
      },
      // IMPORTANT: Use customContent (not parts) for CustomizablePageLayout
      customContent: <MyPageNew />,
    },
    // ... other pages
  ],
},
```

**Navigation Patterns**:
- **`customContent`**: For pages using `CustomizablePageLayout` ✅
- **`parts`**: For old accordion-based pages (deprecated) ❌

### Step 4: Test Your Page

1. **Start the development server**:
```bash
cd frontend/dashboard
npm run dev
```

2. **Navigate to your page**: Click on "My Section" → "My Page"

3. **Test functionality**:
   - ✅ Drag sections using the vertical bar on the left
   - ✅ Click headers to collapse/expand sections
   - ✅ Change column count (1, 2, 3, 4)
   - ✅ Click "Resetar" to restore default layout
   - ✅ Refresh page - layout should persist

## Advanced Patterns

### Custom Content Instead of Placeholder

Replace `PlaceholderSection` with real components:

```tsx
export function RealDataSection() {
  const [data, setData] = useState([]);

  useEffect(() => {
    // Fetch data
    fetchData().then(setData);
  }, []);

  return (
    <CollapsibleCard cardId="mypage-realdata">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Real Data</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="space-y-4">
          {data.map(item => (
            <DataCard key={item.id} data={item} />
          ))}
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

### Programmatic Layout Control

Access the layout hook directly for advanced control:

```tsx
import { useCustomLayout } from '../layout/useCustomLayout';

export function AdvancedPage() {
  const sections = [
    { id: 'section1', content: <Section1 /> },
    { id: 'section2', content: <Section2 /> },
  ];

  const {
    columns,
    setColumns,
    moveComponent,
    resetLayout,
  } = useCustomLayout({
    pageId: 'advanced-page',
    componentIds: sections.map(s => s.id),
    defaultColumns: 3,
  });

  const handleCustomReset = () => {
    // Custom reset logic
    setColumns(2);
    moveComponent('section1', 0);
    moveComponent('section2', 1);
  };

  return (
    <div>
      <button onClick={handleCustomReset}>Custom Reset</button>
      <CustomizablePageLayout
        pageId="advanced-page"
        sections={sections}
        defaultColumns={3}
      />
    </div>
  );
}
```

### Conditional Sections

Show/hide sections based on state:

```tsx
export function ConditionalPage() {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const sections = [
    { id: 'basic', content: <BasicSection /> },
    ...(showAdvanced ? [{ id: 'advanced', content: <AdvancedSection /> }] : []),
  ];

  return (
    <>
      <button onClick={() => setShowAdvanced(!showAdvanced)}>
        Toggle Advanced
      </button>
      <CustomizablePageLayout
        pageId="conditional-page"
        sections={sections}
        defaultColumns={2}
      />
    </>
  );
}
```

## Common Patterns

### 1. Multi-Column Layouts

```tsx
// Wide content: Use 1 column for full width
defaultColumns={1}

// Dashboard style: 2 columns for balance
defaultColumns={2}

// Dense layout: 3-4 columns for many small sections
defaultColumns={3}
```

### 2. Section Organization

**By Feature**:
```tsx
const sections = [
  { id: 'orders', content: <OrdersSection /> },
  { id: 'positions', content: <PositionsSection /> },
  { id: 'history', content: <HistorySection /> },
];
```

**By Priority**:
```tsx
const sections = [
  { id: 'critical', content: <CriticalAlertsSection /> },
  { id: 'important', content: <ImportantMetricsSection /> },
  { id: 'info', content: <InfoSection /> },
];
```

**By Data Type**:
```tsx
const sections = [
  { id: 'realtime', content: <RealtimeDataSection /> },
  { id: 'historical', content: <HistoricalDataSection /> },
  { id: 'status', content: <StatusSection /> },
];
```

### 3. Responsive Design

The layout automatically adjusts:

```
Desktop (>1024px):  User's choice (1-4 columns)
Tablet (768-1024px): Max 2 columns
Mobile (`<768px`):     Always 1 column
```

Override with custom CSS if needed:

```tsx
<div className="lg:grid-cols-4 md:grid-cols-2 grid-cols-1">
  {/* Custom responsive grid */}
</div>
```

## Best Practices

### ✅ DO:

1. **Use unique `cardId`**:
```tsx
// ✅ Good - unique and descriptive
cardId="mypage-overview"
cardId="settings-user-profile"

// ❌ Bad - generic or duplicate
cardId="section1"
cardId="card"
```

2. **Use `CollapsibleCard` for all sections**:
```tsx
// ✅ Good
<CollapsibleCard cardId="unique-id">
  <CollapsibleCardHeader>...</CollapsibleCardHeader>
  <CollapsibleCardContent>...</CollapsibleCardContent>
</CollapsibleCard>

// ❌ Bad - plain Card won't work with drag-and-drop
<Card>...</Card>
```

3. **Use `PlaceholderSection` for WIP features**:
```tsx
// ✅ Good - clear indication of future feature
<PlaceholderSection
  cardId="future-feature"
  title="Coming Soon"
  description="This feature will be implemented in the next sprint"
  icon={<Clock className="w-5 h-5 text-orange-500" />}
/>
```

4. **Register with `customContent`**:
```tsx
// ✅ Good
{
  id: 'my-page',
  customContent: <MyPageNew />,
}

// ❌ Bad - old pattern
{
  id: 'my-page',
  parts: [...],
}
```

### ❌ DON'T:

1. **Don't add drag handlers manually**:
```tsx
// ❌ Bad - conflicts with DraggableGridLayout
<div {...dragListeners}>
  <CollapsibleCard>...</CollapsibleCard>
</div>

// ✅ Good - DraggableGridLayout handles it
<CustomizablePageLayout sections={[...]} />
```

2. **Don't use inconsistent `pageId`**:
```tsx
// ❌ Bad - different pageId means lost state
<CustomizablePageLayout pageId="myPage" ... />
<CustomizablePageLayout pageId="my-page" ... />

// ✅ Good - consistent pageId
<CustomizablePageLayout pageId="my-page" ... />
```

3. **Don't forget `defaultCollapsed`**:
```tsx
// ❌ Bad - state not controlled
<CollapsibleCard cardId="section">

// ✅ Good - explicit initial state
<CollapsibleCard cardId="section" defaultCollapsed={false}>
```

## Troubleshooting

### Layout not persisting
**Problem**: Layout resets on page refresh

**Solution**:
```tsx
// Check pageId is unique and consistent
console.log('pageId:', 'my-page');

// Verify localStorage
const savedLayout = localStorage.getItem('tradingSystem_layout_my-page');
console.log('Saved layout:', savedLayout);

// Ensure browser allows localStorage
if (typeof window !== 'undefined' && window.localStorage) {
  // localStorage available
}
```

### Drag not working
**Problem**: Can't drag sections

**Solution**:
```bash
# Ensure dependencies installed
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Check for conflicting event handlers
# Remove any manual drag listeners on cards
```

### Collapse conflicts with drag
**Problem**: Clicking header drags instead of collapsing

**Status**: ✅ Resolved in current version

**How it works**:
- Drag handle: Isolated vertical bar on the left
- Header: Free for collapse/expand clicks
- No conflict between interactions

### Sections overlapping
**Problem**: Cards overlap or have no spacing

**Solution**:
```tsx
// Ensure proper gap in grid
<DraggableGridLayout className="gap-4" ... />

// Check card margins/padding
<CollapsibleCard className="w-full" ... />
```

## Examples from Production

### EscopoPage (7 sections, 2 columns)
```tsx
const sections = [
  { id: 'overview', content: <OverviewSection /> },
  { id: 'objectives', content: <ObjectivesSection /> },
  { id: 'architecture', content: <ArchitectureSection /> },
  { id: 'techstack', content: <TechStackSection /> },
  { id: 'systems', content: <SystemsSection /> },
  { id: 'requirements', content: <RequirementsSection /> },
  { id: 'constraints', content: <ConstraintsSection /> },
];

return (
  <CustomizablePageLayout
    pageId="escopo"
    title="Escopo do Sistema"
    sections={sections}
    defaultColumns={2}
  />
);
```

### SettingsPage (7 sections, 2 columns)
```tsx
const sections = [
  { id: 'user-profile', content: <UserProfileSection /> },
  { id: 'notifications', content: <NotificationsSection /> },
  { id: 'appearance', content: <AppearanceSection /> },
  { id: 'language', content: <LanguageSection /> },
  { id: 'security', content: <SecuritySection /> },
  { id: 'data-storage', content: <DataStorageSection /> },
  { id: 'performance', content: <PerformanceSection /> },
];
```

### ConnectionsPage (5 sections, 3 columns)
```tsx
const sections = [
  { id: 'profitdll', content: <ProfitDLLSection /> },
  { id: 'websocket', content: <WebSocketSection /> },
  { id: 'services', content: <ServicesSection /> },
  { id: 'history', content: <HistorySection /> },
  { id: 'network', content: <NetworkSection /> },
];

return (
  <CustomizablePageLayout
    pageId="conexoes"
    title="System Connections"
    sections={sections}
    defaultColumns={3}
  />
);
```

## Advanced Implementation Patterns

### Pattern 1: Data Fetching Integration

```typescript
import { useQuery } from '@tanstack/react-query';

function DataFetchingSection() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['section-data'],
    queryFn: fetchData,
  });

  return (
    <CollapsibleCard cardId="data-section" defaultCollapsed={false}>
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>
          {isLoading ? 'Loading...' : 'Section Title'}
        </CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {isLoading && <p>Loading data...</p>}
        {isError && <p>Error: {error.message}</p>}
        {data && <DataDisplay data={data} />}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
```

### Pattern 2: Dynamic Section Loading

```typescript
function ConditionalPage() {
  const { user } = useAuth();
  const { features } = useFeatureFlags();

  const sections = [
    { id: 'overview', content: <OverviewSection /> },
    // Show advanced section only for admin users
    ...(user?.role === 'admin' ? [{ id: 'admin', content: <AdminSection /> }] : []),
    // Show beta features only when enabled
    ...(features.betaFeatures ? [{ id: 'beta', content: <BetaSection /> }] : []),
  ];

  return (
    <CustomizablePageLayout
      pageId="conditional-page"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

### Pattern 3: Section Communication

```typescript
function PageWithSharedState() {
  const [sharedData, setSharedData] = useState<SharedData | null>(null);

  const sections = [
    {
      id: 'input-section',
      content: (
        <InputSection
          onDataChange={setSharedData}
          currentData={sharedData}
        />
      ),
    },
    {
      id: 'display-section',
      content: (
        <DisplaySection
          data={sharedData}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="shared-state-page"
      sections={sections}
      defaultColumns={2}
    />
  );
}
```

### Pattern 4: Custom Layout Controls

```typescript
function PageWithCustomControls() {
  const { columns, setColumns, resetLayout } = useCustomLayout({
    pageId: 'custom-controls-page',
    componentIds: ['section1', 'section2'],
    defaultColumns: 2,
  });

  const handleExportLayout = () => {
    const layout = localStorage.getItem('tradingSystem_layout_custom-controls-page');
    const blob = new Blob([layout || ''], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'layout-export.json';
    a.click();
  };

  return (
    <div>
      <div className="mb-4 flex gap-2">
        <button onClick={resetLayout}>Reset</button>
        <button onClick={handleExportLayout}>Export Layout</button>
        <button onClick={() => setColumns(3)}>3 Columns</button>
      </div>
      <CustomizablePageLayout
        pageId="custom-controls-page"
        sections={sections}
        defaultColumns={2}
      />
    </div>
  );
}
```

### Pattern 5: Performance Optimization

```typescript
import { memo, useMemo } from 'react';

const HeavySection = memo(function HeavySection({ data }: { data: any[] }) {
  const processedData = useMemo(() => {
    // Expensive computation
    return data.map(item => expensiveTransform(item));
  }, [data]);

  return (
    <CollapsibleCard cardId="heavy-section">
      <CollapsibleCardHeader>
        <CollapsibleCardTitle>Heavy Computation Section</CollapsibleCardTitle>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        {processedData.map(item => (
          <DataRow key={item.id} data={item} />
        ))}
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
});
```

## Related Documentation

- [Customizable Layout Feature Spec](../features/customizable-layout.md)
- [Component Architecture Diagram](../../shared/diagrams/customizable-layout-component-architecture.puml)
- [Interaction Sequence Diagram](../../shared/diagrams/customizable-layout-interaction-sequence.puml)
- [State Management Diagram](../../shared/diagrams/customizable-layout-state-diagram.puml)
- [CollapsibleCard Standardization](./collapsible-card-standardization.md)
- [Layout Visual Guide](./layout-visual-guide.md)
- [Design System](../references/design-system.md)

## Next Steps

- Read [Customizable Layout System](../features/customizable-layout.md) for architecture details
- Check [Design System](../references/design-system.md) for available UI components
- Review [Navigation ADR](../architecture/decisions/2025-10-11-adr-0004-use-react-router-v6-for-navigation.md) for routing patterns
- See the [Layout Visual Guide](./layout-visual-guide.md) for UI references

## Questions?

Open an issue with the `frontend:guide` label or check the [Frontend README](../README.md) for more resources.
