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
              ? 'border-cyan-500 bg-cyan-600 text-white shadow-sm hover:bg-cyan-500 focus:ring-cyan-500 dark:border-cyan-500 dark:bg-cyan-600 dark:text-white'
              : 'border-slate-300 bg-white text-slate-700 hover:border-cyan-400 hover:text-cyan-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-cyan-500 dark:hover:text-cyan-300',
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
      <div className="flex flex-col items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-cyan-500 dark:border-gray-700 dark:border-t-cyan-400" />
        <span>{message}</span>
      </div>
    </div>
  );
}
