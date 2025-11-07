import { FolderOpen, PlayCircle, FileText } from 'lucide-react';

export interface NavigationPage {
  id: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

export const navigationPages: NavigationPage[] = [
  {
    id: 'courses',
    label: 'Courses',
    icon: <FolderOpen className="h-4 w-4" />,
    description: 'Manage courses and credentials',
  },
  {
    id: 'runs',
    label: 'Runs',
    icon: <PlayCircle className="h-4 w-4" />,
    description: 'View execution runs and results',
  },
  {
    id: 'artifacts',
    label: 'Artifacts',
    icon: <FileText className="h-4 w-4" />,
    description: 'Browse extracted artifacts and content',
  },
];

export function getPageById(id: string): NavigationPage | undefined {
  return navigationPages.find((page) => page.id === id);
}

export function getDefaultPage(): NavigationPage {
  return navigationPages[0];
}
