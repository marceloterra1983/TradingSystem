import { Menu, Activity } from '@/icons';
import ConnectionStatus from "./ConnectionStatus";

export interface HeaderProps {
  onToggleSidebar: () => void;
}

export function Header({ onToggleSidebar }: HeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xl">📊</span>
            <h1 className="text-xl font-bold text-cyan-600">TradingSystem</h1>
            <span className="px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-700 rounded">
              Dashboard
            </span>
          </div>
        </div>

        {/* Right side - System Status */}
        <div className="flex items-center gap-6">
          {/* WebSocket Connection Status */}
          <ConnectionStatus showDetails />

          {/* Market Status */}
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
            <Activity className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">
              Market Open
            </span>
          </div>

          {/* Current Time */}
          <div className="text-sm text-gray-600">
            {new Date().toLocaleTimeString("pt-BR", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
