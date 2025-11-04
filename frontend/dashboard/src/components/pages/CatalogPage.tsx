import { Suspense, lazy, useState } from 'react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const AgentsCatalogView = lazy(() => import('../catalog/AgentsCatalogView'));
const CommandsCatalogView = lazy(
  () => import('../catalog/CommandsCatalogView'),
);

type CatalogSection = 'agents' | 'commands';

const CATALOG_SECTIONS: Array<{
  id: CatalogSection;
  label: string;
}> = [
  {
    id: 'agents',
    label: 'Agents',
  },
  {
    id: 'commands',
    label: 'Commands',
  },
];

export default function CatalogPage(): JSX.Element {
  const [activeSection, setActiveSection] = useState<CatalogSection>('agents');

  const renderHeaderActions = () =>
    CATALOG_SECTIONS.map((section) => {
      const isActive = activeSection === section.id;
      return (
        <Button
          key={section.id}
          variant="outline"
          size="sm"
          onClick={() => setActiveSection(section.id)}
          className={cn(
            'rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-150 disabled:opacity-100',
            isActive
              ? 'border-[color:var(--ts-accent)] bg-[color:var(--ts-accent)] text-white shadow-sm hover:bg-[color:var(--ts-accent-strong)] focus:ring-[color:var(--ts-accent)]'
              : 'border-[color:var(--ts-surface-border)] bg-[color:var(--ts-surface-0)] text-[color:var(--ts-text-secondary)] hover:border-[color:var(--ts-accent)] hover:text-[color:var(--ts-accent-strong)]',
          )}
        >
          {section.label}
        </Button>
      );
    });

  const headerActions = renderHeaderActions();

  return (
    <div className="min-h-full">
      <Suspense
        fallback={
          <CatalogFallback
            message={
              activeSection === 'commands'
                ? 'Carregando commands...'
                : 'Carregando agents...'
            }
          />
        }
      >
        {activeSection === 'commands' ? (
          <CommandsCatalogView headerActions={headerActions} />
        ) : (
          <AgentsCatalogView headerActions={headerActions} />
        )}
      </Suspense>
    </div>
  );
}

function CatalogFallback({ message }: { message: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-sm text-[color:var(--ts-text-muted)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[color:var(--ts-surface-border)] border-t-[color:var(--ts-accent)]" />
        <span>{message}</span>
      </div>
    </div>
  );
}
