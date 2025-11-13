import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HashRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastContainer } from "./components/ui/toast";
import { TooltipProvider } from "./components/ui/tooltip";
import { useEffect, useMemo } from "react";
import { getDefaultPage, getPageById } from "./data/navigation";

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

function AppContent({ defaultPageId = "workspace" }: AppContentProps) {
  const { pageId } = useParams();
  const navigate = useNavigate();

  const fallbackPage = useMemo(() => {
    return getPageById(defaultPageId) ?? getDefaultPage();
  }, [defaultPageId]);

  const resolvedPageId = useMemo(() => {
    if (!pageId) {
      return fallbackPage.id;
    }

    const page = getPageById(pageId);
    return page?.id ?? fallbackPage.id;
  }, [fallbackPage.id, pageId]);

  useEffect(() => {
    if (!pageId) {
      navigate(`/${resolvedPageId}`, { replace: true });
      return;
    }

    if (!getPageById(pageId)) {
      navigate(`/${fallbackPage.id}`, { replace: true });
    }
  }, [fallbackPage.id, navigate, pageId, resolvedPageId]);

  const handlePageChange = (nextPageId: string) => {
    if (!nextPageId || nextPageId === pageId) {
      return;
    }

    const page = getPageById(nextPageId);
    if (!page) {
      return;
    }

    navigate(`/${page.id}`);
  };

  return (
    <TooltipProvider>
      <Layout currentPageId={resolvedPageId} onPageChange={handlePageChange} />
      <ToastContainer />
    </TooltipProvider>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark">
      <QueryClientProvider client={queryClient}>
        <HashRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <Routes>
            <Route
              path="/"
              element={<AppContent defaultPageId="workspace" />}
            />
            <Route path="/:pageId" element={<AppContent />} />
            <Route
              path="/documentation/metrics"
              element={<AppContent defaultPageId="documentation-metrics" />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </HashRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
