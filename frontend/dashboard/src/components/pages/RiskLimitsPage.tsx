import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Calendar, Shield, AlertTriangle } from "lucide-react";

export function RiskLimitsPage() {
  const sections = [
    {
      id: "daily-limits",
      content: (
        <PlaceholderSection
          cardId="limits-daily"
          title="Daily Limits"
          description="Limites diários de perda: max loss, current loss, alertas."
          icon={<Calendar className="w-5 h-5 text-red-500" />}
        />
      ),
    },
    {
      id: "position-limits",
      content: (
        <PlaceholderSection
          cardId="limits-position"
          title="Position Limits"
          description="Limites de tamanho de posição: por ativo, total, margem."
          icon={<Shield className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: "exposure",
      content: (
        <PlaceholderSection
          cardId="limits-exposure"
          title="Exposure"
          description="Métricas de exposição: gross, net, by sector, concentração."
          icon={<AlertTriangle className="w-5 h-5 text-orange-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="risk-limits"
      title="Risk Limits"
      subtitle="Position and loss limits"
      sections={sections}
      defaultColumns={2}
    />
  );
}
