import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { FileText } from '@/icons';

export function ADRPage() {
  const sections = [
    {
      id: "adr-list",
      content: (
        <PlaceholderSection
          cardId="adr-list"
          title="ADR List"
          description="Lista de Architecture Decision Records: decisões técnicas, trade-offs, contexto."
          icon={<FileText className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="adr"
      title="Architecture Decision Records"
      subtitle="Technical decisions and trade-offs"
      sections={sections}
      defaultColumns={1}
    />
  );
}
