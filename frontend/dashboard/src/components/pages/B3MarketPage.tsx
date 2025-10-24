import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { OverviewSection } from './b3-market/OverviewSection';
import { AdjustmentsSection } from './b3-market/AdjustmentsSection';

/**
 * B3 Market Data Page
 * Dashboard para dados de mercado B3 (Snapshots, Indicadores, Gamma, Ajustes)
 * 
 * Refatorado em componentes menores para melhor manutenibilidade:
 * - OverviewSection: Snapshots, Indicadores, Gamma e DXY
 * - AdjustmentsSection: Ajustes recorrentes com filtros
 * - types.ts: Definições de tipos
 * - utils.ts: Utilitários de formatação
 */
export function B3MarketPage() {
  const sections = [
    {
      id: 'b3-overview',
      content: <OverviewSection />,
    },
    {
      id: 'b3-adjustments',
      content: <AdjustmentsSection />,
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="b3-market"
      title="B3 - Dados de Mercado"
      sections={sections}
      defaultColumns={1}
    />
  );
}

export default B3MarketPage;
