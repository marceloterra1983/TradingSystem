import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import { FolderTree, Search } from '@/icons';

export function ParquetBrowserPage() {
  const sections = [
    {
      id: "file-tree",
      content: (
        <PlaceholderSection
          cardId="parquet-file-tree"
          title="File Tree"
          description="Navegador de arquivos Parquet organizados por ativo e data."
          icon={<FolderTree className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
    {
      id: "query-interface",
      content: (
        <PlaceholderSection
          cardId="parquet-query"
          title="Query Interface"
          description="Interface para consultar dados históricos: filtros por data, ativo, indicadores."
          icon={<Search className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="parquet-browser"
      title="Parquet File Browser"
      subtitle="Browse and query time-series data"
      sections={sections}
      defaultColumns={2}
    />
  );
}
