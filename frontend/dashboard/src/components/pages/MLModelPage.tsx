import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Brain, Settings, History } from "@/icons";

export function MLModelPage() {
  const sections = [
    {
      id: "model-status",
      content: (
        <PlaceholderSection
          cardId="ml-model-status"
          title="Model Status"
          description="Status do modelo ML: accuracy, precision, recall, F1-score, última atualização."
          icon={<Brain className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
    {
      id: "model-config",
      content: (
        <PlaceholderSection
          cardId="ml-model-config"
          title="Configuration"
          description="Configuração do modelo: hiperparâmetros, features selecionadas, thresholds."
          icon={<Settings className="w-5 h-5 text-gray-500" />}
        />
      ),
    },
    {
      id: "model-versions",
      content: (
        <PlaceholderSection
          cardId="ml-model-versions"
          title="Version History"
          description="Histórico de versões do modelo: performance, mudanças, rollback."
          icon={<History className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="ml-model"
      title="Machine Learning Model"
      subtitle="SGDClassifier cause-effect model"
      sections={sections}
      defaultColumns={2}
    />
  );
}
