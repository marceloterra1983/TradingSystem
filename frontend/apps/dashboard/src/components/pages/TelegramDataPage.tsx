import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { PlaceholderSection } from '../ui/placeholder-section';
import { MessageSquare, Zap } from 'lucide-react';

export function TelegramDataPage() {
  const sections = [
    {
      id: 'telegram-messages',
      content: (
        <PlaceholderSection
          cardId="telegram-messages"
          title="Messages"
          description="Mensagens capturadas dos canais do Telegram."
          icon={<MessageSquare className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: 'telegram-signals',
      content: (
        <PlaceholderSection
          cardId="telegram-signals"
          title="Signals"
          description="Sinais extraídos das mensagens: buy/sell, target, stop-loss."
          icon={<Zap className="w-5 h-5 text-yellow-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="telegram-data"
      title="Telegram Integration"
      subtitle="Messages and signals from Telegram"
      sections={sections}
      defaultColumns={2}
    />
  );
}
