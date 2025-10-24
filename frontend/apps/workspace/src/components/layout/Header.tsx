import { Briefcase } from 'lucide-react';
import { ThemeToggle } from '../ui/theme-toggle';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:border-gray-800 dark:bg-gray-900/95">
      <div className="container flex h-16 items-center px-6">
        <div className="flex items-center gap-3">
          <Briefcase className="h-6 w-6 text-cyan-500" />
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">
              Workspace
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Gestão de Ideias e Funcionalidades
            </p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export default Header;

