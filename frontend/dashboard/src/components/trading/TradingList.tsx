import { TradingCard } from "./TradingCard";
import { TradingData } from "../../hooks/useTradingData";

// ✅ Componente funcional seguindo as regras React do Playbooks
interface TradingListProps {
  data: TradingData[];
  onCardClick?: (symbol: string) => void;
  loading?: boolean;
  error?: Error | null;
  className?: string;
}

/**
 * TradingList - Componente de lista otimizado
 * Segue as regras: renderização adequada de listas com keys, fragments
 */
export function TradingList({
  data,
  onCardClick,
  loading = false,
  error,
  className = "",
}: TradingListProps) {
  // ✅ Loading state
  if (loading) {
    return (
      <div
        className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={`loading-${index}`}
            className="p-4 rounded-lg border bg-gray-100 animate-pulse"
          >
            <div className="h-6 bg-gray-300 rounded mb-2"></div>
            <div className="h-8 bg-gray-300 rounded mb-2"></div>
            <div className="h-4 bg-gray-300 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // ✅ Error state
  if (error) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-red-600 mb-2">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Erro ao carregar dados
        </h3>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  // ✅ Empty state
  if (!data || data.length === 0) {
    return (
      <div className={`p-8 text-center ${className}`}>
        <div className="text-gray-400 mb-2">
          <svg
            className="mx-auto h-12 w-12"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Nenhum dado disponível
        </h3>
        <p className="text-gray-600">
          Não há dados de trading para exibir no momento.
        </p>
      </div>
    );
  }

  // ✅ Lista com keys únicas - regra principal do Playbooks
  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}
    >
      {data.map((tradingData) => (
        <TradingCard
          key={tradingData.symbol} // ✅ Key única baseada no symbol
          data={tradingData}
          onCardClick={onCardClick}
        />
      ))}
    </div>
  );
}

// ✅ PropTypes equivalent com TypeScript
TradingList.displayName = "TradingList";
