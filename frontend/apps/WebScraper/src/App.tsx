import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/ui/toast';
import { TooltipProvider } from './components/ui/tooltip';
import { HomePage } from './components/pages/HomePage';
import { ScrapingPage } from './components/pages/ScrapingPage';
import { TemplatesPage } from './components/pages/TemplatesPage';
import { HistoryPage } from './components/pages/HistoryPage';
import { SchedulesPage } from './components/pages/SchedulesPage';
import { ExportsPage } from './components/pages/ExportsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30_000
    },
    mutations: {
      retry: 0
    }
  }
});

const router = createHashRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <HomePage />
      },
      {
        path: 'scraping',
        element: <ScrapingPage />
      },
      {
        path: 'templates',
        element: <TemplatesPage />
      },
      {
        path: 'history',
        element: <HistoryPage />
      },
      {
        path: 'schedules',
        element: <SchedulesPage />
      },
      {
        path: 'exports',
        element: <ExportsPage />
      }
    ]
  }
]);

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <RouterProvider router={router} />
          <ToastContainer />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
