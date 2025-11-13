import { CustomizablePageLayout } from "../layout/CustomizablePageLayout";
import { PlaceholderSection } from "../ui/placeholder-section";
import {
  User,
  Bell,
  Palette,
  Globe,
  Shield,
  Database,
  Zap,
} from '@/icons';

/**
 * Settings Page - System configuration and user preferences
 */
export function SettingsPage() {
  const sections = [
    {
      id: "user-profile",
      content: (
        <PlaceholderSection
          cardId="settings-user-profile"
          title="Perfil do Usuário"
          description="Configurações de perfil: nome, email, foto, senha, autenticação 2FA."
          icon={<User className="w-5 h-5 text-cyan-500" />}
        />
      ),
    },
    {
      id: "notifications",
      content: (
        <PlaceholderSection
          cardId="settings-notifications"
          title="Notificações"
          description="Configurar alertas: email, push, Telegram, Discord. Escolha eventos para notificar."
          icon={<Bell className="w-5 h-5 text-yellow-500" />}
        />
      ),
    },
    {
      id: "appearance",
      content: (
        <PlaceholderSection
          cardId="settings-appearance"
          title="Aparência"
          description="Tema (light/dark/auto), cores de acento, fonte, densidade da interface."
          icon={<Palette className="w-5 h-5 text-purple-500" />}
        />
      ),
    },
    {
      id: "language",
      content: (
        <PlaceholderSection
          cardId="settings-language"
          title="Idioma e Região"
          description="Idioma da interface (PT-BR/EN-US), timezone, formato de data/hora, moeda."
          icon={<Globe className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: "security",
      content: (
        <PlaceholderSection
          cardId="settings-security"
          title="Segurança"
          description="Autenticação 2FA, sessões ativas, API keys, whitelist de IPs."
          icon={<Shield className="w-5 h-5 text-red-500" />}
        />
      ),
    },
    {
      id: "data-storage",
      content: (
        <PlaceholderSection
          cardId="settings-data-storage"
          title="Armazenamento de Dados"
          description="Configurações de retenção: dias de dados históricos, compressão, limpeza automática."
          icon={<Database className="w-5 h-5 text-green-500" />}
        />
      ),
    },
    {
      id: "performance",
      content: (
        <PlaceholderSection
          cardId="settings-performance"
          title="Performance"
          description="Otimizações: cache, lazy loading, pré-carregamento, refresh rate de gráficos."
          icon={<Zap className="w-5 h-5 text-orange-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="settings"
      title="Configurações"
      subtitle="Preferências do sistema e configurações do usuário"
      sections={sections}
      defaultColumns={2}
    />
  );
}
