import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { PlaceholderSection } from '../ui/placeholder-section';
import { Tag, Database } from 'lucide-react';

export function MetadataPage() {
  const sections = [
    {
      id: 'symbols',
      content: (
        <PlaceholderSection
          cardId="metadata-symbols"
          title="Symbols"
          description="Metadados de ativos: ticker, exchange, tipo, especificações."
          icon={<Tag className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
    {
      id: 'datasets',
      content: (
        <PlaceholderSection
          cardId="metadata-datasets"
          title="Datasets"
          description="Catálogo de datasets disponíveis: período, granularidade, qualidade."
          icon={<Database className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="metadata"
      title="Metadata Management"
      subtitle="PostgreSQL metadata and catalog"
      sections={sections}
      defaultColumns={2}
    />
  );
}
