import * as React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { isBrowser, safeLocalStorageGet, safeLocalStorageSet } from '../../utils/browser';

export interface CollapsibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  defaultCollapsed?: boolean;
  cardId?: string;
}

export const CollapsibleCard = React.forwardRef<HTMLDivElement, CollapsibleCardProps>(
  ({ className, children, defaultCollapsed = false, cardId, ...props }, ref) => {
    const [isCollapsed, setIsCollapsed] = React.useState(() => {
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
    React.useEffect(() => {
      if (!cardId || !isBrowser) return;

      const handleCollapseAll = (event: Event) => {
        const customEvent = event as CustomEvent<{ collapsed: boolean }>;
        const newState = customEvent.detail.collapsed;
        setIsCollapsed(newState);
      };

      window.addEventListener('collapse-all-cards', handleCollapseAll);
      return () => window.removeEventListener('collapse-all-cards', handleCollapseAll);
    }, [cardId]);

    const toggleCollapsed = () => {
      const newState = !isCollapsed;
      setIsCollapsed(newState);
      if (cardId) {
        safeLocalStorageSet(`card-collapsed-${cardId}`, JSON.stringify(newState));
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'bg-white rounded-lg border border-gray-200 shadow-sm dark:bg-gray-900 dark:border-gray-700',
          'transition-all duration-200',
          className
        )}
        {...props}
      >
        {React.Children.map(children, (child) => {
          if (
            React.isValidElement<CollapsibleCardHeaderProps>(child) &&
            (child.type === CollapsibleCardHeader || child.props.__collapsibleType === 'header')
          ) {
            return React.cloneElement(child, {
              isCollapsed,
              onToggle: toggleCollapsed,
              __collapsibleType: 'header' as const,
            });
          }

          if (
            React.isValidElement<CollapsibleCardContentProps>(child) &&
            (child.type === CollapsibleCardContent || child.props.__collapsibleType === 'content')
          ) {
            return React.cloneElement(child, {
              isCollapsed,
              __collapsibleType: 'content' as const,
            });
          }

          return child;
        })}
      </div>
    );
  }
);

CollapsibleCard.displayName = 'CollapsibleCard';

export interface CollapsibleCardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isCollapsed?: boolean;
  onToggle?: () => void;
  __collapsibleType?: 'header';
}

const CollapsibleCardHeaderComponent = React.forwardRef<HTMLDivElement, CollapsibleCardHeaderProps>(
  ({ className, children, isCollapsed, onToggle, __collapsibleType, ...props }, ref) => {
    const handleChevronClick = (event: React.MouseEvent) => {
      event.stopPropagation();
      if (onToggle) {
        onToggle();
      }
    };

    const handleChevronKeyDown = (event: React.KeyboardEvent) => {
      if (!onToggle) {
        return;
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'px-6 py-4 border-b border-gray-200 dark:border-gray-700',
          'flex items-center gap-4 transition-colors',
          isCollapsed && 'border-b-0',
          className
        )}
        {...props}
      >
        <div className="flex-1 min-w-0">
          {children}
        </div>
        <button
          type="button"
          onClick={handleChevronClick}
          onKeyDown={handleChevronKeyDown}
          className={cn(
            'flex-shrink-0 p-1 rounded-md transition-colors',
            'hover:bg-gray-100 dark:hover:bg-gray-800',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500'
          )}
          aria-label={isCollapsed ? 'Expandir seção' : 'Recolher seção'}
          aria-expanded={!isCollapsed}
        >
          <ChevronDown
            className={cn(
              'h-5 w-5 text-gray-500 dark:text-gray-400 transition-transform duration-200',
              isCollapsed && 'rotate-180'
            )}
          />
        </button>
      </div>
    );
  }
);

CollapsibleCardHeaderComponent.displayName = 'CollapsibleCardHeader';

export const CollapsibleCardHeader = Object.assign(CollapsibleCardHeaderComponent, {
  __collapsibleType: 'header' as const,
});

export interface CollapsibleCardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export const CollapsibleCardTitle = React.forwardRef<HTMLHeadingElement, CollapsibleCardTitleProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <h3
        ref={ref}
        className={cn('text-lg font-semibold text-gray-900 dark:text-gray-100', className)}
        {...props}
      >
        {children}
      </h3>
    );
  }
);

CollapsibleCardTitle.displayName = 'CollapsibleCardTitle';

export interface CollapsibleCardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CollapsibleCardDescription = React.forwardRef<HTMLParagraphElement, CollapsibleCardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-600 mt-1 dark:text-gray-400', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CollapsibleCardDescription.displayName = 'CollapsibleCardDescription';

export interface CollapsibleCardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isCollapsed?: boolean;
  __collapsibleType?: 'content';
}

const CollapsibleCardContentComponent = React.forwardRef<HTMLDivElement, CollapsibleCardContentProps>(
  ({ className, children, isCollapsed, __collapsibleType, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'overflow-hidden transition-all duration-200',
          isCollapsed ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100'
        )}
      >
        <div className={cn('px-6 py-4', className)} {...props}>
          {children}
        </div>
      </div>
    );
  }
);

CollapsibleCardContentComponent.displayName = 'CollapsibleCardContent';

export const CollapsibleCardContent = Object.assign(CollapsibleCardContentComponent, {
  __collapsibleType: 'content' as const,
});

export interface CollapsibleCardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CollapsibleCardFooter = React.forwardRef<HTMLDivElement, CollapsibleCardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('px-6 py-4 border-t border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-950', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CollapsibleCardFooter.displayName = 'CollapsibleCardFooter';
