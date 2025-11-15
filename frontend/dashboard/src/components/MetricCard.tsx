import { ReactNode } from "react";
import clsx from "clsx";
import { TrendingUp, TrendingDown, Minus } from "@/icons";

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  trend?: "up" | "down" | "neutral";
  variant?: "default" | "success" | "danger" | "warning" | "info";
  loading?: boolean;
  className?: string;
}

export function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  variant = "default",
  loading = false,
  className,
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend) return null;

    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "neutral":
        return <Minus className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTrendColor = () => {
    if (change === undefined) return "";

    if (change > 0) return "text-green-600";
    if (change < 0) return "text-red-600";
    return "text-gray-600";
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-l-4 border-green-500 bg-green-50";
      case "danger":
        return "border-l-4 border-red-500 bg-red-50";
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-50";
      case "info":
        return "border-l-4 border-blue-500 bg-blue-50";
      default:
        return "border border-gray-200";
    }
  };

  if (loading) {
    return (
      <div
        className={clsx(
          "bg-white rounded-lg p-6 shadow-sm",
          getVariantStyles(),
          className,
        )}
      >
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-3"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-1/4"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        "bg-white rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow",
        getVariantStyles(),
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>

          {(change !== undefined || changeLabel) && (
            <div className="flex items-center gap-2">
              {getTrendIcon()}
              {change !== undefined && (
                <span className={clsx("text-sm font-medium", getTrendColor())}>
                  {change > 0 && "+"}
                  {change}%
                </span>
              )}
              {changeLabel && (
                <span className="text-xs text-gray-500">{changeLabel}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          <div className="flex-shrink-0">
            <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center">
              {icon}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default MetricCard;
