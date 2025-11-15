import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Wifi, AlertTriangle } from "@/icons";

export function LogsColetaPage() {
  const sections = [
    {
      id: "connection-logs",
      content: (
        <PlaceholderSection
          cardId="logs-connection"
          title="Connection Logs"
          description="Connection logs for ProfitDLL and market-data feeds."
          icon={<Wifi className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "error-logs",
      content: (
        <PlaceholderSection
          cardId="logs-error"
          title="Error Logs"
          description="Error logs recorded during data capture."
          icon={<AlertTriangle className="w-5 h-5 text-red-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="logs-coleta"
      title="Data Capture Logs"
      subtitle="Connection logs and error tracking"
      sections={sections}
      defaultColumns={2}
    />
  );
}
