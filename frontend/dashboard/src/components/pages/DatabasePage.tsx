import * as React from "react";

/**
 * Database Toolbox - Ultra Simple Version
 * Just direct links to open database tools in new windows
 */

export function DatabasePage() {
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Database Toolbox</h1>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Access Links</h2>
          <div className="space-y-3">
            <a
              href="http://localhost:5050"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-lg"
            >
              → Open pgAdmin (PostgreSQL Admin - Port 5050)
            </a>

            <a
              href="http://localhost:3910"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-lg"
            >
              → Open Adminer (Lightweight DB Tool - Port 3910)
            </a>

            <a
              href="http://localhost:5052"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-lg"
            >
              → Open pgWeb (Simple PostgreSQL Browser - Port 5052)
            </a>

            <a
              href="http://localhost:9000"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800 hover:underline text-lg"
            >
              → Open QuestDB Console (Time-Series DB - Port 9000)
            </a>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Database Connections</h2>
          <div className="space-y-4 text-sm">
            <div>
              <strong>Workspace TimescaleDB:</strong>
              <br />
              Host: localhost | Port: 5450 | DB: workspace | User: postgres
            </div>
            <div>
              <strong>TP Capital TimescaleDB:</strong>
              <br />
              Host: localhost | Port: 5440 | DB: tp_capital_db | User: tp_capital
            </div>
            <div>
              <strong>Telegram Gateway:</strong>
              <br />
              Host: localhost | Port: 5434 | DB: telegram_gateway | User: telegram
            </div>
            <div>
              <strong>QuestDB:</strong>
              <br />
              HTTP: localhost:9000 | ILP: localhost:9009
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">⚠️ Troubleshooting</h2>

          <div className="space-y-4 text-sm">
            <div>
              <strong>If links show "ERR_EMPTY_RESPONSE" or "This page is not working":</strong>
              <p className="mt-1 mb-2">
                This is a <strong>WSL2 port forwarding issue</strong>. Database UI containers are running in WSL2,
                but Windows cannot access them without port forwarding.
              </p>
              <p className="mb-2">
                <strong>Solution:</strong> Run the port forwarding script on Windows as Administrator:
              </p>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mb-1">
                # Open PowerShell as Administrator, then:
              </code>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs">
                cd \\wsl$\Ubuntu\home\marce\Projetos\TradingSystem\scripts\windows
              </code>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1">
                .\forward-database-ui-ports.ps1
              </code>
              <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                📖 See detailed instructions: <code>scripts/windows/README-WSL2-PORT-FORWARDING.md</code>
              </p>
            </div>

            <div className="border-t border-yellow-200 dark:border-yellow-700 pt-3">
              <strong>Check if containers are running:</strong>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1">
                docker ps | grep dbui
              </code>
            </div>

            <div>
              <strong>Start containers if needed:</strong>
              <code className="block bg-gray-100 dark:bg-gray-900 p-2 rounded text-xs mt-1">
                docker compose -f tools/compose/docker-compose.5-0-database-stack.yml up -d
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
