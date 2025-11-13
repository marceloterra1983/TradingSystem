import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Clock, History, Edit } from '@/icons';

export function OrdersPage() {
  const sections = [
    {
      id: "active-orders",
      content: (
        <PlaceholderSection
          cardId="orders-active"
          title="Active Orders"
          description="Ordens ativas: pending, partial filled, status, tipo."
          icon={<Clock className="w-5 h-5 text-yellow-500" />}
        />
      ),
    },
    {
      id: "order-history",
      content: (
        <PlaceholderSection
          cardId="orders-history"
          title="Order History"
          description="Histórico de ordens: filled, rejected, cancelled, timestamps."
          icon={<History className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: "manual-order",
      content: (
        <PlaceholderSection
          cardId="orders-manual"
          title="Manual Order"
          description="Entrada manual de ordens: market, limit, stop, ativos disponíveis."
          icon={<Edit className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="orders"
      title="Order Management"
      subtitle="Order execution and tracking"
      sections={sections}
      defaultColumns={2}
    />
  );
}
