# Frontend Applications Reference

> **Frontend applications and UI components** - React, TypeScript, Vite
> **Last Updated:** 2025-11-05

## Overview

The TradingSystem frontend is built with **React 18**, **TypeScript**, **Vite 7**, and **Tailwind CSS**. It follows modern best practices with state management (Zustand), data fetching (TanStack Query), and component-driven architecture.

## Main Application: Dashboard

**Location:** `frontend/dashboard/`
**Port:** 9080
**URL:** http://localhost:9080

### Technology Stack

- **Framework:** React 18.2 + TypeScript 5.3
- **Build Tool:** Vite 7.1 (ESM, fast HMR)
- **Routing:** React Router DOM v6.28
- **State Management:** Zustand 4.4
- **Data Fetching:** TanStack Query (React Query) 5.17
- **UI Components:** Radix UI (primitives)
- **Styling:** Tailwind CSS 3.4
- **Icons:** Lucide React 0.309
- **Animation:** Framer Motion 12.23
- **Drag & Drop:** @dnd-kit
- **Testing:** Vitest 3.2 + Playwright 1.56
- **Bundle Size:** ~800KB (production, gzipped)

### Project Structure

```
frontend/dashboard/
├── src/
│   ├── components/       # UI components
│   │   ├── ui/          # Radix UI wrappers (Button, Dialog, etc)
│   │   ├── layout/      # Layout components (Sidebar, Header)
│   │   ├── pages/       # Page components (lazy loaded)
│   │   ├── catalog/     # Catalog views (Agents, Commands)
│   │   └── workspace/   # Workspace-specific components
│   ├── contexts/        # React contexts (Theme, Trading, Search)
│   ├── hooks/           # Custom React hooks
│   ├── store/           # Zustand stores
│   ├── utils/           # Utility functions
│   ├── config/          # Configuration files
│   ├── data/            # Static data (navigation, catalogs)
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/              # Static assets
├── e2e/                 # Playwright tests
├── scripts/             # Build and development scripts
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind configuration
└── tsconfig.json        # TypeScript configuration
```

### Key Features

#### Pages & Routes

| Route | Component | Description | Bundle |
|-------|-----------|-------------|--------|
| `/` | HomePage | Landing/dashboard | core |
| `/workspace` | WorkspacePageNew | Item management | page-workspace |
| `/tp-capital` | TPCapitalOpcoesPage | Trading signals | page-tpcapital |
| `/llama` | LlamaIndexPage | RAG interface | page-llama |
| `/docs` | DocusaurusPage | Documentation hub | page-docusaurus |
| `/telegram-gateway` | TelegramGatewayPage | Telegram management | core |
| `/knowledge/agents` | AgentsCatalogView | AI agents catalog | agents-catalog |
| `/knowledge/commands` | CommandsCatalogView | Commands catalog | commands-catalog |

**Route-based lazy loading:**
```typescript
const LlamaIndexPage = lazy(() => import('./components/pages/LlamaIndexPage'));
const WorkspacePage = lazy(() => import('./components/pages/WorkspacePageNew'));

<Route path="/llama" element={
  <Suspense fallback={<LoadingSpinner />}>
    <LlamaIndexPage />
  </Suspense>
} />
```

#### State Management (Zustand)

**Stores:**
- `useWorkspaceStore` - Workspace items state
- `useTelegramStore` - Telegram messages and channels
- `useTPCapitalStore` - Trading signals state
- `useSearchStore` - Global search state
- `useThemeStore` - Theme preferences
- `useNavigationStore` - Navigation state

**Example store:**
```typescript
// store/workspaceStore.ts
interface WorkspaceState {
  items: Item[];
  loading: boolean;
  error: string | null;
  fetchItems: () => Promise<void>;
  addItem: (item: Item) => Promise<void>;
  updateItem: (id: string, item: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  items: [],
  loading: false,
  error: null,

  fetchItems: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('/api/workspace/items');
      set({ items: response.data, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  // ... other actions
}));
```

#### Data Fetching (TanStack Query)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['workspace', 'items'],
  queryFn: () => axios.get('/api/workspace/items').then(res => res.data),
  staleTime: 5 * 60 * 1000, // 5 minutes
  refetchOnWindowFocus: true
});

// Mutation
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (newItem) => axios.post('/api/workspace/items', newItem),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['workspace', 'items'] });
  }
});
```

#### UI Components (Radix UI)

**Component Library:**
- `Button` - Variants: default, destructive, outline, ghost, link
- `Dialog` - Modal dialogs
- `Select` - Dropdown select
- `Checkbox` - Checkbox input
- `Tabs` - Tab navigation
- `Tooltip` - Hover tooltips
- `ScrollArea` - Custom scrollbars
- `Collapsible` - Expandable sections
- `Progress` - Progress bars
- `Switch` - Toggle switches

**Example usage:**
```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader } from '@/components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent>
    <DialogHeader>
      <h2>Add Item</h2>
    </DialogHeader>
    <form onSubmit={handleSubmit}>
      <Input name="title" />
      <Button type="submit">Save</Button>
    </form>
  </DialogContent>
</Dialog>
```

#### Styling (Tailwind CSS)

**Configuration:**
```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        accent: '#f59e0b',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Fira Code', 'monospace']
      }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
```

**Usage:**
```tsx
<div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
  <h2 className="text-xl font-bold text-gray-900 dark:text-white">Title</h2>
  <Button className="bg-primary hover:bg-primary/90">Action</Button>
</div>
```

### API Integration

**Vite Proxy Configuration:**
```typescript
// vite.config.ts
server: {
  proxy: {
    '/api/workspace': {
      target: 'http://localhost:3200',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api\/workspace/, '/api')
    },
    '/api/tp-capital': {
      target: 'http://localhost:4005',
      changeOrigin: true
    },
    '/api/docs': {
      target: 'http://localhost:3405',
      changeOrigin: true
    },
    '/docs': {
      target: 'http://localhost:3400',
      changeOrigin: true
    }
  }
}
```

**API Client:**
```typescript
// config/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor
api.interceptors.request.use((config) => {
  const token = import.meta.env.VITE_API_SECRET_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Build Optimization

#### Code Splitting

**Manual chunks (vite.config.ts):**
```typescript
rollupOptions: {
  output: {
    manualChunks(id) {
      // Core React (most stable)
      if (id.includes('node_modules/react/') ||
          id.includes('node_modules/react-dom/')) {
        return 'react-vendor';
      }

      // State management
      if (id.includes('node_modules/zustand') ||
          id.includes('node_modules/@tanstack/react-query')) {
        return 'state-vendor';
      }

      // Radix UI components (large, stable)
      if (id.includes('node_modules/@radix-ui/')) {
        return 'ui-radix';
      }

      // Lucide icons (large icon library)
      if (id.includes('node_modules/lucide-react')) {
        return 'icons-vendor';
      }

      // Heavy pages (>50KB)
      if (id.includes('/pages/LlamaIndexPage')) {
        return 'page-llama';
      }
    }
  }
}
```

**Bundle size breakdown:**
- `react-vendor.js` - ~150KB (React + React DOM)
- `ui-radix.js` - ~180KB (Radix UI components)
- `icons-vendor.js` - ~120KB (Lucide icons)
- `state-vendor.js` - ~50KB (Zustand + React Query)
- `page-*.js` - 30-80KB each (lazy loaded pages)

#### Compression

**Vite plugins:**
```typescript
import viteCompression from 'vite-plugin-compression';

plugins: [
  // Gzip compression
  viteCompression({
    algorithm: 'gzip',
    ext: '.gz',
    threshold: 10240, // Only compress files > 10KB
  }),

  // Brotli compression (15-20% smaller than gzip)
  viteCompression({
    algorithm: 'brotliCompress',
    ext: '.br',
    threshold: 10240,
  })
]
```

### Testing

#### Unit Tests (Vitest)

```typescript
// src/__tests__/components/Button.spec.tsx
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

  it('applies variant styles', () => {
    render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByText('Delete');
    expect(button).toHaveClass('bg-red-600');
  });
});
```

**Run tests:**
```bash
npm run test              # Run once
npm run test:watch        # Watch mode
npm run test:coverage     # With coverage report
```

#### E2E Tests (Playwright)

```typescript
// e2e/workspace.smoke.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Workspace Page', () => {
  test('should display workspace items', async ({ page }) => {
    await page.goto('http://localhost:9080/#/workspace');

    // Wait for items to load
    await page.waitForSelector('[data-testid="workspace-item"]');

    // Verify items are displayed
    const items = await page.locator('[data-testid="workspace-item"]').count();
    expect(items).toBeGreaterThan(0);
  });

  test('should create new item', async ({ page }) => {
    await page.goto('http://localhost:9080/#/workspace');

    // Click "Add Item" button
    await page.click('[data-testid="add-item-button"]');

    // Fill form
    await page.fill('[name="title"]', 'Test Item');
    await page.fill('[name="description"]', 'Test Description');

    // Submit
    await page.click('[type="submit"]');

    // Verify item was created
    await expect(page.locator('text=Test Item')).toBeVisible();
  });
});
```

**Run E2E tests:**
```bash
npm run test:e2e              # All browsers
npm run test:e2e:chromium     # Chromium only
npm run test:e2e:headed       # With browser UI
npm run test:e2e:debug        # Debug mode
npm run test:e2e:report       # View report
```

### Environment Variables

```bash
# .env (project root)
VITE_DASHBOARD_PORT=9080
VITE_API_BASE_URL=http://localhost:3500
VITE_API_SECRET_TOKEN=your_secret_token

# Service URLs (auto-proxied in development)
VITE_WORKSPACE_API_URL=http://localhost:3200
VITE_TP_CAPITAL_API_URL=http://localhost:4005
VITE_DOCS_API_URL=http://localhost:3405
VITE_DOCUSAURUS_URL=http://localhost:3400
VITE_FIRECRAWL_PROXY_URL=http://localhost:3600
VITE_TELEGRAM_GATEWAY_API_URL=http://localhost:4010

# RAG Configuration
VITE_USE_UNIFIED_DOMAIN=true
VITE_RAG_MODE=proxy
VITE_RAG_COLLECTIONS_API_URL=http://localhost:3403
```

**Accessing in code:**
```typescript
const apiUrl = import.meta.env.VITE_API_BASE_URL;
const token = import.meta.env.VITE_API_SECRET_TOKEN;
```

### Development Workflow

```bash
# Install dependencies
cd frontend/dashboard
npm install

# Development (with hot reload)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
npm run lint:fix

# Type check
npm run type-check

# Validate environment
npm run validate:env

# Bundle analysis
npm run analyze:bundle
npm run check:bundle
```

### Performance Optimization

#### Core Web Vitals

**Targets:**
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1

**Optimizations:**
1. **Code splitting** - Route-based lazy loading
2. **Tree shaking** - Remove unused code
3. **Compression** - Gzip and Brotli
4. **Preloading** - Critical chunks
5. **Caching** - Service workers (planned)

#### Bundle Size Monitoring

```bash
# Generate bundle analysis
npm run analyze:bundle

# Check bundle sizes
npm run check:bundle

# Example output:
# dist/assets/react-vendor-[hash].js       152 KB
# dist/assets/ui-radix-[hash].js           180 KB
# dist/assets/icons-vendor-[hash].js       120 KB
# dist/assets/page-llama-[hash].js          78 KB
```

### Design System

**Colors:**
```typescript
// Defined in tailwind.config.js
primary: '#1e40af',      // Blue-700
secondary: '#64748b',    // Slate-500
accent: '#f59e0b',       // Amber-500
success: '#10b981',      // Emerald-500
warning: '#f59e0b',      // Amber-500
error: '#ef4444',        // Red-500
```

**Typography:**
```typescript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['Fira Code', 'monospace']
}
```

**Spacing scale:** 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 56, 64

## Workspace Standalone App

**Location:** `apps/workspace/`
**Port:** 3900 (standalone UI, optional)

**Note:** The workspace app has both a backend API (port 3200) and an optional standalone React UI (port 3900). The main dashboard at port 9080 also includes workspace functionality via `/workspace` route.

## Shared Frontend Assets

**Location:** `frontend/shared/`

```
frontend/shared/
├── assets/
│   ├── branding/        # Logos, brand assets
│   ├── icons/           # SVG icons
│   └── images/          # Images
└── styles/              # Shared styles
    ├── globals.css      # Global styles
    └── variables.css    # CSS variables
```

## Additional Resources

- **Component Library:** http://localhost:9080 (Storybook planned)
- **Design System:** [docs/content/frontend/design-system/](../../docs/content/frontend/design-system/)
- **Accessibility Guidelines:** [docs/content/frontend/guidelines/accessibility.mdx](../../docs/content/frontend/guidelines/accessibility.mdx)
- **Testing Strategy:** [docs/content/frontend/engineering/testing.mdx](../../docs/content/frontend/engineering/testing.mdx)
- **Bundle Optimization:** [Architecture Review](../../governance/evidence/reports/reviews/architecture-2025-11-01/index.md#frontend-bundle-size)
