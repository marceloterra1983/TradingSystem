/**
 * ErrorBoundary Component
 *
 * React error boundary for TP-Capital module
 * Catches and handles runtime errors gracefully
 *
 * @module tp-capital/components
 */

import { Component, type ReactNode, type ErrorInfo } from "react";
import { AlertTriangle } from "@/icons";
import { Button } from "../../../ui/button";
import { createLogger } from "../utils/logger";

const logger = createLogger("ErrorBoundary");

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Component
 *
 * Catches React errors in child components and displays a fallback UI
 *
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <SignalsTable />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    logger.error("React Error Boundary caught error", error, {
      componentStack: errorInfo.componentStack,
    });

    // TODO: Send to Sentry or error tracking service
    // Sentry.captureException(error, { contexts: { react: errorInfo } });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 dark:border-red-900 dark:bg-red-950">
          <div className="flex items-start gap-4">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                Erro ao carregar componente
              </h3>
              <p className="text-sm text-red-800 dark:text-red-200 mb-4">
                Ocorreu um erro inesperado ao renderizar este componente. Por
                favor, tente recarregar a página.
              </p>

              {process.env.NODE_ENV === "development" && this.state.error && (
                <details className="mt-4 p-3 bg-red-100 dark:bg-red-900/30 rounded text-xs font-mono">
                  <summary className="cursor-pointer font-semibold text-red-900 dark:text-red-100 mb-2">
                    Detalhes do erro (desenvolvimento)
                  </summary>
                  <div className="mt-2 text-red-800 dark:text-red-200">
                    <p className="font-bold">{this.state.error.name}</p>
                    <p className="mt-1">{this.state.error.message}</p>
                    {this.state.error.stack && (
                      <pre className="mt-2 whitespace-pre-wrap break-all text-xs opacity-80">
                        {this.state.error.stack}
                      </pre>
                    )}
                  </div>
                </details>
              )}

              <div className="flex gap-2 mt-4">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                  className="border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  Tentar Novamente
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  variant="outline"
                  size="sm"
                  className="border-red-700 hover:bg-red-100 dark:hover:bg-red-900/50"
                >
                  Recarregar Página
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
