import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface Trade {
  symbol: string;
  price: number;
  volume: number;
  aggressor: 'BUY' | 'SELL';
  timestamp: string;
}

export interface Position {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  positionType: 'DAYTRADE' | 'SWING';
  openedAt: string;
}

export interface Order {
  orderId: string;
  brokerOrderId?: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  filledQuantity: number;
  avgFillPrice?: number;
  status: 'SUBMITTED' | 'FILLED' | 'PARTIAL' | 'CANCELED' | 'REJECTED';
  orderType: 'MARKET' | 'LIMIT' | 'STOP' | 'STOPLIMIT';
  price?: number;
  stopPrice?: number;
  createdAt: string;
  filledAt?: string;
}

export interface Signal {
  signalId: string;
  symbol: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  priceTarget?: number;
  stopLoss?: number;
  timestamp: string;
  modelVersion: string;
}

export interface OrderBook {
  symbol: string;
  bids: Array<{ price: number; volume: number }>;
  asks: Array<{ price: number; volume: number }>;
  timestamp: string;
}

export interface RiskLimits {
  dailyLossLimit: number;
  currentLoss: number;
  remainingLimit: number;
  maxPositionSize: number;
  currentPositions: number;
  killSwitchActive: boolean;
}

export interface PortInfo {
  port: number;
  name: string;
  description: string;
  url: string;
  status: 'online' | 'offline' | 'unknown';
  lastUpdated: string;
  category: 'core' | 'api' | 'monitoring' | 'database' | 'ui';
}

interface TradingState {
  // Real-time data
  trades: Trade[];
  orderBooks: Map<string, OrderBook>;

  // Portfolio state
  positions: Position[];
  orders: Order[];
  signals: Signal[];

  // Risk management
  riskLimits: RiskLimits | null;

  // System state
  connectedSymbols: Set<string>;
  ports: PortInfo[];

  // Actions
  addTrade: (trade: Trade) => void;
  updateOrderBook: (orderBook: OrderBook) => void;
  setPositions: (positions: Position[]) => void;
  updatePosition: (position: Position) => void;
  setOrders: (orders: Order[]) => void;
  updateOrder: (order: Order) => void;
  addSignal: (signal: Signal) => void;
  setRiskLimits: (limits: RiskLimits) => void;
  addConnectedSymbol: (symbol: string) => void;
  removeConnectedSymbol: (symbol: string) => void;
  clearTrades: () => void;
  setPorts: (ports: PortInfo[]) => void;
  updatePortStatus: (port: number, status: 'online' | 'offline' | 'unknown') => void;
  reset: () => void;
}

export const useTradingStore = create<TradingState>()(
  devtools(
    (set, _get) => ({
      // Initial state
      trades: [],
      orderBooks: new Map(),
      positions: [],
      orders: [],
      signals: [],
      riskLimits: null,
      connectedSymbols: new Set(),
      ports: [],

      // Actions
      addTrade: (trade) =>
        set(
          (state) => ({
            trades: [trade, ...state.trades].slice(0, 1000), // Keep last 1000 trades
          }),
          false,
          'addTrade'
        ),

      updateOrderBook: (orderBook) =>
        set(
          (state) => {
            const newOrderBooks = new Map(state.orderBooks);
            newOrderBooks.set(orderBook.symbol, orderBook);
            return { orderBooks: newOrderBooks };
          },
          false,
          'updateOrderBook'
        ),

      setPositions: (positions) =>
        set({ positions }, false, 'setPositions'),

      updatePosition: (position) =>
        set(
          (state) => {
            const index = state.positions.findIndex(
              (p) => p.symbol === position.symbol
            );
            if (index >= 0) {
              const newPositions = [...state.positions];
              newPositions[index] = position;
              return { positions: newPositions };
            }
            return { positions: [...state.positions, position] };
          },
          false,
          'updatePosition'
        ),

      setOrders: (orders) =>
        set({ orders }, false, 'setOrders'),

      updateOrder: (order) =>
        set(
          (state) => {
            const index = state.orders.findIndex(
              (o) => o.orderId === order.orderId
            );
            if (index >= 0) {
              const newOrders = [...state.orders];
              newOrders[index] = order;
              return { orders: newOrders };
            }
            return { orders: [...state.orders, order] };
          },
          false,
          'updateOrder'
        ),

      addSignal: (signal) =>
        set(
          (state) => ({
            signals: [signal, ...state.signals].slice(0, 100), // Keep last 100 signals
          }),
          false,
          'addSignal'
        ),

      setRiskLimits: (limits) =>
        set({ riskLimits: limits }, false, 'setRiskLimits'),

      addConnectedSymbol: (symbol) =>
        set(
          (state) => ({
            connectedSymbols: new Set([...state.connectedSymbols, symbol]),
          }),
          false,
          'addConnectedSymbol'
        ),

      removeConnectedSymbol: (symbol) =>
        set(
          (state) => {
            const newSymbols = new Set(state.connectedSymbols);
            newSymbols.delete(symbol);
            return { connectedSymbols: newSymbols };
          },
          false,
          'removeConnectedSymbol'
        ),

      clearTrades: () =>
        set({ trades: [] }, false, 'clearTrades'),

      setPorts: (ports) =>
        set({ ports }, false, 'setPorts'),

      updatePortStatus: (port, status) =>
        set(
          (state) => {
            const newPorts = state.ports.map((p) =>
              p.port === port
                ? { ...p, status, lastUpdated: new Date().toISOString() }
                : p
            );
            return { ports: newPorts };
          },
          false,
          'updatePortStatus'
        ),

      reset: () =>
        set(
          {
            trades: [],
            orderBooks: new Map(),
            positions: [],
            orders: [],
            signals: [],
            riskLimits: null,
            connectedSymbols: new Set(),
            ports: [],
          },
          false,
          'reset'
        ),
    }),
    { name: 'TradingStore' }
  )
);
