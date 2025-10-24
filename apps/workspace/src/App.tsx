import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/ui/toast';
import { TooltipProvider } from './components/ui/tooltip';
import { Layout } from './components/layout/Layout';
import { WorkspacePageNew } from './components/WorkspacePageNew';

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
        element: <WorkspacePageNew />
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

