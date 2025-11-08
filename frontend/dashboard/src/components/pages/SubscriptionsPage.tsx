import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { List, Plus } from "lucide-react";

/**
 * Market Data Subscriptions Page
 */
export function SubscriptionsPage() {
  const sections = [
    {
      id: "active-subscriptions",
      content: (
        <PlaceholderSection
          cardId="subscriptions-active"
          title="Active Subscriptions"
          description="Assinaturas ativas de market data: tickers, order books, agregados."
          icon={<List className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "add-subscription",
      content: (
        <PlaceholderSection
          cardId="subscriptions-add"
          title="Add Subscription"
          description="Adicionar nova assinatura: escolha ativo, exchange, tipo de dados."
          icon={<Plus className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="subscriptions"
      title="Market Data Subscriptions"
      subtitle="Manage ticker and order book subscriptions"
      sections={sections}
      defaultColumns={2}
    />
  );
}
