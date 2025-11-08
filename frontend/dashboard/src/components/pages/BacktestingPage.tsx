import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { History, Play } from "lucide-react";

export function BacktestingPage() {
  const sections = [
    {
      id: "backtest-runs",
      content: (
        <PlaceholderSection
          cardId="backtest-runs"
          title="Backtest Runs"
          description="Histórico de backtests executados: período, P&L, Sharpe, drawdown."
          icon={<History className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: "backtest-new",
      content: (
        <PlaceholderSection
          cardId="backtest-new"
          title="New Backtest"
          description="Executar novo backtest: escolha período, estratégia, parâmetros."
          icon={<Play className="w-5 h-5 text-green-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="backtesting"
      title="Backtesting Framework"
      subtitle="Historical strategy testing"
      sections={sections}
      defaultColumns={2}
    />
  );
}
