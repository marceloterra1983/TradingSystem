import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { SignalsTable } from "./tp-capital/SignalsTable";
import { LogsViewer } from "./tp-capital/LogsViewer";
import { ForwardedMessagesTable } from "./tp-capital/ForwardedMessagesTable";
import { TelegramChannelsManager } from "./tp-capital/TelegramChannelsManager";

/**
 * TP Capital Opções Page
 * Dashboard para sinais, mensagens encaminhadas, gerenciamento de canais e logs
 * 
 * Refatorado em componentes menores para melhor manutenibilidade:
 * - SignalsTable: Tabela de sinais parseados com filtros e exportação
 * - ForwardedMessagesTable: Tabela de mensagens encaminhadas dos canais Telegram (não-sinais)
 * - TelegramChannelsManager: CRUD de canais para monitoramento automático
 * - LogsViewer: Visualizador de logs com filtros
 */
export function TPCapitalOpcoesPage() {
  const sections = [
    {
      id: 'tp-capital-signals',
      content: <SignalsTable />,
    },
    {
      id: 'tp-capital-forwarded-messages',
      content: <ForwardedMessagesTable />,
    },
    {
      id: 'tp-capital-channels-manager',
      content: <TelegramChannelsManager />,
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
