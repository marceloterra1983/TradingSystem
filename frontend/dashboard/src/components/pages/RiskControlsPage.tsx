import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Power, Zap, Bell } from '@/icons';

export function RiskControlsPage() {
  const sections = [
    {
      id: "kill-switch",
      content: (
        <PlaceholderSection
          cardId="controls-kill-switch"
          title="Kill Switch"
          description="Botão de emergência: cancelar todas ordens, fechar posições, pausar trading."
          icon={<Power className="w-5 h-5 text-red-500" />}
        />
      ),
    },
    {
      id: "circuit-breakers",
      content: (
        <PlaceholderSection
          cardId="controls-circuit-breakers"
          title="Circuit Breakers"
          description="Configuração de circuit breakers: thresholds, ações automáticas."
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
        />
      ),
    },
    {
      id: "alerts",
      content: (
        <PlaceholderSection
          cardId="controls-alerts"
          title="Alerts"
          description="Alertas de risco: limites atingidos, anomalias, latência alta."
          icon={<Bell className="w-5 h-5 text-orange-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="controls"
      title="Risk Controls"
      subtitle="Kill switch and circuit breakers"
      sections={sections}
      defaultColumns={2}
    />
  );
}
