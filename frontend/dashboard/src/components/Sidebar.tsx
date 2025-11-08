import clsx from "clsx";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Home,
  Database,
  Shield,
  BookOpen,
  Settings,
} from "lucide-react";

export interface SidebarProps {
  currentView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "positions", label: "Positions", icon: Wallet },
  { id: "orders", label: "Orders", icon: FileText },
  { id: "signals", label: "Signals", icon: TrendingUp },
];

const systemLinks = [
  { id: "home", label: "Home", icon: Home, url: "/" },
  {
    id: "docs",
    label: "Documentation",
    icon: BookOpen,
    url: "/documentation-hub",
  },
  {
    id: "data-capture",
    label: "Data Capture",
    icon: Settings,
    url: "/data-capture-ui",
  },
  { id: "database", label: "Database", icon: Database, url: "/database-ui" },
  {
    id: "risk",
    label: "Risk Management",
    icon: Shield,
    url: "/risk-management-ui",
  },
];

export function Sidebar({
  currentView,
  onViewChange,
  isOpen,
  onToggle,
}: SidebarProps) {
  return (
    <aside
      className={clsx(
        "bg-white border-r border-gray-200 transition-all duration-300 flex flex-col",
        isOpen ? "w-64" : "w-20",
      )}
    >
      {/* Logo / Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {isOpen && (
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <span className="font-bold text-gray-900">Trading</span>
            </div>
          )}
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors ml-auto"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        <div
          className={clsx(
            "text-xs font-semibold text-gray-500 uppercase mb-2",
            !isOpen && "text-center",
          )}
        >
          {isOpen ? "Dashboard" : "━"}
        </div>

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={clsx(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "bg-cyan-50 text-cyan-700 font-medium"
                  : "text-gray-700 hover:bg-gray-100",
                !isOpen && "justify-center",
              )}
              title={!isOpen ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* System Links */}
      <div className="p-4 border-t border-gray-200">
        <div
          className={clsx(
            "text-xs font-semibold text-gray-500 uppercase mb-2",
            !isOpen && "text-center",
          )}
        >
          {isOpen ? "Systems" : "━"}
        </div>

        <div className="space-y-1">
          {systemLinks.map((link) => {
            const Icon = link.icon;

            return (
              <a
                key={link.id}
                href={link.url}
                className={clsx(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900",
                  !isOpen && "justify-center",
                )}
                title={!isOpen ? link.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {isOpen && <span className="text-sm">{link.label}</span>}
              </a>
            );
          })}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
