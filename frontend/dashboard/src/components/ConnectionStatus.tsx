import { Activity } from "lucide-react";

interface ConnectionStatusProps {
  showDetails?: boolean;
  className?: string;
}

/**
 * ConnectionStatus component displays system status
 *
 * Note: WebSocket functionality has been removed from this version
 * This component now shows a static "active" status
 */
export function ConnectionStatus({
  showDetails = false,
  className = "",
}: ConnectionStatusProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <span className="text-sm font-medium text-gray-700">Sistema Ativo</span>
      </div>
      {showDetails && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <Activity className="h-3 w-3" />
        </div>
      )}
    </div>
  );
}

export default ConnectionStatus;
