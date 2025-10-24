import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { PlaceholderSection } from '../ui/placeholder-section';
import { BarChart3, Activity } from 'lucide-react';

/**
 * System Overview Page - KPIs and system health monitoring
 */
export function OverviewPage() {
  const sections = [
    {
      id: 'kpis',
      content: (
        <PlaceholderSection
          cardId="overview-kpis"
          title="KPIs"
          description="Key performance indicators: daily P&L, win rate, Sharpe ratio, maximum drawdown, and more."
          icon={<BarChart3 className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
    {
      id: 'system-health',
      content: (
        <PlaceholderSection
          cardId="overview-system-health"
          title="System Health"
          description="System health status: active services, latency, memory usage, CPU, and alerts."
          icon={<Activity className="w-5 h-5 text-green-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="overview"
      title="System Overview"
      subtitle="Real-time monitoring and KPIs"
      sections={sections}
      defaultColumns={2}
    />
  );
}
