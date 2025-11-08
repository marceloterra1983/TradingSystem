import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { TrendingUp, History } from "lucide-react";

export function PositionsPage() {
  const sections = [
    {
      id: "active-positions",
      content: (
        <PlaceholderSection
          cardId="positions-active"
          title="Active Positions"
          description="Posições abertas: ativo, quantidade, P&L unrealized, entry price."
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "position-history",
      content: (
        <PlaceholderSection
          cardId="positions-history"
          title="Position History"
          description="Histórico de posições: P&L realized, holding time, win/loss."
          icon={<History className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="positions"
      title="Active Positions"
      subtitle="Current positions and P&L"
      sections={sections}
      defaultColumns={2}
    />
  );
}
