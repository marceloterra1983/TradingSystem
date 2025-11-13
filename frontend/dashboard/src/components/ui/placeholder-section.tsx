import {
  CollapsibleCard,
  CollapsibleCardHeader,
  CollapsibleCardTitle,
  CollapsibleCardContent,
} from "./collapsible-card";
import { AlertCircle, Rocket } from '@/icons';

export interface PlaceholderSectionProps {
  cardId: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  defaultCollapsed?: boolean;
}

/**
 * Generic placeholder section for "to be implemented" features
 * Uses CollapsibleCard for compatibility with CustomizablePageLayout
 */
export function PlaceholderSection({
  cardId,
  title,
  description = "Esta funcionalidade será implementada em breve.",
  icon,
  defaultCollapsed = false,
}: PlaceholderSectionProps) {
  return (
    <CollapsibleCard cardId={cardId} defaultCollapsed={defaultCollapsed}>
      <CollapsibleCardHeader>
        <div className="flex items-center gap-3">
          {icon || <Rocket className="w-5 h-5 text-cyan-500" />}
          <CollapsibleCardTitle>{title}</CollapsibleCardTitle>
        </div>
      </CollapsibleCardHeader>
      <CollapsibleCardContent>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Em Desenvolvimento
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md">
            {description}
          </p>
        </div>
      </CollapsibleCardContent>
    </CollapsibleCard>
  );
}
