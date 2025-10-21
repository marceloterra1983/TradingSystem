import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { cn } from '../../lib/utils';
import { Cpu, Database, FileText, Folder, Layers, Server, Shield, Sparkles, Target, Zap } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const highlightColors = {
  green: 'border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950',
  cyan: 'border-cyan-200 bg-cyan-50 dark:border-cyan-900 dark:bg-cyan-950',
  orange: 'border-orange-200 bg-orange-50 dark:border-orange-900 dark:bg-orange-950',
  purple: 'border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950',
} as const;

type HighlightColor = keyof typeof highlightColors;

const highlightItems: Array<{
  title: string;
  description: string;
  color: HighlightColor;
}> = [
  {
    title: 'Pipeline Windows-native',
    description: 'Data Capture (.NET + ProfitDLL), Analytics (Python) e Order Manager executam como Windows Services com SLA < 500ms.',
    color: 'green',
  },
  {
    title: 'Stacks Docker Compose',
    description: 'QuestDB, Prometheus, Grafana, LangGraph e demais serviços auxiliares rodam via Docker Compose documentado em scripts e compose files.',
    color: 'cyan',
  },
  {
    title: 'Dev scripts unificados',
    description: '`bash install-dependencies.sh`, `bash start-all-services.sh`, `bash check-services.sh` coordenam as APIs Node.js e o dashboard React.',
    color: 'orange',
  },
  {
    title: 'Documentação reorganizada',
    description: 'Docusaurus Context Hub + `guides/`, `reports/` e `archive/` oferecem guias operacionais, auditorias e histórico.',
    color: 'purple',
  },
];

export function EscopoOverview() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Overview</CardTitle>
        <CardDescription>Panorama do TradingSystem após a reorganização de infraestrutura e documentação</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            O <strong>TradingSystem</strong> captura mercado em tempo real via ProfitDLL, processa sinais com modelos de
            causa–efeito e executa ordens automaticamente — tudo nativamente em Windows. Serviços auxiliares (QuestDB,
            monitoramento, AI tooling) rodam em Docker Compose; APIs Node.js e o dashboard React executam via scripts locais.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {highlightItems.map((item) => (
              <div
                key={item.title}
                className={cn('rounded-lg border p-4', highlightColors[item.color])}
              >
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-2">{item.title}</h3>
                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-blue-900 dark:text-blue-200 mb-3">Snapshot rápido</h3>
            <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
              <li>• <strong>Trading core:</strong> Data Capture, Analytics, Order Manager e API Gateway em Windows Services.</li>
              <li>• <strong>APIs auxiliares:</strong> Idea Bank, TP Capital, B3 e Documentation API (Node.js/Express).</li>
              <li>• <strong>Infra Docker Compose:</strong> stacks `infrastructure`, `data`, `frontend`, `ai-tools` (ver `start-all-stacks.sh`).</li>
              <li>• <strong>Documentação:</strong> portal Docusaurus + índices `guides/`, `reports/` e histórico `archive/`.</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EscopoObjectives() {
  const colorClasses = {
    green: 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300',
    purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300',
    orange: 'bg-orange-100 text-orange-600 dark:bg-orange-900 dark:text-orange-300',
    cyan: 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900 dark:text-cyan-300',
    red: 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300',
    blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  } as const;

  type ObjectiveColor = keyof typeof colorClasses;

  const objectives: Array<{
    icon: LucideIcon;
    title: string;
    description: string;
    color: ObjectiveColor;
  }> = [
    {
      icon: Target,
      title: 'Market Data Capture',
      description: 'Captura tick-by-tick via ProfitDLL, serialização em memória e publicação WebSocket.',
      color: 'green',
    },
    {
      icon: Database,
      title: 'Storage & Historian',
      description: 'Parquet local para replay + QuestDB (Docker Compose) como fonte oficial de sinais e auditoria.',
      color: 'purple',
    },
    {
      icon: Cpu,
      title: 'Analytics / ML',
      description: 'Pipeline Python (SGDClassifier incremental) com feedback de ordens executadas.',
      color: 'orange',
    },
    {
      icon: Zap,
      title: 'Execução',
      description: 'Order Manager em C# garante envio < 200ms e tratamento de callbacks ProfitDLL.',
      color: 'cyan',
    },
    {
      icon: Shield,
      title: 'Risk & Compliance',
      description: 'Kill switch, limites diários/posição, auditoria e integração com Prometheus/Grafana.',
      color: 'red',
    },
    {
      icon: FileText,
      title: 'Documentação e Operação',
      description: 'Guides operacionais, relatórios e runbooks mantidos em `guides/` e `docs/context/`.',
      color: 'blue',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Objectives</CardTitle>
        <CardDescription>Resultados esperados por domínio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {objectives.map((obj) => {
            const Icon = obj.icon;
            return (
              <div key={obj.title} className="rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('rounded-lg p-2', colorClasses[obj.color])}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">{obj.title}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{obj.description}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export function EscopoArchitecture() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Architecture & Deployment</CardTitle>
        <CardDescription>Distribuição por camadas e responsabilidades</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-gray-700 dark:text-gray-300">
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Windows Core</h4>
              <p>Data Capture (.NET + DLL), Analytics (Python), Order Manager (C#) e API Gateway permanecem nativos.</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">APIs Node.js</h4>
              <p>Idea Bank, TP Capital, B3 e Documentation API em Express, rodando via scripts `start-all-services.sh`.</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Docker Compose</h4>
              <p>Stacks para infra, dados (QuestDB), builds do frontend e ferramentas de IA executadas via Docker Compose.</p>
            </div>
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Documentação / Operação</h4>
              <p>Docusaurus Context Hub + guias (`guides/`), relatórios (`reports/`) e histórico (`archive/`) como fonte única.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function EscopoTechStack() {
  const stack = [
    { layer: 'Data Capture / Order Manager', tech: '.NET 8, ProfitDLL', notes: 'Windows Services, integração broker', icon: Layers },
    { layer: 'Analytics', tech: 'Python 3.11, scikit-learn', notes: 'Modelos causa–efeito, atualização online', icon: Cpu },
    { layer: 'APIs', tech: 'Node.js 20, Express', notes: 'Idea Bank, TP Capital, B3, Documentation', icon: Server },
    { layer: 'Frontend', tech: 'React 18, Vite, Zustand', notes: 'Dashboard principal (http://localhost:3101)', icon: Folder },
    { layer: 'Storage', tech: 'Parquet, QuestDB', notes: 'Parquet local + QuestDB em Docker Compose', icon: Database },
    { layer: 'Doc Ops', tech: 'Docusaurus, MDX, PlantUML', notes: 'Portal em http://localhost:3004', icon: FileText },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tech Footprint</CardTitle>
        <CardDescription>Pilha tecnológica atual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stack.map((item) => (
            <div key={item.layer} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3 flex gap-3 items-start">
              <item.icon className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.layer}</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">{item.tech}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{item.notes}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function EscopoSystems() {
  const systems = [
    { name: 'Guides & Reports', icon: '📚', description: 'Operação diária documentada em `guides/README.md` e auditorias em `reports/`.' },
    { name: 'Docker Compose Stacks', icon: '🧱', description: 'Orquestração dos containers de dados, monitoring e AI tools.' },
    { name: 'Local APIs', icon: '🧩', description: 'APIs Node.js (Idea Bank, TP Capital, B3, Docs) iniciadas via scripts.' },
    { name: 'Windows Services', icon: '🖥️', description: 'Data Capture, Analytics, Order Manager e Gateway nativos.' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational Pillars</CardTitle>
        <CardDescription>Componentes que mantêm o ecossistema ativo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {systems.map((item) => (
            <div key={item.name} className="rounded-lg border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
              <div className="flex gap-3 items-start">
                <div className="text-2xl" aria-hidden>{item.icon}</div>
                <div>
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 mb-1">{item.name}</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function EscopoRequirements() {
  const performanceMetrics = [
    { metric: 'End-to-end (market → ordem)', target: '< 500ms p95', description: 'Inclui validação de risco e envio ProfitDLL.' },
    { metric: 'WebSocket throughput', target: '> 1.000 msg/s', description: 'Pipeline de market data.' },
    { metric: 'API Node.js', target: '< 200ms p95', description: 'Idea Bank, TP Capital, B3 e Docs.' },
    { metric: 'Persistência QuestDB', target: '< 150ms', description: 'ILP via stacks Docker Compose.' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance Targets</CardTitle>
        <CardDescription>Indicadores operacionais monitorados</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {performanceMetrics.map((item) => (
            <div key={item.metric} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">{item.metric}</h3>
                <span className="font-mono text-sm font-bold text-cyan-600 dark:text-cyan-400">{item.target}</span>
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{item.description}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function EscopoConstraints() {
  const constraints = [
    {
      icon: Shield,
      title: 'Windows é obrigatório para o core',
      description: 'ProfitDLL é 64-bit e exige acesso direto a hardware (latência, I/O, estabilidade).',
    },
    {
      icon: Zap,
      title: 'Docker apenas para auxiliares',
      description: 'Stacks Docker Compose hospedam QuestDB/monitoring, nunca o pipeline de trading.',
    },
    {
      icon: Sparkles,
      title: 'Scripts oficiais',
      description: 'Sempre usar `install-dependencies.sh`, `start-all-services.sh`, `check-services.sh` para garantir ambiente consistente.',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Operational Guardrails</CardTitle>
        <CardDescription>Restrições técnicas e práticas obrigatórias</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {constraints.map((item) => (
            <div key={item.title} className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950 p-3 flex gap-3 items-start">
              <item.icon className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
              <div>
                <h3 className="font-semibold text-sm text-red-800 dark:text-red-200">{item.title}</h3>
                <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
