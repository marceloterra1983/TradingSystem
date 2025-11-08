import * as React from "react";
import { cn } from "../../lib/utils";

export interface DropdownOption {
  label: string;
  value: string;
}

export interface ButtonWithDropdownProps {
  label: string;
  options: DropdownOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  variant?: "default" | "outline" | "ghost" | "destructive" | "primary";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
}

/**
 * Button with integrated dropdown menu
 * Click on button to show options (no arrow indicator)
 */
export const ButtonWithDropdown: React.FC<ButtonWithDropdownProps> = ({
  label,
  options,
  selectedValue,
  onSelect,
  variant = "default",
  size = "sm",
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const variantClasses: Record<
    NonNullable<ButtonWithDropdownProps["variant"]>,
    string
  > = {
    default:
      "bg-cyan-600 text-white hover:bg-cyan-700 focus:ring-cyan-500 dark:bg-cyan-700 dark:hover:bg-cyan-600",
    outline:
      "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
    ghost:
      "text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800",
    destructive:
      "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-700 dark:hover:bg-red-600",
    primary:
      "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-600",
  };

  const sizeClasses: Record<
    NonNullable<ButtonWithDropdownProps["size"]>,
    string
  > = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const selectedOption = options.find((opt) => opt.value === selectedValue);
  const displayLabel =
    options.length > 1 && selectedOption
      ? `${label} (${selectedOption.label})`
      : label;

  const handleButtonClick = React.useCallback(() => {
    if (disabled || options.length === 0) {
      return;
    }

    // Se há apenas uma opção, sempre seleciona essa opção ao clicar
    if (options.length === 1) {
      const singleValue = options[0]?.value;
      if (singleValue) {
        onSelect(singleValue);
      }
      return;
    }

    // Se há múltiplas opções, toggle o dropdown
    setIsOpen((previous) => !previous);
  }, [disabled, onSelect, options]);

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={handleButtonClick}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          variantClasses[variant],
          sizeClasses[size],
        )}
        disabled={disabled}
        type="button"
      >
        {displayLabel}
      </button>

      {options.length > 1 && isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-48 rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800">
          <div className="py-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  onSelect(option.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm transition-colors",
                  option.value === selectedValue
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                    : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700",
                )}
              >
                {option.label}
                {option.value === selectedValue && (
                  <span className="ml-2 text-blue-600 dark:text-blue-400">
                    ✓
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ButtonWithDropdown;
