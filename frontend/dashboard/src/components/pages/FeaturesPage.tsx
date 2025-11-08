import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { List, BarChart3 } from "lucide-react";

export function FeaturesPage() {
  const sections = [
    {
      id: "feature-list",
      content: (
        <PlaceholderSection
          cardId="features-list"
          title="Feature List"
          description="Features disponíveis: aggressor_flow, volatility_roll, book_delta, volume_anomaly, MA."
          icon={<List className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
    {
      id: "feature-importance",
      content: (
        <PlaceholderSection
          cardId="features-importance"
          title="Importance"
          description="Importância das features para o modelo: ranking, correlações, visualizações."
          icon={<BarChart3 className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="features"
      title="Feature Engineering"
      subtitle="Feature extraction and importance"
      sections={sections}
      defaultColumns={2}
    />
  );
}
