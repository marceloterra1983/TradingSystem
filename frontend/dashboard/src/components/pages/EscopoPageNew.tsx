import { BookOpen, Target, Layers, Cpu, Building2, ListChecks, AlertTriangle } from 'lucide-react';

/**
 * Escopo Page (New) - TradingSystem Project Overview
 * Comprehensive project scope and architecture overview
 */

function EscopoOverview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Visão Geral do Projeto</h2>
      </div>
      <div className="prose dark:prose-invert max-w-none">
        <p className="text-slate-700 dark:text-slate-300">
          O <strong>TradingSystem</strong> é uma plataforma integrada de negociação que combina análise de mercado,
          gestão de risco, execução automatizada e monitoramento em tempo real.
        </p>
        <p className="text-slate-700 dark:text-slate-300">
          A arquitetura é baseada em microserviços com APIs REST, processamento de eventos em tempo real,
          armazenamento otimizado para séries temporais e interfaces de usuário modernas.
        </p>
      </div>
    </div>
  );
}

function EscopoObjectives() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Objetivos</h2>
      </div>
      <ul className="space-y-2 text-slate-700 dark:text-slate-300">
        <li className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
          <span>Captura e processamento de dados de mercado em tempo real</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
          <span>Gestão automatizada de posições e ordens</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
          <span>Monitoramento de risco e compliance</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
          <span>Análise e visualização de performance</span>
        </li>
        <li className="flex items-start gap-2">
          <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
          <span>Integração com provedores externos (Telegram, B3, brokers)</span>
        </li>
      </ul>
    </div>
  );
}

function EscopoArchitecture() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Arquitetura</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Frontend</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            React + Vite, TailwindCSS, TanStack Query, Recharts para visualizações
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Backend APIs</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Node.js + Express, microserviços especializados por domínio
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Dados</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            TimescaleDB, QuestDB, Parquet para analytics
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Infraestrutura</h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Docker Compose, Prometheus, Grafana, Redis
          </p>
        </div>
      </div>
    </div>
  );
}

function EscopoTechStack() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="w-6 h-6 text-cyan-600 dark:text-cyan-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Stack Tecnológico</h2>
      </div>
      <div className="space-y-3">
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Linguagens</h3>
          <div className="flex flex-wrap gap-2">
            {['TypeScript', 'JavaScript', 'Python', 'C#'].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm">
                {tech}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Frameworks & Libraries</h3>
          <div className="flex flex-wrap gap-2">
            {['React', 'Express', 'Vite', 'TailwindCSS', 'Prisma', 'LangGraph'].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full text-sm">
                {tech}
              </span>
            ))}
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-2">Databases & Storage</h3>
          <div className="flex flex-wrap gap-2">
            {['TimescaleDB', 'QuestDB', 'PostgreSQL', 'Redis', 'Qdrant'].map((tech) => (
              <span key={tech} className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full text-sm">
                {tech}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function EscopoSystems() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <Building2 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Sistemas</h2>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {[
          { name: 'Dashboard', port: '3103', desc: 'Interface principal React + Vite' },
          { name: 'Workspace API', port: '3200', desc: 'Gestão de workspace e documentação' },
          { name: 'Documentation API', port: '3400', desc: 'API de busca e gerenciamento de docs' },
          { name: 'B3 Market Data', port: '3302', desc: 'Dados de mercado B3' },
          { name: 'Status API', port: '3500', desc: 'Monitoramento e orquestração' },
          { name: 'TP-Capital', port: '4005', desc: 'Ingestão de sinais Telegram' },
        ].map((system) => (
          <div key={system.port} className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-800">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-slate-100">{system.name}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{system.desc}</p>
              </div>
              <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-mono">
                :{system.port}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EscopoRequirements() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <ListChecks className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Requisitos</h2>
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">Funcionais</h3>
          <ul className="space-y-1 text-sm text-indigo-700 dark:text-indigo-300">
            <li>• Captura de dados de mercado em tempo real</li>
            <li>• Execução automatizada de ordens</li>
            <li>• Cálculo de métricas de risco</li>
            <li>• Visualização de posições e P&L</li>
            <li>• Integração com APIs externas</li>
          </ul>
        </div>
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4">
          <h3 className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">Não-Funcionais</h3>
          <ul className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
            <li>• Latência &lt; 100ms para ordens críticas</li>
            <li>• Disponibilidade 99.9% durante horário de mercado</li>
            <li>• Persistência de dados com replicação</li>
            <li>• Auditoria completa de operações</li>
            <li>• Observabilidade via Prometheus + Grafana</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function EscopoConstraints() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Restrições</h2>
      </div>
      <div className="space-y-3">
        <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-4">
          <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Técnicas</h3>
          <ul className="space-y-1 text-sm text-amber-700 dark:text-amber-300">
            <li>• Ambiente: Linux (WSL2), Docker Desktop</li>
            <li>• Node.js 20+, TypeScript 5+</li>
            <li>• Desenvolvimento local, sem cloud por enquanto</li>
            <li>• Limites de rate da API B3 (60 req/min)</li>
          </ul>
        </div>
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Operacionais</h3>
          <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
            <li>• Horário de operação: 9h-18h (horário de mercado)</li>
            <li>• Backup diário obrigatório</li>
            <li>• Logs com retenção de 30 dias</li>
            <li>• Compliance com regulação CVM</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function EscopoPageNew() {
  return (
    <div className="space-y-6 max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          TradingSystem - Escopo do Projeto
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Visão completa da arquitetura, objetivos e sistemas do TradingSystem
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <EscopoOverview />
        </div>
        
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <EscopoObjectives />
        </div>
        
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 lg:col-span-2">
          <EscopoArchitecture />
        </div>
        
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <EscopoTechStack />
        </div>
        
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <EscopoSystems />
        </div>
        
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <EscopoRequirements />
        </div>
        
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
          <EscopoConstraints />
        </div>
      </div>
    </div>
  );
}

export default EscopoPageNew;
