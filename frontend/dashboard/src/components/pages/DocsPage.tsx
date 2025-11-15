import {
  ExternalLink,
  BookOpen,
  FileText,
  CheckCircle2,
  Sparkles,
} from "@/icons";
import { Button } from "../ui/button";
import { apiConfig } from "../../config/api";

/**
 * Documentation portal link (Docusaurus)
 *
 * Provides quick access to the external Docusaurus site that now powers the TradingSystem docs.
 */
export function DocsLinkSection() {
  const handleOpenDocs = () => {
    window.open(apiConfig.docsUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-blue-600 dark:bg-blue-500 p-3">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">
              Documentação Técnica (Docusaurus)
            </h3>
            <p className="text-blue-700 dark:text-blue-300 text-base leading-relaxed">
              Acesse o hub de conhecimento com MDX + React, navegação
              versionada, i18n e componentes interativos.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              Conteúdo
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Arquitetura, guias, APIs, runbooks, PRDs, templates e glossário
            centralizado.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              Dev Experience
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Hot reload com Node 20+, navegação no `sidebars.ts` e metadados
            validados em CI.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-semibold text-slate-900 dark:text-slate-100">
              MDX + React
            </h4>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Componentes reutilizáveis para tabs, admonitions, diagramas e
            integrações com o design system.
          </p>
        </div>
      </div>

      {/* Main Action Card */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 mb-2">
            <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Abrir documentação Docusaurus
            </h3>
            <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
              A documentação está disponível através do Nginx Reverse Proxy em
              modo unificado.
            </p>
          </div>

          <Button
            onClick={handleOpenDocs}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white px-8 py-6 text-lg font-semibold gap-2"
          >
            <ExternalLink className="w-5 h-5" />
            Abrir documentação
          </Button>

          <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
            <p className="text-sm text-slate-500 dark:text-slate-500">
              URL:{" "}
              <code className="px-2 py-1 bg-slate-100 dark:bg-slate-900 rounded text-blue-600 dark:text-blue-400 font-mono text-xs">
                {apiConfig.docsUrl}
              </code>
            </p>
          </div>
        </div>
      </div>

      {/* Documentation Sections Overview */}
      <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Seções disponíveis
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
              Frontend
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4">
              <li>• Arquitetura, decisões e padrões UI</li>
              <li>• Guias de integração com APIs internas</li>
              <li>• Componentes MDX alinhados ao design system</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-green-600 dark:text-green-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-green-600 dark:bg-green-400 rounded-full"></span>
              Backend &amp; Data
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4">
              <li>• APIs, schemas, jobs e estratégias de logging</li>
              <li>• Modelagem de dados LowDB → Timescale/Parquet</li>
              <li>• Runbooks de integração com serviços críticos</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-600 dark:bg-red-400 rounded-full"></span>
              Ops
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4">
              <li>• Deploy/rollback, monitoração e DR</li>
              <li>• Checklists operacionais e alerting</li>
              <li>• Playbooks para incidentes críticos</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium text-purple-600 dark:text-purple-400 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full"></span>
              Shared / Product
            </h4>
            <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4">
              <li>• Templates (ADR, PRD, Runbook, Guides)</li>
              <li>• PRDs, RFCs, roadmap e sumários executivos</li>
              <li>• Glossário central com metadados padronizados</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Note Card */}
      <div className="rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950 p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <svg
              className="w-5 h-5 text-amber-600 dark:text-amber-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-1">
              Nota importante
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Garanta que o Docusaurus esteja rodando localmente com o servidor
              Nginx em execução para que o domínio unificado funcione
              corretamente.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
