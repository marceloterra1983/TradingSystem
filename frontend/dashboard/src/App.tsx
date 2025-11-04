import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
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

interface AppContentProps {
  defaultPageId?: string;
}

function AppContent({ defaultPageId = 'workspace' }: AppContentProps) {
  useServiceAutoRecovery();

  return (
    <TooltipProvider>
      <Layout defaultPageId={defaultPageId} />
      <ToastContainer />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppContent defaultPageId="workspace" />} />
            <Route
              path="/documentation/metrics"
              element={<AppContent defaultPageId="documentation-metrics" />}
            />
            <Route
              path="/documentation-metrics"
              element={<AppContent defaultPageId="documentation-metrics" />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
