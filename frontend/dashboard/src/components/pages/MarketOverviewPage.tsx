import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Activity, TrendingUp } from '@/icons';

/**
 * Market Overview Page - Current market conditions
 */
export function MarketOverviewPage() {
  const sections = [
    {
      id: "market-status",
      content: (
        <PlaceholderSection
          cardId="market-status"
          title="Market Status"
          description="Status atual do mercado: horário de negociação, volume, volatilidade."
          icon={<Activity className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
    {
      id: "top-movers",
      content: (
        <PlaceholderSection
          cardId="market-top-movers"
          title="Top Movers"
          description="Maiores altas e quedas do dia, ativos mais negociados."
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="market-overview"
      title="Market Overview"
      subtitle="Current market conditions"
      sections={sections}
      defaultColumns={2}
    />
  );
}
