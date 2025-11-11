import { useState } from "react";
import {
  CustomizablePageLayout,
  PageSection,
} from "../layout/CustomizablePageLayout";
import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardDescription,
  CollapsibleCardContent,
} from "../ui/collapsible-card";
import { ENDPOINTS } from "../../config/endpoints";
import { apiConfig } from "../../config/api";

type LinkItem = {
  name: string;
  url?: string;
  value?: string;
  description?: string;
  optional?: boolean;
};

type UrlSection = {
  id: string;
  title: string;
  description?: string;
  links: LinkItem[];
};

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error("Unable to copy to clipboard", error);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      className="text-xs font-medium text-blue-600 hover:text-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-blue-400 dark:hover:text-blue-300"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function URLsPage() {
  const gatewayRoot =
    ENDPOINTS.workspace.replace(/\/api\/workspace$/, "") ||
    "http://localhost:9080";

  const appendPath = (base: string, path: string) => {
    const sanitizedBase = base.replace(/\/+$/, "");
    const sanitizedPath = path.replace(/^\/+/, "");
    return `${sanitizedBase}/${sanitizedPath}`;
  };

  const sections: UrlSection[] = [
    {
      id: "application-services",
      title: "Application & Service URLs",
      description:
        "Primary HTTP services that make up the local TradingSystem stack.",
      links: [
        { name: "Dashboard (Gateway)", url: gatewayRoot },
        {
          name: "Workspace API",
          url: appendPath(ENDPOINTS.workspace, "items"),
        },
        { name: "TP Capital Signals API", url: ENDPOINTS.tpCapital },
        { name: "Documentation API", url: ENDPOINTS.documentation },
        { name: "Documentation Hub (docs)", url: apiConfig.docsUrl },
        { name: "Firecrawl", url: "http://localhost:3002" },
        { name: "Firecrawl Proxy", url: apiConfig.firecrawlProxyApi },
        { name: "Agent MCP Dashboard", url: "http://localhost:8080" },
        {
          name: "Docusaurus Docs (manual override)",
          url: apiConfig.docsUrl,
          optional: true,
        },
      ],
    },
    {
      id: "database-ui-tools",
      title: "Database UI Tools",
      description:
        "Web interfaces that connect to TimescaleDB and QuestDB for database administration and exploration.",
      links: [
        { name: "pgAdmin", url: ENDPOINTS.pgAdmin },
        { name: "pgweb", url: ENDPOINTS.pgWeb },
        {
          name: "Adminer (optional)",
          url: ENDPOINTS.adminer,
          optional: true,
        },
        {
          name: "Azimutt (optional)",
          url: "http://localhost:8084",
          optional: true,
        },
      ],
    },
    {
      id: "questdb",
      title: "QuestDB",
      description: "QuestDB admin endpoints and connection helpers.",
      links: [
        {
          name: "QuestDB Web Console (REST/SQL)",
          url: ENDPOINTS.questdb,
        },
        {
          name: "QuestDB Influx (ILP)",
          value: "tcp://localhost:9009",
          description:
            "Line protocol endpoint for ILP clients (no HTTP interface).",
        },
        {
          name: "QuestDB PostgreSQL (psql)",
          value: "postgresql://admin:quest@localhost:8812/qdb",
          description:
            "Default credentials shown. Update if you changed QuestDB auth.",
        },
      ],
    },
    {
      id: "timescaledb",
      title: "TimescaleDB",
      description:
        "Connection helpers for TimescaleDB (primary analytical store).",
      links: [
        {
          name: "TimescaleDB (psql)",
          value:
            "postgresql://timescale:<TIMESCALEDB_PASSWORD>@localhost:5433/tradingsystem",
          description:
            "Replace <TIMESCALEDB_PASSWORD> with the value configured in the root .env file.",
        },
      ],
    },
    {
      id: "openapi",
      title: "Swagger / OpenAPI",
      links: [
        { name: "Swagger / OpenAPI UI", url: "http://localhost:8200/docs" },
      ],
    },
  ];

  const pageSections: PageSection[] = sections.map((section) => ({
    id: section.id,
    content: (
      <CollapsibleCard cardId={section.id} defaultCollapsed={false}>
        <CollapsibleCardHeader className="flex-col items-start md:flex-row md:items-center md:justify-between gap-2">
          <CollapsibleCardTitle>{section.title}</CollapsibleCardTitle>
          {section.description && (
            <CollapsibleCardDescription>
              {section.description}
            </CollapsibleCardDescription>
          )}
        </CollapsibleCardHeader>
        <CollapsibleCardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {section.links.map((link) => (
              <div key={link.name} className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {link.name}
                  </span>
                  {link.optional && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
                      Optional
                    </span>
                  )}
                </div>
                {link.url ? (
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline dark:text-blue-400 break-all"
                  >
                    {link.url}
                  </a>
                ) : (
                  link.value && (
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded break-all">
                        {link.value}
                      </code>
                      <CopyButton value={link.value} />
                    </div>
                  )
                )}
                {link.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {link.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </CollapsibleCardContent>
      </CollapsibleCard>
    ),
  }));

  return (
    <CustomizablePageLayout
      pageId="urls-page"
      title="Available URLs"
      subtitle="Quick access to local services, APIs, and database tooling."
      sections={pageSections}
    />
  );
}

export default URLsPage;
