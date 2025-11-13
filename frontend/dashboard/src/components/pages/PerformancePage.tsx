import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { DollarSign, TrendingUp, LineChart } from '@/icons';

/**
 * Trading Performance Page - P&L, metrics, and analytics
 */
export function PerformancePage() {
  const sections = [
    {
      id: "pnl",
      content: (
        <PlaceholderSection
          cardId="performance-pnl"
          title="P&L"
          description="Análise de lucros e perdas: P&L diário, semanal, mensal, e anual. Gráficos de equity curve."
          icon={<DollarSign className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "metrics",
      content: (
        <PlaceholderSection
          cardId="performance-metrics"
          title="Metrics"
          description="Métricas de performance: Sharpe ratio, Sortino ratio, win rate, profit factor, max drawdown."
          icon={<TrendingUp className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: "charts",
      content: (
        <PlaceholderSection
          cardId="performance-charts"
          title="Charts"
          description="Gráficos de performance: equity curve, distribuição de retornos, underwater chart."
          icon={<LineChart className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="performance"
      title="Trading Performance"
      subtitle="P&L, metrics, and analytics"
      sections={sections}
      defaultColumns={2}
    />
  );
}
