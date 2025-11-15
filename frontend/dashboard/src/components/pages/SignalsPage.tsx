import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Zap, TrendingUp } from "@/icons";

export function SignalsPage() {
  const sections = [
    {
      id: "recent-signals",
      content: (
        <PlaceholderSection
          cardId="signals-recent"
          title="Recent Signals"
          description="Sinais gerados recentemente: tipo (BUY/SELL), ativo, confiança, timestamp."
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
        />
      ),
    },
    {
      id: "signal-performance",
      content: (
        <PlaceholderSection
          cardId="signals-performance"
          title="Performance"
          description="Performance dos sinais: win rate, P&L médio, distribuição de acertos."
          icon={<TrendingUp className="w-5 h-5 text-green-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="signals"
      title="Trading Signals"
      subtitle="ML-generated buy/sell signals"
      sections={sections}
      defaultColumns={2}
    />
  );
}
