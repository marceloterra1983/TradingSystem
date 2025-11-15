import * as React from "react";
import { PgAdminPage } from "./database/PgAdminPage";
import { PgWebPage } from "./database/PgWebPage";
import { QuestDbConsolePage } from "./database/QuestDbConsolePage";
import { AdminerPage } from "./database/AdminerPage";

type TabId = "pgadmin" | "pgweb" | "adminer" | "questdb";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "pgadmin", label: "pgAdmin" },
  { id: "pgweb", label: "pgWeb" },
  { id: "adminer", label: "Adminer" },
  { id: "questdb", label: "QuestDB" },
];

export default function DatabasePage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("pgadmin");

  return (
    <div className="w-full h-full flex flex-col overflow-hidden">
      {/* Tabs Navigation */}
      <div className="flex gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content - Iframe Embeds */}
      <div className="flex-1 w-full overflow-hidden">
        {activeTab === "pgadmin" && <PgAdminPage />}
        {activeTab === "pgweb" && <PgWebPage />}
        {activeTab === "adminer" && <AdminerPage />}
        {activeTab === "questdb" && <QuestDbConsolePage />}
      </div>
    </div>
  );
}
