import * as React from "react";
import { PgAdminPage } from "./database/PgAdminPage";
import { PgWebPage } from "./database/PgWebPage";
import { QuestDbConsolePage } from "./database/QuestDbConsolePage";
import { AdminerPage } from "./database/AdminerPage";

type TabId = "overview" | "pgadmin" | "pgweb" | "adminer" | "questdb";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "pgadmin", label: "pgAdmin" },
  { id: "pgweb", label: "pgWeb" },
  { id: "adminer", label: "Adminer" },
  { id: "questdb", label: "QuestDB" },
];

export default function DatabasePage() {
  const [activeTab, setActiveTab] = React.useState<TabId>("overview");

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tabs Navigation */}
      <div className="flex gap-2 p-4 bg-gray-100 dark:bg-gray-800 border-b-2 border-gray-300 dark:border-gray-600">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${
              activeTab === tab.id
                ? "bg-blue-600 text-white shadow-md"
                : "bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-gray-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "pgadmin" && <PgAdminPage />}
        {activeTab === "pgweb" && <PgWebPage />}
        {activeTab === "adminer" && <AdminerPage />}
        {activeTab === "questdb" && <QuestDbConsolePage />}
      </div>
    </div>
  );
}

function OverviewTab() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Database Toolbox</h1>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Access</h2>
          <div className="grid grid-cols-2 gap-4">
            <a
              href="http://localhost:5050"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            >
              <h3 className="font-semibold text-blue-700 dark:text-blue-300">
                pgAdmin
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                PostgreSQL/TimescaleDB Admin - Port 5050
              </p>
            </a>

            <a
              href="http://localhost:5052"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
            >
              <h3 className="font-semibold text-green-700 dark:text-green-300">
                pgWeb
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lightweight PostgreSQL Browser - Port 5052
              </p>
            </a>

            <a
              href="http://localhost:3910"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
            >
              <h3 className="font-semibold text-purple-700 dark:text-purple-300">
                Adminer
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Lightweight Database Tool - Port 3910
              </p>
            </a>

            <a
              href="http://localhost:9000"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
            >
              <h3 className="font-semibold text-orange-700 dark:text-orange-300">
                QuestDB Console
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Time-Series Database - Port 9000
              </p>
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Database Connections</h2>
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <strong>Workspace TimescaleDB:</strong>
              <br />
              Host: localhost | Port: 5450 | DB: workspace | User: postgres
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <strong>TP Capital TimescaleDB:</strong>
              <br />
              Host: localhost | Port: 5440 | DB: tp_capital_db | User: tp_capital
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <strong>Telegram Gateway:</strong>
              <br />
              Host: localhost | Port: 5434 | DB: telegram_gateway | User: telegram
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded">
              <strong>QuestDB:</strong>
              <br />
              HTTP: localhost:9000 | ILP: localhost:9009
            </div>
          </div>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg border-2 border-green-200 dark:border-green-700">
          <h2 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-200">
            ✅ WSL2 Port Forwarding - Configured!
          </h2>

          <div className="space-y-4 text-sm">
            <div className="bg-white dark:bg-gray-800 p-4 rounded">
              <p className="font-semibold text-green-700 dark:text-green-300 mb-2">
                Port forwarding rules are active:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Port 5050 → pgAdmin</div>
                <div>Port 3910 → Adminer</div>
                <div>Port 5052 → pgWeb</div>
                <div>Port 9000 → QuestDB</div>
              </div>
            </div>

            <div className="border-t border-green-200 dark:border-green-700 pt-3">
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                If links stop working after Windows restart, re-run the PowerShell script:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs">
                cd \\wsl$\Ubuntu\home\marce\Projetos\TradingSystem
              </code>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1">
                .\FIX-DATABASE-UI-V3-FINAL.ps1
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
