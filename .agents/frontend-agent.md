# Frontend Agent (React + TypeScript)

## Role
Frontend Developer - Dashboard UI & Components

## Specialization
- React 18 + TypeScript
- Vite build tool
- Zustand state management
- TailwindCSS + shadcn/ui
- WebSocket integration (real-time data)

## Focus Areas
- Dashboard (http://localhost:3103)
- Real-time market data display
- Order entry forms
- Charts (TradingView, Recharts)
- Responsive design (desktop-first for trading)

## Tech Stack
```json
{
  "framework": "React 18",
  "language": "TypeScript 5.x",
  "build": "Vite",
  "state": "Zustand",
  "styling": "TailwindCSS + shadcn/ui",
  "testing": "Vitest + React Testing Library",
  "websocket": "native WebSocket API",
  "charts": "Recharts / TradingView Lightweight Charts"
}
```

## Development Workflow

### 1. Receive Task
```markdown
Example from tasks.md:
## 3. Frontend (Frontend Agent)
- [ ] 3.1 Create OrderHistory component
- [ ] 3.2 Implement history table with filters
- [ ] 3.3 Add pagination
- [ ] 3.4 Write component tests

Context: openspec/changes/add-order-history/
Design: Figma mockup (if provided)
API: GET /api/orders/:id/history
```

### 2. Component Development Checklist
- [ ] Create git branch: `claude/add-feature-ui-{session-id}`
- [ ] Design component structure
- [ ] Create TypeScript interfaces
- [ ] Implement component logic
- [ ] Add state management (Zustand if needed)
- [ ] Style with TailwindCSS
- [ ] Add loading/error states
- [ ] Implement accessibility (ARIA, keyboard nav)
- [ ] Write component tests
- [ ] Add to Storybook (if applicable)
- [ ] Manual testing (Chrome + Firefox)
- [ ] Create PR

### 3. Project Structure
```
frontend/apps/dashboard/src/
├── components/
│   ├── ui/                    # shadcn/ui primitives
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── table.tsx
│   │   └── dialog.tsx
│   ├── orders/                # Feature components
│   │   ├── OrderEntry.tsx
│   │   ├── OrderHistory.tsx
│   │   ├── OrderList.tsx
│   │   └── OrderDetails.tsx
│   ├── market/
│   │   ├── MarketDepth.tsx
│   │   ├── TradeHistory.tsx
│   │   └── PriceChart.tsx
│   └── layout/
│       ├── Header.tsx
│       ├── Sidebar.tsx
│       └── Layout.tsx
│
├── hooks/
│   ├── useWebSocket.ts
│   ├── useOrders.ts
│   ├── useMarketData.ts
│   └── useAuth.ts
│
├── store/
│   ├── orderStore.ts          # Zustand stores
│   ├── marketDataStore.ts
│   └── uiStore.ts
│
├── lib/
│   ├── api.ts                 # API client
│   ├── websocket.ts           # WebSocket manager
│   └── utils.ts
│
└── types/
    ├── order.ts
    ├── trade.ts
    └── api.ts
```

## Component Patterns

### 1. Feature Component Example
```typescript
// components/orders/OrderHistory.tsx

import { useState, useEffect } from 'react';
import { useOrderStore } from '@/store/orderStore';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert } from '@/components/ui/alert';

interface OrderHistoryProps {
  orderId: string;
}

export function OrderHistory({ orderId }: OrderHistoryProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { history, fetchHistory } = useOrderStore();

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setLoading(true);
        await fetchHistory(orderId);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [orderId, fetchHistory]);

  if (loading) {
    return <OrderHistorySkeleton />;
  }

  if (error) {
    return <Alert variant="destructive">{error}</Alert>;
  }

  if (!history || history.length === 0) {
    return <div className="text-muted-foreground">No history available</div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Order History</h3>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Timestamp</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((entry) => (
            <TableRow key={entry.id}>
              <TableCell>{new Date(entry.timestamp).toLocaleString()}</TableCell>
              <TableCell>
                <StatusBadge status={entry.status} />
              </TableCell>
              <TableCell>{entry.quantity}</TableCell>
              <TableCell>{entry.price?.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function OrderHistorySkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-6 w-32" />
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    </div>
  );
}
```

### 2. Custom Hook Example
```typescript
// hooks/useWebSocket.ts

import { useEffect, useRef, useState, useCallback } from 'react';

interface UseWebSocketOptions {
  url: string;
  onMessage: (data: any) => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  reconnectDelay?: number;
}

export function useWebSocket({
  url,
  onMessage,
  onError,
  reconnect = true,
  reconnectDelay = 5000
}: UseWebSocketOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (err) {
          console.error('[WebSocket] Parse error:', err);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };

      ws.current.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);

        // Auto-reconnect
        if (reconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[WebSocket] Reconnecting...');
            connect();
          }, reconnectDelay);
        }
      };
    } catch (err) {
      console.error('[WebSocket] Connection failed:', err);
    }
  }, [url, onMessage, onError, reconnect, reconnectDelay]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    ws.current?.close();
  }, []);

  const send = useCallback((data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('[WebSocket] Not connected, message not sent');
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, send, disconnect };
}
```

### 3. Zustand Store Example
```typescript
// store/orderStore.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api } from '@/lib/api';
import type { Order, OrderHistory } from '@/types/order';

interface OrderStore {
  orders: Order[];
  history: OrderHistory[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchOrders: () => Promise<void>;
  fetchHistory: (orderId: string) => Promise<void>;
  placeOrder: (orderData: any) => Promise<Order>;
  cancelOrder: (orderId: string) => Promise<void>;
}

export const useOrderStore = create<OrderStore>()(
  devtools(
    (set, get) => ({
      orders: [],
      history: [],
      loading: false,
      error: null,

      fetchOrders: async () => {
        set({ loading: true, error: null });
        try {
          const orders = await api.get<Order[]>('/api/orders');
          set({ orders, loading: false });
        } catch (error) {
          set({ error: 'Failed to fetch orders', loading: false });
        }
      },

      fetchHistory: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          const history = await api.get<OrderHistory[]>(`/api/orders/${orderId}/history`);
          set({ history, loading: false });
        } catch (error) {
          set({ error: 'Failed to fetch history', loading: false });
        }
      },

      placeOrder: async (orderData) => {
        set({ loading: true, error: null });
        try {
          const order = await api.post<Order>('/api/orders', orderData);
          set((state) => ({
            orders: [...state.orders, order],
            loading: false,
          }));
          return order;
        } catch (error) {
          set({ error: 'Failed to place order', loading: false });
          throw error;
        }
      },

      cancelOrder: async (orderId: string) => {
        set({ loading: true, error: null });
        try {
          await api.delete(`/api/orders/${orderId}`);
          set((state) => ({
            orders: state.orders.filter((o) => o.id !== orderId),
            loading: false,
          }));
        } catch (error) {
          set({ error: 'Failed to cancel order', loading: false });
          throw error;
        }
      },
    }),
    { name: 'OrderStore' }
  )
);
```

## Testing Strategy

### Component Tests (Vitest + RTL)
```typescript
// components/orders/__tests__/OrderHistory.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderHistory } from '../OrderHistory';
import { useOrderStore } from '@/store/orderStore';

// Mock Zustand store
vi.mock('@/store/orderStore');

describe('OrderHistory', () => {
  const mockFetchHistory = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading skeleton initially', () => {
    (useOrderStore as any).mockReturnValue({
      history: [],
      fetchHistory: mockFetchHistory,
    });

    render(<OrderHistory orderId="123" />);

    // Check for skeleton elements
    expect(screen.getByTestId('order-history-skeleton')).toBeInTheDocument();
  });

  it('should display history data when loaded', async () => {
    const mockHistory = [
      { id: '1', timestamp: '2025-10-29T10:00:00Z', status: 'FILLED', quantity: 100, price: 32.50 },
      { id: '2', timestamp: '2025-10-29T10:05:00Z', status: 'PARTIALLY_FILLED', quantity: 50, price: 32.45 },
    ];

    (useOrderStore as any).mockReturnValue({
      history: mockHistory,
      fetchHistory: mockFetchHistory,
    });

    render(<OrderHistory orderId="123" />);

    await waitFor(() => {
      expect(screen.getByText('FILLED')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('32.50')).toBeInTheDocument();
    });
  });

  it('should display error message on failure', async () => {
    (useOrderStore as any).mockReturnValue({
      history: [],
      fetchHistory: vi.fn().mockRejectedValue(new Error('Network error')),
    });

    render(<OrderHistory orderId="123" />);

    await waitFor(() => {
      expect(screen.getByText(/failed to load history/i)).toBeInTheDocument();
    });
  });
});
```

## Accessibility Standards (WCAG 2.1 AA)

### Checklist
- [ ] Semantic HTML (`<button>`, `<nav>`, `<main>`, etc.)
- [ ] ARIA labels for interactive elements
- [ ] Keyboard navigation (Tab, Enter, Escape)
- [ ] Focus indicators visible
- [ ] Color contrast ratio ≥ 4.5:1
- [ ] Screen reader tested
- [ ] No keyboard traps

### Example
```typescript
<button
  onClick={handleSubmit}
  disabled={loading}
  aria-label="Place order"
  aria-busy={loading}
  className="btn-primary focus:ring-2 focus:ring-blue-500"
>
  {loading ? 'Placing...' : 'Place Order'}
</button>
```

## Performance Optimization

### Patterns
```typescript
// 1. Memoization
const MemoizedChart = React.memo(PriceChart, (prev, next) => {
  return prev.data === next.data;
});

// 2. useMemo for expensive calculations
const sortedOrders = useMemo(() => {
  return orders.sort((a, b) => b.timestamp - a.timestamp);
}, [orders]);

// 3. useCallback for stable function references
const handleOrderSubmit = useCallback((data: OrderData) => {
  placeOrder(data);
}, [placeOrder]);

// 4. Virtualization for long lists (react-window)
import { FixedSizeList } from 'react-window';

<FixedSizeList
  height={500}
  itemCount={orders.length}
  itemSize={50}
  width="100%"
>
  {({ index, style }) => (
    <div style={style}>
      <OrderRow order={orders[index]} />
    </div>
  )}
</FixedSizeList>
```

## Code Quality Standards
- Use TypeScript strictly (`strict: true`)
- Follow ESLint rules
- Max component size: 200 lines (extract if larger)
- Prefer composition over inheritance
- Extract reusable logic to custom hooks
- Document complex components with JSDoc

## Pull Request Template
```markdown
## Description
Added OrderHistory component with pagination and filters

## Screenshots
[Attach screenshots or video]

## Changes
- [ ] Created OrderHistory component
- [ ] Added pagination (20 items per page)
- [ ] Implemented date filter
- [ ] Responsive design (mobile + desktop)
- [ ] Component tests (95% coverage)

## Testing
- [x] Component tests pass
- [x] Manual testing (Chrome, Firefox)
- [x] Accessibility tested (keyboard nav, screen reader)
- [x] Responsive design verified

## Checklist
- [x] TypeScript types defined
- [x] Tailwind classes used (no inline styles)
- [x] Loading/error states handled
- [x] Accessibility WCAG 2.1 AA compliant
- [x] Performance optimized (React.memo if needed)
```

## Anti-Patterns to Avoid
❌ Inline styles (use Tailwind)
❌ Any type (use proper TypeScript types)
❌ Prop drilling (use Zustand or context)
❌ Large components (>200 lines)
❌ Missing error/loading states
❌ Poor accessibility
❌ Not testing edge cases
❌ Using `useEffect` for derived state
