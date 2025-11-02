import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '../ui/card';
import { useTradingStore } from '../../store/appStore';
import type { Trade } from '../../store/appStore';
import { TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Dashboard Page Components
 * These will be integrated into the navigation data structure
 */

export function DashboardKPIs() {
  const positions = useTradingStore((state) => state.positions);
  const orders = useTradingStore((state) => state.orders);
  const signals = useTradingStore((state) => state.signals);

  // Calculate KPIs
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const totalPositions = positions.length;
  const activeOrders = orders.filter(
    (o) => o.status === 'SUBMITTED' || o.status === 'PARTIAL',
  ).length;
  const recentSignals = signals.slice(0, 10).length;

  const kpis = [
    {
      title: 'Total P&L',
      value: `$${totalPnL.toFixed(2)}`,
      change: totalPnL >= 0 ? '+' + totalPnL.toFixed(2) : totalPnL.toFixed(2),
      trend: totalPnL >= 0 ? 'up' : 'down',
      icon: DollarSign,
    },
    {
      title: 'Active Positions',
      value: totalPositions,
      change: `${totalPositions} open`,
      trend: 'neutral',
      icon: Activity,
    },
    {
      title: 'Active Orders',
      value: activeOrders,
      change: `${activeOrders} pending`,
      trend: 'neutral',
      icon: TrendingUp,
    },
    {
      title: 'Recent Signals',
      value: recentSignals,
      change: `Last 10 signals`,
      trend: 'neutral',
      icon: TrendingDown,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        return (
          <Card key={kpi.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    {kpi.title}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
                    {kpi.value}
                  </p>
                  <p
                    className={cn(
                      'mt-1 text-sm font-medium',
                      kpi.trend === 'up' &&
                        'text-green-600 dark:text-green-400',
                      kpi.trend === 'down' && 'text-red-600 dark:text-red-400',
                      kpi.trend === 'neutral' &&
                        'text-gray-500 dark:text-gray-400',
                    )}
                  >
                    {kpi.change}
                  </p>
                </div>
                <div
                  className={cn(
                    'rounded-full p-3',
                    kpi.trend === 'up' && 'bg-green-100',
                    kpi.trend === 'down' && 'bg-red-100',
                    kpi.trend === 'neutral' && 'bg-gray-100 dark:bg-gray-800',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-6 w-6',
                      kpi.trend === 'up' &&
                        'text-green-600 dark:text-green-400',
                      kpi.trend === 'down' && 'text-red-600 dark:text-red-400',
                      kpi.trend === 'neutral' &&
                        'text-gray-600 dark:text-gray-400',
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function DashboardMarketOverview() {
  const trades = useTradingStore((state) => state.trades);

  // Get latest trades by symbol
  const latestTrades = React.useMemo(() => {
    const tradesBySymbol = new Map<string, Trade>();
    trades.forEach((trade) => {
      if (!tradesBySymbol.has(trade.symbol)) {
        tradesBySymbol.set(trade.symbol, trade);
      }
    });
    return Array.from(tradesBySymbol.values()).slice(0, 5);
  }, [trades]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Overview</CardTitle>
        <CardDescription>Latest market prices</CardDescription>
      </CardHeader>
      <CardContent>
        {latestTrades.length > 0 ? (
          <div className="space-y-3">
            {latestTrades.map((trade) => (
              <div
                key={trade.symbol}
                className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-gray-700 p-3"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {trade.symbol}
                  </p>
                  <p className="text-sm text-gray-500">
                    Vol: {trade.volume.toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                    ${trade.price.toFixed(2)}
                  </p>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      trade.aggressor === 'BUY'
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400',
                    )}
                  >
                    {trade.aggressor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500">No market data available</p>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardRecentActivity() {
  const trades = useTradingStore((state) => state.trades);
  const orders = useTradingStore((state) => state.orders);

  const recentTrades = trades.slice(0, 5);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Recent Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
          <CardDescription>Latest market trades</CardDescription>
        </CardHeader>
        <CardContent>
          {recentTrades.length > 0 ? (
            <div className="space-y-2">
              {recentTrades.map((trade, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {trade.symbol}
                  </span>
                  <span className="font-mono text-gray-700">
                    ${trade.price.toFixed(2)}
                  </span>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-medium',
                      trade.aggressor === 'BUY'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
                    )}
                  >
                    {trade.aggressor}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No recent trades</p>
          )}
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
          <CardDescription>Latest order activity</CardDescription>
        </CardHeader>
        <CardContent>
          {recentOrders.length > 0 ? (
            <div className="space-y-2">
              {recentOrders.map((order) => (
                <div
                  key={order.orderId}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {order.symbol}
                  </span>
                  <span className="text-gray-700">
                    {order.quantity} @ ${order.price?.toFixed(2) || 'Market'}
                  </span>
                  <span
                    className={cn(
                      'rounded px-2 py-0.5 text-xs font-medium',
                      order.status === 'FILLED' &&
                        'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-400',
                      order.status === 'SUBMITTED' &&
                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-400',
                      order.status === 'CANCELED' &&
                        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
                      order.status === 'REJECTED' &&
                        'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-400',
                    )}
                  >
                    {order.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No recent orders</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
