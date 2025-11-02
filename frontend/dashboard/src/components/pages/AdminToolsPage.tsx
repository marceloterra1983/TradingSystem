import { CustomizablePageLayout } from '../layout/CustomizablePageLayout';
import { PlaceholderSection } from '../ui/placeholder-section';
import {
  ServerCog,
  Activity,
  NotebookPen,
  Workflow,
  GaugeCircle,
  LifeBuoy,
} from 'lucide-react';

/**
 * Admin Tools Page - Operational tooling and observability shortcuts
 */
export function AdminToolsPage() {
  const sections = [
    {
      id: 'service-health',
      content: (
        <PlaceholderSection
          cardId="admin-tools-service-health"
          title="Status de Serviços"
          description="Resumo rápido dos serviços monitorados pelo Laucher e links para dashboards."
          icon={<ServerCog className="w-5 h-5 text-emerald-500" />}
        />
      ),
    },
    {
      id: 'observability',
      content: (
        <PlaceholderSection
          cardId="admin-tools-observability"
          title="Observabilidade"
          description="Atalhos para Prometheus, Grafana, QuestDB e painéis de métricas."
          icon={<GaugeCircle className="w-5 h-5 text-blue-500" />}
        />
      ),
    },
    {
      id: 'runbooks',
      content: (
        <PlaceholderSection
          cardId="admin-tools-runbooks"
          title="Runbooks & ADRs"
          description="Checklist de incidentes, rollback e decisões arquiteturais relevantes."
          icon={<NotebookPen className="w-5 h-5 text-violet-500" />}
        />
      ),
    },
    {
      id: 'automation',
      content: (
        <PlaceholderSection
          cardId="admin-tools-automation"
          title="Automação"
          description="Integrações MCP, scripts de provisionamento e tarefas agendadas."
          icon={<Workflow className="w-5 h-5 text-orange-500" />}
        />
      ),
    },
    {
      id: 'incidents',
      content: (
        <PlaceholderSection
          cardId="admin-tools-incidents"
          title="Resposta a Incidentes"
          description="Painel para incidentes abertos, SLA/SLO e links para war rooms."
          icon={<LifeBuoy className="w-5 h-5 text-red-500" />}
        />
      ),
    },
    {
      id: 'activity-log',
      content: (
        <PlaceholderSection
          cardId="admin-tools-activity-log"
          title="Activity Log"
          description="Histórico de ações administrativas, alterações de configuração e auditoria."
          icon={<Activity className="w-5 h-5 text-amber-500" />}
        />
      ),
    },
  ];

  return (
    <CustomizablePageLayout
      pageId="admin-tools"
      title="Ferramentas Administrativas"
      subtitle="Operações, incidentes e integrações de observabilidade"
      sections={sections}
      defaultColumns={2}
    />
  );
}
