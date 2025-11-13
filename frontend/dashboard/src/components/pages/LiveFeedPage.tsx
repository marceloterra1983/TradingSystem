import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Radio, BookOpen } from '@/icons';

export function LiveFeedPage() {
  const sections = [
    {
      id: "trade-feed",
      content: (
        <PlaceholderSection
          cardId="live-trade-feed"
          title="Trade Feed"
          description="Feed em tempo real de trades executados: preço, volume, aggressor."
          icon={<Radio className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "orderbook-feed",
      content: (
        <PlaceholderSection
          cardId="live-orderbook-feed"
          title="Order Book Feed"
          description="Atualizações do order book em tempo real."
          icon={<BookOpen className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="live-feed"
      title="Live Market Feed"
      subtitle="Real-time trades and order book updates"
      sections={sections}
      defaultColumns={2}
    />
  );
}
