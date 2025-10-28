import * as React from 'react';
import {
  BookOpen,
  BarChart3,
  BrainCircuit,
  Server,
  Gauge,
  Workflow,
  Boxes,
} from 'lucide-react';

// ✅ LAZY LOADING - Pages loaded on-demand (Performance Optimization)
// This ensures only the current page's code is loaded, reducing initial bundle size by 40-60%

const LauncherPage = React.lazy(
  () => import('../components/pages/LauncherPage')
);
const WorkspacePageNew = React.lazy(
  () => import('../components/pages/WorkspacePageNew')
);
const TPCapitalOpcoesPage = React.lazy(
  () => import('../components/pages/TPCapitalOpcoesPage')
);
const DocusaurusPageNew = React.lazy(
  () => import('../components/pages/DocusaurusPage')
);
const DatabasePageNew = React.lazy(
  () => import('../components/pages/DatabasePage')
);
const MiroPage = React.lazy(() => import('../components/pages/MiroPage'));
const AgnoAgentsPage = React.lazy(
  () => import('../components/pages/AgnoAgentsPage')
);
const LangGraphPage = React.lazy(
  () => import('../components/pages/LangGraphPage')
);
const LlamaIndexPage = React.lazy(
  () => import('../components/pages/LlamaIndexPage')
);
const LangChainVectorPage = React.lazy(
  () => import('../components/pages/LangChainVectorPage')
);
const TelegramGatewayFinal = React.lazy(
  () => import('../components/pages/TelegramGatewayFinal')
);

/**
 * Page Part - Collapsible section within a page
 */
export interface PagePart {
  id: string;
  title: string;
  content: React.ReactNode;
}

/**
 * Page - Individual page with header and collapsible parts
 *
 * IMPORTANT: Use either `customContent` OR `parts`, not both.
 *
 * - `customContent`: For pages with CustomizablePageLayout (drag-and-drop grid)
 *   Example: Escopo page, Banco de Ideias, Connections
 *   Benefits: Drag-and-drop, multi-column layout, collapse/expand all
 *
 * - `parts`: For simple accordion-based pages (legacy pattern)
 *   Used for basic pages that don't need advanced layout features
 *   Consider migrating to customContent for better UX
 */
export interface Page {
  id: string;
  title: string;
  header: {
    title: string;
    subtitle?: string;
  };
  parts: PagePart[];
  customContent?: React.ReactNode;
  icon?: React.ReactNode;
}

/**
 * Section - Top-level navigation section containing multiple pages
 */
export interface Section {
  id: string;
  icon: React.ReactNode;
  label: string;
  pages: Page[];
}

/**
 * Trading System Navigation Structure
 *
 * Navigation Sections (current):
 * 0. Apps (Cyan) - TP Capital, Telegram Gateway, Workspace
 * 1. Knowledge (Indigo) - Docusaurus knowledge hub + documentation
 * 2. Infrastructure (Gray) - LangGraph, LlamaIndex, Launchers
 *
 * ===========================================================================
 * IMPORTANT: PAGE LAYOUT PATTERNS
 * ===========================================================================
 *
 * ✅ RECOMMENDED: CustomizablePageLayout (customContent)
 * -----------------------------------------------------
 * Use for pages that need:
 * - Drag-and-drop component rearrangement
 * - Multi-column grid layout (1, 2, 3, 4 columns)
 * - Collapsible cards with persist state
 * - Collapse/Expand all functionality
 * - Per-page layout persistence (localStorage)
 *
 * Example pages:
 * - Escopo (reference implementation)
 * - Banco de Ideias
 * - Conexões
 *
 * Structure:
 * {
 *   id: 'page-id',
 *   title: 'Page Title',
 *   header: { title: '...', subtitle: '...' },
 *   parts: [], // Empty - uses customContent
 *   customContent: <YourPageNew />,
 * }
 *
 * Implementation:
 * - Create sections with CollapsibleCard components
 * - Use CustomizablePageLayout to wrap sections
 * - See: frontend/README.md (seção "Sistema de Layout Customizável")
 *
 * ⚠️ LEGACY: Accordion Pattern (parts)
 * -------------------------------------
 * Simple accordion-based pages without advanced layout features.
 * Consider migrating to customContent for better UX.
 *
 * Structure:
 * {
 *   id: 'page-id',
 *   title: 'Page Title',
 *   header: { title: '...', subtitle: '...' },
 *   parts: [
 *     { id: 'part-id', title: 'Part Title', content: <Component /> }
 *   ],
 * }
 *
 * ===========================================================================
 */
export const NAVIGATION_DATA: Section[] = [
  // ========================================
  // 0. APPS (Cyan)
  // ========================================
  {
    id: 'dashboard',
    icon: <BarChart3 className="w-5 h-5" />,
    label: 'Apps',
    pages: [
      {
        id: 'tp-capital',
        title: 'TP CAPITAL',
        header: {
          title: 'TP CAPITAL',
          subtitle: 'Sinais Telegram em tempo real',
        },
        parts: [],
        customContent: <TPCapitalOpcoesPage />,
      },
      {
        id: 'telegram-gateway',
        title: 'Telegram Gateway',
        header: {
          title: 'Telegram Gateway',
          subtitle: 'Monitoramento do serviço MTProto, filas e mensagens persistidas',
        },
        parts: [],
        customContent: <TelegramGatewayFinal />,
      },
      {
        id: 'workspace',
        title: 'Workspace',
        header: {
          title: 'Workspace',
          subtitle: 'Ideias, sugestões e brainstorming de funcionalidades',
        },
        parts: [], // Empty - uses customContent
        // ✅ CustomizablePageLayout - 2 sections: CRUD table + Kanban board
        customContent: <WorkspacePageNew />,
      },
    ],
  },

  // ========================================
  // 1. KNOWLEDGE (Indigo)
  // ========================================
  {
    id: 'knowledge',
    icon: <BookOpen className="w-5 h-5" />,
    label: 'Knowledge',
    pages: [
      {
        id: 'docs',
        title: 'Docs',
        header: {
          title: 'TradingSystem Docs',
          subtitle:
            'Docs portal, context hub e referências operacionais atualizadas',
        },
        parts: [], // Empty - uses customContent
        customContent: <DocusaurusPageNew />,
      },
      {
        id: 'knowledge-database',
        title: 'Database',
        header: {
          title: 'Database Tools',
          subtitle:
            'QuestDB Console, pgAdmin, pgWeb e Adminer em um único painel',
        },
        parts: [],
        customContent: <DatabasePageNew />,
      },
      {
        id: 'miro',
        title: 'Miro',
        header: {
          title: 'Miro Board',
          subtitle:
            'Quadro colaborativo para planejamento visual e brainstorming',
        },
        parts: [],
        customContent: <MiroPage />,
      },
      {
        id: 'docs-hybrid-search',
        title: 'Docs Search (Hybrid)',
        header: {
          title: 'Docs Hybrid Search',
          subtitle: 'Busca híbrida (lexical + vetorial) com reranking e âncoras',
        },
        parts: [],
        customContent: (
          <React.Suspense fallback={<div className="p-4 text-sm">Carregando…</div>}>
            {/** Lazy import to keep initial bundle small */}
            {React.createElement(React.lazy(() => import('../components/pages/DocsHybridSearchPage')))}
          </React.Suspense>
        ),
      },
    ],
  },

  // ========================================
  // 2. INFRASTRUCTURE (Gray)
  // ========================================
  {
    id: 'configuracoes',
    icon: <Server className="h-5 w-5" />,
    label: 'Infrastructure',
    pages: [
      {
        id: 'langgraph-orchestrator',
        title: 'LangGraph',
        header: {
          title: 'LangGraph Orchestrator',
          subtitle:
            'State machine determinística para workflows multi-agente do LangChain.',
        },
        parts: [],
        customContent: <LangGraphPage />,
        icon: <Workflow className="h-4 w-4" />,
      },
      {
        id: 'llamaindex-services',
        title: 'LlamaIndex',
        header: {
          title: 'LlamaIndex RAG Services',
          subtitle:
            'Consultas, ingestão e integrações RAG baseadas em LangChain.',
        },
        parts: [],
        customContent: <LlamaIndexPage />,
        icon: <BrainCircuit className="h-4 w-4" />,
      },
      {
        id: 'langchain-vector-store',
        title: 'Vector Store',
        header: {
          title: 'LangChain Vector Store (Qdrant)',
          subtitle:
            'Monitoramento e operações do banco vetorial utilizado pelos fluxos LangChain/LlamaIndex.',
        },
        parts: [],
        customContent: <LangChainVectorPage />,
        icon: <Boxes className="h-4 w-4" />,
      },
      {
        id: 'agno-agents',
        title: 'Agno Agents',
        header: {
          title: 'Agno Multi-Agent Framework',
          subtitle:
            'Links operacionais, métricas e documentação do serviço Python',
        },
        parts: [],
        customContent: <AgnoAgentsPage />,
      },
      {
        id: 'status',
        title: 'Status',
        header: {
          title: 'Service Status',
          subtitle: 'Start, stop e monitoramento dos serviços locais',
        },
        parts: [], // Empty - uses customContent
        // ✅ CustomizablePageLayout - Drag-and-drop grid with collapsible cards
        customContent: <LauncherPage />,
        icon: <Gauge className="h-4 w-4" />,
      },
    ],
  },
];

/**
 * Flatten all pages from all sections for easy lookup
 */
export const ALL_PAGES = NAVIGATION_DATA.flatMap((section) => section.pages);

/**
 * Get page by ID
 */
export function getPageById(pageId: string): Page | undefined {
  return ALL_PAGES.find((page) => page.id === pageId);
}

/**
 * Get section by page ID
 */
export function getSectionByPageId(pageId: string): Section | undefined {
  return NAVIGATION_DATA.find((section) =>
    section.pages.some((page) => page.id === pageId)
  );
}

/**
 * Get default page (first page of first section)
 */
export function getDefaultPage(): Page {
  return NAVIGATION_DATA[0].pages[0];
}
