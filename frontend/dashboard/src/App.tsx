import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from './components/ui/toast';
import { TooltipProvider } from './components/ui/tooltip';
import { useServiceAutoRecovery } from './hooks/useServiceAutoRecovery';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AppContent() {
  // Ativa auto-recovery global para serviços críticos
  useServiceAutoRecovery();

  return (
    <TooltipProvider>
      <Layout defaultPageId="workspace" />
      <ToastContainer />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="system">
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
