import * as React from "react";
import { Clock as ClockIcon } from "lucide-react";
import { cn } from "../../lib/utils";

export interface ClockProps {
  className?: string;
  showIcon?: boolean;
  showDate?: boolean;
  timezone?: string;
}

/**
 * Clock Component
 *
 * Features:
 * - Real-time clock that updates every second
 * - Shows hours, minutes, and seconds
 * - Optional date display
 * - Optional icon
 * - Theme-aware styling
 *
 * Usage:
 * ```tsx
 * <Clock />
 * <Clock showIcon showDate />
 * ```
 */
export function Clock({
  className,
  showIcon = false,
  showDate = false,
  timezone,
}: ClockProps) {
  const [time, setTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const timeString = time.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const dateString = time.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-1.5",
        "bg-gray-100 dark:bg-gray-800",
        "border border-gray-200 dark:border-gray-700",
        "transition-colors",
        className,
      )}
    >
      {showIcon && (
        <ClockIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
      )}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
            {timeString}
          </span>
          {timezone && (
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {timezone}
            </span>
          )}
        </div>
        {showDate && (
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
            {dateString}
          </span>
        )}
      </div>
    </div>
  );
}

export default Clock;
