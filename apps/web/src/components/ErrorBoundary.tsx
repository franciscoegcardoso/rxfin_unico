import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('Global ErrorBoundary caught:', error, errorInfo);
    }
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[hsl(var(--color-surface-base))] px-4">
          <div className="w-full max-w-md rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-elevated))] p-6 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-[hsl(var(--color-content-strong))]">Algo deu errado.</h2>
            <p className="mt-2 text-sm text-[hsl(var(--color-content-muted))]">
              Ocorreu um erro inesperado ao carregar a aplicacao.
            </p>
            <button
              type="button"
              onClick={this.handleReload}
              className="mt-4 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-[hsl(var(--color-on-primary))]"
              style={{ background: 'hsl(var(--color-primary))' }}
            >
              Recarregar pagina
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

