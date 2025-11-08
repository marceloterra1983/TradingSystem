import { Menu, Sun, Moon, Copy, Check } from "lucide-react";
import { Clock } from "../ui/clock";
import { cn } from "../../lib/utils";
import { Page, getSectionByPageId } from "../../data/navigation";
import { Logo } from "../ui/logo";
import { useTheme } from "../../contexts/ThemeContext";
import { useState } from "react";

export interface LayoutHeaderProps {
  currentPage: Page;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

/**
 * Layout Header Component
 *
 * Features:
 * - Fixed top positioning
 * - Shows current section and page title
 * - Clock and theme toggle controls
 * - Responsive behavior for mobile
 *
 * Follows template specification exactly
 */
export function LayoutHeader({
  currentPage,
  onToggleSidebar,
  isMobile = false,
}: LayoutHeaderProps) {
  const currentSection = getSectionByPageId(currentPage.id);
  const { resolvedTheme, toggleTheme } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center justify-between px-4 transition-colors duration-200",
        "border-b border-[color:var(--ts-surface-border)] bg-[color:var(--ts-backdrop-blur)] backdrop-blur-xl",
      )}
    >
      {/* Left side - Title & Context */}
      <div className="flex items-center gap-4">
        {/* Mobile menu button */}
        {isMobile && onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className="rounded-lg p-2 transition-colors hover:bg-[color:var(--ts-surface-hover)] lg:hidden"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5 text-[color:var(--ts-text-muted)]" />
          </button>
        )}

        {/* Logo (mobile only) */}
        {isMobile && <Logo variant="icon" size="sm" className="lg:hidden" />}

        {/* Copy URL Button */}
        <button
          onClick={handleCopyUrl}
          className="rounded-lg p-2 transition-colors hover:bg-[color:var(--ts-surface-hover)]"
          aria-label="Copiar URL da página"
          title="Copiar URL da página"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4 text-[color:var(--ts-text-muted)]" />
          )}
        </button>

        {/* Page Title */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-semibold text-[color:var(--ts-text-primary)]">
              {currentPage.title}
            </h1>
            {currentSection && currentSection.label !== "Docs" && (
              <span className="rounded bg-[color:var(--ts-surface-hover)] px-2 py-0.5 text-xs font-medium text-[color:var(--ts-text-muted)]">
                {currentSection.label}
              </span>
            )}
          </div>
          {currentPage.header.subtitle && (
            <p className="text-xs text-[color:var(--ts-text-muted)]">
              {currentPage.header.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side - Utilities */}
      <div className="flex items-center gap-3">
        {/* Clock */}
        <div className="hidden md:flex">
          <Clock showIcon timezone="(SP)" />
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="rounded-lg p-2 transition-colors hover:bg-[color:var(--ts-surface-hover)]"
          aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
          title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} mode`}
        >
          {resolvedTheme === "dark" ? (
            <Sun className="h-5 w-5 text-[color:var(--ts-text-muted)]" />
          ) : (
            <Moon className="h-5 w-5 text-[color:var(--ts-text-muted)]" />
          )}
        </button>
      </div>
    </header>
  );
}

export default LayoutHeader;
