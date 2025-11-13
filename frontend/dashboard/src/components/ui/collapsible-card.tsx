import {
  Children,
  cloneElement,
  createElement,
  forwardRef,
  isValidElement,
  useEffect,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { ChevronDown } from '@/icons';
import { cn } from "../../lib/utils";
import {
  isBrowser,
  safeLocalStorageGet,
  safeLocalStorageSet,
} from "../../utils/browser";

export interface CollapsibleCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  defaultCollapsed?: boolean;
  cardId?: string;
}

export const CollapsibleCard = forwardRef<
  HTMLDivElement,
  CollapsibleCardProps
>(
  (
    { className, children, defaultCollapsed = false, cardId, ...props },
    ref,
  ) => {
    const [isCollapsed, setIsCollapsed] = useState(() => {
      if (cardId) {
        const stored = safeLocalStorageGet(`card-collapsed-${cardId}`);
        if (!stored) {
          return defaultCollapsed;
        }
        try {
          return JSON.parse(stored);
        } catch {
          return defaultCollapsed;
        }
      }
      return defaultCollapsed;
    });

    // Listen to collapse-all-cards event for collapse/expand all functionality
    useEffect(() => {
      if (!cardId || !isBrowser) return;

      const handleCollapseAll = (event: Event) => {
        const customEvent = event as CustomEvent<{ collapsed: boolean }>;
        const newState = customEvent.detail.collapsed;
        setIsCollapsed(newState);
      };

      window.addEventListener("collapse-all-cards", handleCollapseAll);
      return () =>
        window.removeEventListener("collapse-all-cards", handleCollapseAll);
    }, [cardId]);

    const toggleCollapsed = () => {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      if (cardId) {
        safeLocalStorageSet(
          `card-collapsed-${cardId}`,
          JSON.stringify(newState),
        );
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border shadow-[var(--ts-shadow-sm)] transition-all duration-200",
          "border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-0)] hover:shadow-[var(--ts-shadow-lg)]",
          className,
        )}
        {...props}
      >
        {Children.map(children, (child) => {
          if (
            isValidElement<CollapsibleCardHeaderProps>(child) &&
            (child.type === CollapsibleCardHeader ||
              child.props.__collapsibleType === "header")
          ) {
            return cloneElement(child, {
              isCollapsed,
              onToggle: toggleCollapsed,
              __collapsibleType: "header" as const,
            });
          }

          if (
            isValidElement<CollapsibleCardContentProps>(child) &&
            (child.type === CollapsibleCardContent ||
              child.props.__collapsibleType === "content")
          ) {
            return cloneElement(child, {
              isCollapsed,
              __collapsibleType: "content" as const,
            });
          }

          return child;
        })}
      </div>
    );
  },
);

CollapsibleCard.displayName = "CollapsibleCard";

export interface CollapsibleCardHeaderProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
  __collapsibleType?: "header";
}

const CollapsibleCardHeaderComponent = forwardRef<
  HTMLDivElement,
  CollapsibleCardHeaderProps
>(
  (
    { className, children, isCollapsed, onToggle, __collapsibleType, ...props },
    ref,
  ) => {
    const handleChevronClick = (event: MouseEvent) => {
      event.stopPropagation();
      if (onToggle) {
        onToggle();
      }
    };

    const handleChevronKeyDown = (event: KeyboardEvent) => {
      if (!onToggle) {
        return;
      }
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "flex items-center gap-4 border-b border-[color:var(--ts-surface-border)] px-6 py-4 transition-colors",
          isCollapsed && "border-b-0",
          className,
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">{children}</div>
        <button
          type="button"
          onClick={handleChevronClick}
          onKeyDown={handleChevronKeyDown}
          className={cn(
            "flex-shrink-0 rounded-md p-1 transition-colors",
            "hover:bg-[color:var(--ts-surface-hover)]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ts-accent)]",
          )}
          aria-label={isCollapsed ? "Expandir seção" : "Recolher seção"}
          aria-expanded={!isCollapsed}
        >
          <ChevronDown
            className={cn(
              "h-5 w-5 text-[color:var(--ts-text-muted)] transition-transform duration-200",
              isCollapsed && "rotate-180",
            )}
          />
        </button>
      </div>
    );
  },
);

CollapsibleCardHeaderComponent.displayName = "CollapsibleCardHeader";

export const CollapsibleCardHeader = Object.assign(
  CollapsibleCardHeaderComponent,
  {
    __collapsibleType: "header" as const,
  },
);

export interface CollapsibleCardTitleProps
  extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const CollapsibleCardTitle = forwardRef<
  HTMLHeadingElement,
  CollapsibleCardTitleProps
>(({ className, children, level = 3, ...props }, ref) => {
  const HeadingTag = `h${level}` as keyof JSX.IntrinsicElements;

  return createElement(
    HeadingTag,
    {
      ref,
      className: cn(
        "text-lg font-semibold text-[color:var(--ts-text-primary)]",
        className,
      ),
      ...props,
    },
    children,
  );
});

CollapsibleCardTitle.displayName = "CollapsibleCardTitle";

export interface CollapsibleCardDescriptionProps
  extends HTMLAttributes<HTMLParagraphElement> {
  children: ReactNode;
}

export const CollapsibleCardDescription = forwardRef<
  HTMLParagraphElement,
  CollapsibleCardDescriptionProps
>(({ className, children, ...props }, ref) => {
  return (
    <p
      ref={ref}
      className={cn(
        "mt-1 text-sm text-[color:var(--ts-text-muted)]",
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
});

CollapsibleCardDescription.displayName = "CollapsibleCardDescription";

export interface CollapsibleCardContentProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  isCollapsed?: boolean;
  __collapsibleType?: "content";
}

const CollapsibleCardContentComponent = forwardRef<
  HTMLDivElement,
  CollapsibleCardContentProps
>(({ className, children, isCollapsed, __collapsibleType, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden transition-all duration-200",
        isCollapsed ? "max-h-0 opacity-0" : "max-h-[5000px] opacity-100",
      )}
    >
      <div className={cn("px-6 py-4", className)} {...props}>
        {children}
      </div>
    </div>
  );
});

CollapsibleCardContentComponent.displayName = "CollapsibleCardContent";

export const CollapsibleCardContent = Object.assign(
  CollapsibleCardContentComponent,
  {
    __collapsibleType: "content" as const,
  },
);

export interface CollapsibleCardFooterProps
  extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const CollapsibleCardFooter = forwardRef<
  HTMLDivElement,
  CollapsibleCardFooterProps
>(({ className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "border-t border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-1)] px-6 py-4",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

CollapsibleCardFooter.displayName = "CollapsibleCardFooter";
