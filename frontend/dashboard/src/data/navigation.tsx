import { lazy, ReactNode } from "react";
import {
  BookOpen,
  BarChart3,
  BrainCircuit,
  Server,
  ShieldCheck,
  Workflow,
  Bot,
  TrendingUp,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Flame,
  List,
  FileText,
  Database,
  Layout,
  GitBranch,
  MessageCircle,
  FolderTree,
} from '@/icons';

// ✅ LAZY LOADING - Pages loaded on-demand (Performance Optimization)
// This ensures only the current page's code is loaded, reducing initial bundle size by 40-60%

const WorkspacePageNew = lazy(() => import("../components/pages/WorkspacePageNew"));
const TPCapitalOpcoesPage = lazy(
  () => import("../components/pages/TPCapitalOpcoesPage"),
);
const DocusaurusPageNew = lazy(() => import("../components/pages/DocusaurusPage"));
const DatabasePageNew = lazy(() => import("../components/pages/DatabasePage"));
const MiroPage = lazy(() => import("../components/pages/MiroPage"));
const LlamaIndexPage = lazy(() => import("../components/pages/LlamaIndexPage"));
const KestraPage = lazy(() => import("../components/pages/KestraPage"));
const CatalogPage = lazy(() => import("../components/pages/CatalogPage"));
const CourseCrawlerPage = lazy(
  () => import("../components/pages/CourseCrawlerPage"),
);
const GovernancePage = lazy(() => import("../components/pages/GovernancePage"));
const TelegramGatewayFinal = lazy(
  () => import("../components/pages/TelegramGatewayFinal"),
);
const N8nPage = lazy(() => import("../components/pages/N8nPage"));
const WahaPage = lazy(() => import("../components/pages/WahaPage"));
const EvolutionPage = lazy(() => import("../components/pages/EvolutionPage"));
const FirecrawlPage = lazy(() => import("../components/pages/FirecrawlPage"));
const StructureMapPage = lazy(
  () => import("../components/pages/StructureMapPage"),
);

// ✅ FUNCTIONAL LAZY LOADING - Components created only when page is navigated to
// Use functions instead of eager instantiation to enable true code splitting
// Benefits: Smaller initial bundle, faster load time, better performance
const tpCapitalContent = () => <TPCapitalOpcoesPage />;
const telegramGatewayContent = () => <TelegramGatewayFinal />;
const workspaceContent = () => <WorkspacePageNew />;
const docusaurusContent = () => <DocusaurusPageNew />;
const databaseContent = () => <DatabasePageNew />;
const miroContent = () => <MiroPage />;
const llamaIndexContent = () => <LlamaIndexPage />;
const kestraContent = () => <KestraPage />;
const claudeCatalogContent = () => <CatalogPage />;
const courseCrawlerContent = () => <CourseCrawlerPage />;
const governanceContent = () => <GovernancePage />;
const n8nContent = () => <N8nPage />;
const wahaContent = () => <WahaPage />;
const evolutionContent = () => <EvolutionPage />;
const firecrawlContent = () => <FirecrawlPage />;
const structureMapContent = () => <StructureMapPage />;

/**
 * Page Part - Collapsible section within a page
 */
export interface PagePart {
  id: string;
  title: string;
  content: ReactNode;
}

/**
 * Page - Individual page with header and collapsible parts
 *
 * IMPORTANT: Use either `customContent` OR `parts`, not both.
 *
 * - `customContent`: For pages with CustomizablePageLayout (drag-and-drop grid)
 *   Example: Escopo page, Banco de Ideias, Connections
 *   Benefits: Drag-and-drop, multi-column layout, collapse/expand all
 *   Can be React.ReactNode (eager) or () => React.ReactNode (lazy - recommended)
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
  customContent?: ReactNode | (() => ReactNode);
  icon?: ReactNode;
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
 * 1. Toolbox (Gray) - LlamaIndex, Launchers
 * 2. Knowledge (Indigo) - Docusaurus knowledge hub + documentation
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
    id: "dashboard",
    icon: <BarChart3 className="w-5 h-5" />,
    label: "Apps",
    pages: [
      {
        id: "tp-capital",
        title: "TP CAPITAL",
        header: {
          title: "TP CAPITAL",
          subtitle: "Sinais Telegram em tempo real",
        },
        parts: [],
        customContent: tpCapitalContent,
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        id: "telegram-gateway",
        title: "Telegram Gateway",
        header: {
          title: "Telegram Gateway",
          subtitle:
            "Monitoramento do serviço MTProto, filas e mensagens persistidas",
        },
        parts: [],
        customContent: telegramGatewayContent,
        icon: <MessageSquare className="h-4 w-4" />,
      },
      {
        id: "workspace",
        title: "Workspace",
        header: {
          title: "Workspace",
          subtitle: "Ideias, sugestões e brainstorming de funcionalidades",
        },
        parts: [], // Empty - uses customContent
        // ✅ CustomizablePageLayout - 3 sections: Categories + CRUD table + Kanban board
        customContent: workspaceContent,
        icon: <Briefcase className="h-4 w-4" />,
      },
      {
        id: "course-crawler",
        title: "Course Crawler",
        header: {
          title: "Course Crawler",
          subtitle:
            "Formulário de credenciais, agendamentos e visualização dos artefatos da stack dedicada",
        },
        parts: [],
        customContent: courseCrawlerContent,
        icon: <GraduationCap className="h-4 w-4" />,
      },
      {
        id: "rag-services",
        title: "RAG Services",
        header: {
          title: "RAG Services",
          subtitle:
            "Consultas, ingestão e integrações RAG baseadas em LangChain.",
        },
        parts: [],
        customContent: llamaIndexContent,
        icon: <BrainCircuit className="h-4 w-4" />,
      },
    ],
  },

  // ========================================
  // 1. TOOLBOX (Gray)
  // ========================================
  {
    id: "configuracoes",
    icon: <Server className="w-5 h-5" />,
    label: "Toolbox",
    pages: [
      {
        id: "knowledge-database",
        title: "Database",
        header: {
          title: "Database Tools",
          subtitle:
            "QuestDB Console, pgAdmin, pgWeb e Adminer em um único painel",
        },
        parts: [],
        customContent: databaseContent,
        icon: <Database className="h-4 w-4" />,
      },
      {
        id: "n8n-automation",
        title: "n8n",
        header: {
          title: "n8n Automations",
          subtitle:
            "Workflows low-code com queues dedicadas e webhooks internos.",
        },
        parts: [],
        customContent: n8nContent,
        icon: <Workflow className="h-4 w-4" />,
      },
      {
        id: "evolution-manager",
        title: "Evolution",
        header: {
          title: "Evolution Manager",
          subtitle:
            "Orquestração oficial do Evolution API com monitoramento em tempo real.",
        },
        parts: [],
        customContent: evolutionContent,
        icon: <Bot className="h-4 w-4" />,
      },
      {
        id: "waha-dashboard",
        title: "WAHA",
        header: {
          title: "WAHA Dashboard",
          subtitle:
            "Interface oficial do WAHA rodando localmente (engine NOWEB).",
        },
        parts: [],
        customContent: wahaContent,
        icon: <MessageCircle className="h-4 w-4" />,
      },
      {
        id: "kestra-orchestrator",
        title: "Kestra",
        header: {
          title: "Kestra Orchestrator",
          subtitle:
            "Automação de pipelines declarativos com filas e storage dedicados.",
        },
        parts: [],
        customContent: kestraContent,
        icon: <GitBranch className="h-4 w-4" />,
      },
      {
        id: "firecrawl-dashboard",
        title: "Firecrawl",
        header: {
          title: "Firecrawl Dashboard",
          subtitle:
            "Console de scraping Firecrawl com status das tarefas e diagnósticos.",
        },
        parts: [],
        customContent: firecrawlContent,
        icon: <Flame className="h-4 w-4" />,
      },
      {
        id: "miro",
        title: "Miro",
        header: {
          title: "Miro Board",
          subtitle:
            "Quadro colaborativo para planejamento visual e brainstorming",
        },
        parts: [],
        customContent: miroContent,
        icon: <Layout className="h-4 w-4" />,
      },
    ],
  },

  // ========================================
  // 2. KNOWLEDGE (Indigo)
  // ========================================
  {
    id: "knowledge",
    icon: <BookOpen className="w-5 h-5" />,
    label: "Knowledge",
    pages: [
      {
        id: "governance",
        title: "Governance",
        header: {
          title: "Governance Hub",
          subtitle:
            "Strategy, controls, evidence and review cadences em tempo real",
        },
        parts: [],
        customContent: governanceContent,
        icon: <ShieldCheck className="h-4 w-4" />,
      },
      {
        id: "catalog",
        title: "Catalog",
        header: {
          title: "Catalog",
          subtitle:
            "Catálogo unificado dos agentes Claude e comandos personalizados, comutável diretamente no cabeçalho.",
        },
        parts: [],
        customContent: claudeCatalogContent,
        icon: <List className="h-4 w-4" />,
      },
      {
        id: "docs",
        title: "Docs",
        header: {
          title: "TradingSystem Docs",
          subtitle:
            "Docs portal, context hub e referências operacionais atualizadas",
        },
        parts: [], // Empty - uses customContent
        customContent: docusaurusContent,
        icon: <FileText className="h-4 w-4" />,
      },
      {
        id: "structure-map",
        title: "Structure Map",
        header: {
          title: "Structure Map",
          subtitle:
            "Visualização interativa da árvore de diretórios e arquivos de documentação.",
        },
        parts: [],
        customContent: structureMapContent,
        icon: <FolderTree className="h-4 w-4" />,
      },
    ],
  },
];

const LEGACY_PAGE_ALIASES: Record<string, string> = {
  "ai-agents-directory": "catalog",
  "claude-commands": "catalog",
  waha: "waha-dashboard",
  "structure": "structure-map",
  "structure-index": "structure-map",
};

const resolvePageId = (pageId: string) => LEGACY_PAGE_ALIASES[pageId] ?? pageId;

/**
 * Flatten all pages from all sections for easy lookup
 */
export const ALL_PAGES = NAVIGATION_DATA.flatMap((section) => section.pages);

/**
 * Get page by ID
 */
export function getPageById(pageId: string): Page | undefined {
  const resolvedId = resolvePageId(pageId);
  return ALL_PAGES.find((page) => page.id === resolvedId);
}

/**
 * Get section by page ID
 */
export function getSectionByPageId(pageId: string): Section | undefined {
  const resolvedId = resolvePageId(pageId);
  return NAVIGATION_DATA.find((section) =>
    section.pages.some((page) => page.id === resolvedId),
  );
}

/**
 * Get default page (first page of first section)
 */
export function getDefaultPage(): Page {
  return NAVIGATION_DATA[0].pages[0];
}
