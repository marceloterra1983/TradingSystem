import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { FileText, Shield } from '@/icons';

/**
 * System Logs Page - Centralized logging and audit trail
 */
export function LogsDashboardPage() {
  const sections = [
    {
      id: "system-logs",
      content: (
        <PlaceholderSection
          cardId="logs-system"
          title="System Logs"
          description="Logs centralizados de todos os serviços: erros, warnings, info."
          icon={<FileText className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: "audit-trail",
      content: (
        <PlaceholderSection
          cardId="logs-audit"
          title="Audit Trail"
          description="Trilha de auditoria: todas as ações de trading, mudanças de configuração."
          icon={<Shield className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="logs-dashboard"
      title="System Logs"
      subtitle="Centralized logging and audit trail"
      sections={sections}
      defaultColumns={2}
    />
  );
}
