import React from "react";
import { TrendingUp, TrendingDown } from '@/icons';
import { TradingData } from "../../hooks/useTradingData";

// ✅ Componente funcional seguindo as regras React do Playbooks
interface TradingCardProps {
  data: TradingData;
  onCardClick?: (symbol: string) => void;
  className?: string;
}

/**
 * TradingCard - Componente otimizado com React.memo
 * Segue as regras: React.memo para performance, componentes funcionais
 */
export const TradingCard = React.memo<TradingCardProps>(function TradingCard({
  data,
  onCardClick,
  className = "",
}) {
  const { symbol, price, change, volume, lastUpdate } = data;

  const isPositive = change >= 0;
  const changeIcon = isPositive ? TrendingUp : TrendingDown;
  const changeColor = isPositive ? "text-green-600" : "text-red-600";
  const bgColor = isPositive ? "bg-green-50" : "bg-red-50";

  const handleClick = () => {
    onCardClick?.(symbol);
  };

  return (
    <div
      className={`p-4 rounded-lg border shadow-sm hover:shadow-md transition-shadow cursor-pointer ${bgColor} ${className}`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* ✅ Fragment para evitar div desnecessária */}
      <>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{symbol}</h3>
          <span className="text-sm text-gray-500">
            {lastUpdate.toLocaleTimeString()}
          </span>
        </div>

        <div className="space-y-1">
          <p className="text-2xl font-bold text-gray-900">
            R$ {price.toFixed(2)}
          </p>

          <div className={`flex items-center gap-1 ${changeColor}`}>
            {React.createElement(changeIcon, {
              size: 16,
              "aria-label": isPositive
                ? "Tendência positiva"
                : "Tendência negativa",
            })}
            <span className="font-medium">
              {isPositive ? "+" : ""}
              {change.toFixed(2)}%
            </span>
          </div>

          <p className="text-sm text-gray-600">
            Volume: {volume.toLocaleString()}
          </p>
        </div>
      </>
    </div>
  );
});

// ✅ PropTypes equivalent com TypeScript
TradingCard.displayName = "TradingCard";
