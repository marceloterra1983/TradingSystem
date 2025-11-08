import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { Save, RefreshCcw } from "lucide-react";

export function BackupRestorePage() {
  const sections = [
    {
      id: "backups",
      content: (
        <PlaceholderSection
          cardId="backup-list"
          title="Backups"
          description="Gerenciamento de backups: criar, agendar, listar backups existentes."
          icon={<Save className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "restore",
      content: (
        <PlaceholderSection
          cardId="backup-restore"
          title="Restore"
          description="Interface para restaurar backups: escolha data, validação, restore."
          icon={<RefreshCcw className="w-5 h-5 text-orange-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="backup-restore"
      title="Backup & Restore"
      subtitle="Database backup and recovery"
      sections={sections}
      defaultColumns={2}
    />
  );
}
