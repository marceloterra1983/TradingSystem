/**
 * LlamaIndex RAG Services Page
 *
 * Comprehensive RAG (Retrieval-Augmented Generation) management interface
 * with customizable layout, drag-and-drop cards, and collection management
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Server,
  Layers,
} from "@/icons";
import { Button } from "../ui/button";
import {
  CustomizablePageLayout,
  type PageSection,
} from "../layout/CustomizablePageLayout";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../ui/collapsible-card";
import { CollectionsManagementCard } from "./CollectionsManagementCard";
import LlamaIndexQueryTool from "./LlamaIndexQueryTool";
import { useRagManager } from "../../hooks/llamaIndex/useRagManager";
import type { Collection } from "../../types/collections";

/**
 * Format number with locale
 */
function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number" || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR");
}

/**
 * RAG Services Overview Card Content
 */
interface OverviewCardProps {
  loading: boolean;
  error: string | null;
  status: ReturnType<typeof useRagManager>["status"];
  onRefresh: () => void;
}

function OverviewCardContent({
  loading,
  error,
  status,
  onRefresh,
}: OverviewCardProps) {
  const services = useMemo(() => {
    if (!status) return [];
    return [
      {
        id: "query",
        label: "Query Service",
        ok: status.services?.query?.ok ?? false,
        message: status.services?.query?.message ?? "Sem dados",
        icon: Zap,
      },
      {
        id: "ingestion",
        label: "Ingestion Service",
        ok: status.services?.ingestion?.ok ?? false,
        message: status.services?.ingestion?.message ?? "Sem dados",
        icon: Server,
      },
      {
        id: "ollama",
        label: "Ollama LLM",
        ok: status.services?.ollama?.ok ?? false,
        message: status.services?.ollama?.message ?? "Sem dados",
        icon: Server,
      },
      {
        id: "redis",
        label: "Redis Cache",
        ok: status.services?.redis?.ok ?? false,
        message: status.services?.redis?.message ?? "Sem dados",
        icon: Layers,
      },
      {
        id: "collections",
        label: "Collections Service",
        ok: status.services?.collections?.ok ?? false,
        message: status.services?.collections?.message ?? "Sem dados",
        icon: RefreshCw,
      },
      {
        id: "qdrant",
        label: "Qdrant Vector DB",
        ok: status.qdrant?.ok ?? false,
        message: status.qdrant
          ? `${status.qdrant.collection} • ${formatNumber(status.qdrant.count)} vetores`
          : "Sem dados",
        icon: Zap,
      },
    ];
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
          <AlertTriangle className="inline h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {services.length === 0 && (
          <div className="col-span-full flex items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            <RefreshCw className="h-5 w-5 animate-spin text-slate-400" />
            Aguardando resposta dos serviços…
          </div>
        )}
        {services.map((service) => {
          const Icon = service.ok ? CheckCircle2 : AlertTriangle;
          const ServiceIcon = service.icon;
          return (
            <div
              key={service.id}
              className="rounded-lg border border-slate-200 p-4 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
            >
              <div className="mb-2 flex items-center gap-2">
                <ServiceIcon className="h-4 w-4 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {service.label}
                </span>
                <Icon
                  className={`h-4 w-4 ml-auto ${
                    service.ok ? "text-emerald-500" : "text-amber-500"
                  }`}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {service.message}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Main RAG Services Page
 */
export function LlamaIndexPage(): JSX.Element {
  const [activeCollection, setActiveCollection] = useState<string | null>(null);

  const {
    collections,
    collectionsLoading,
    collectionsError,
    models,
    status,
    statusLoading,
    statusError,
    createCollection,
    updateCollection,
    cloneCollection,
    deleteCollection,
    ingestCollection,
    refreshCollections,
    refreshStatus,
    resetCollectionsError,
  } = useRagManager({ statusCollection: activeCollection });

  // Auto-select first collection when available
  useEffect(() => {
    if (collections.length === 0) {
      setActiveCollection(null);
      return;
    }
    if (!activeCollection) {
      setActiveCollection(collections[0].name);
      return;
    }
    const exists = collections.some(
      (collection) => collection.name === activeCollection,
    );
    if (!exists) {
      setActiveCollection(collections[0].name);
    }
  }, [collections, activeCollection]);

  const currentCollection = useMemo(() => {
    if (!activeCollection && collections.length === 0) return null;
    return activeCollection ?? collections[0]?.name ?? null;
  }, [activeCollection, collections]);

  const handleCollectionChange = (name: string) => {
    setActiveCollection(name);
    refreshStatus();
  };

  // Define page sections with collapsible cards
  const sections: PageSection[] = useMemo(
    () => [
      {
        id: "rag-overview",
        content: (
          <CollapsibleCard id="rag-overview">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle>Visão Geral RAG</CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Status e monitoramento do sistema de Retrieval-Augmented
                Generation
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <OverviewCardContent
                loading={statusLoading}
                error={statusError}
                status={status}
                onRefresh={() => {
                  refreshStatus();
                  refreshCollections();
                }}
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: "collections-management",
        content: (
          <CollapsibleCard id="collections-management">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle>
                Gerenciamento de Coleções
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Configure e gerencie coleções RAG, modelos de embedding e
                diretórios de origem
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <CollectionsManagementCard
                collections={collections}
                models={models}
                isLoading={collectionsLoading}
                error={collectionsError}
                onCreateCollection={async (request) => {
                  await createCollection(request);
                }}
                onUpdateCollection={async (name, updates) => {
                  await updateCollection({ name, updates });
                }}
                onCloneCollection={async (name, newName) => {
                  await cloneCollection({ name, newName });
                }}
                onDeleteCollection={async (name) => {
                  await deleteCollection(name);
                  refreshStatus();
                }}
                onIngestCollection={async (name) => {
                  await ingestCollection(name);
                  refreshStatus();
                }}
                onRefreshCollections={refreshCollections}
                onClearError={resetCollectionsError}
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
      {
        id: "query-tool",
        content: (
          <CollapsibleCard id="query-tool">
            <CollapsibleCardHeader>
              <CollapsibleCardTitle>
                Ferramenta de Consulta
              </CollapsibleCardTitle>
              <CollapsibleCardDescription>
                Execute consultas semânticas e teste o sistema RAG em tempo real
              </CollapsibleCardDescription>
            </CollapsibleCardHeader>
            <CollapsibleCardContent>
              <LlamaIndexQueryTool
                collection={currentCollection}
                collections={collections as Collection[]}
                onCollectionChange={handleCollectionChange}
              />
            </CollapsibleCardContent>
          </CollapsibleCard>
        ),
      },
    ],
    [
      statusLoading,
      statusError,
      status,
      collections,
      models,
      collectionsLoading,
      collectionsError,
      currentCollection,
      refreshStatus,
      refreshCollections,
      createCollection,
      updateCollection,
      cloneCollection,
      deleteCollection,
      ingestCollection,
      resetCollectionsError,
      handleCollectionChange,
    ],
  );

  return (
    <CustomizablePageLayout
      pageId="rag-services"
      title="RAG Services"
      subtitle="Sistema de Retrieval-Augmented Generation"
      sections={sections}
      defaultColumns={2}
    />
  );
}

export default LlamaIndexPage;
