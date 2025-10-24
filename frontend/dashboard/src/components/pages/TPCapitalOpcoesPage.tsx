import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { SignalsTable } from "./tp-capital/SignalsTable";
import { LogsViewer } from "./tp-capital/LogsViewer";

/**
 * TP Capital Opções Page
 * Dashboard para sinais e logs do TP Capital
 * 
 * Refatorado em componentes menores para melhor manutenibilidade:
 * - SignalsTable: Tabela de sinais com filtros e exportação
 * - LogsViewer: Visualizador de logs com filtros
 * - api.ts: Funções de fetch
 * - utils.ts: Utilitários de formatação
 * - types.ts: Definições de tipos
 * - constants.ts: Constantes e dados de exemplo
 */
export function TPCapitalOpcoesPage() {
  const sections = [
    {
      id: 'tp-capital-signals',
      content: <SignalsTable />,
    },
    {
      id: 'tp-capital-logs',
      content: <LogsViewer />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="tp-capital"
      title="TP Capital - Sinais de Opções"
      sections={sections}
      defaultColumns={1}
    />
  );
}

export default TPCapitalOpcoesPage;
