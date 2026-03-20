import React, { Component, ErrorInfo, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SectionErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle: string;
  onReset?: () => void;
}

interface SectionErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class SectionErrorBoundary extends Component<SectionErrorBoundaryProps, SectionErrorBoundaryState> {
  public state: SectionErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): SectionErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error(`SectionErrorBoundary (${this.props.fallbackTitle})`, error, errorInfo);
      return;
    }

    void supabase.from('analytics_events').insert({
      event_type: 'error',
      event_name: 'component_error',
      metadata: {
        message: error.message,
        component: this.props.fallbackTitle,
      },
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full rounded-xl border border-[hsl(var(--color-border-subtle))] bg-[hsl(var(--color-surface-elevated))] p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-[hsl(var(--color-content-strong))]">{this.props.fallbackTitle}</h3>
          <p className="mt-1 text-xs text-[hsl(var(--color-content-muted))]">
            Nao foi possivel carregar esta secao. Verifique sua conexao.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-[hsl(var(--color-on-primary))]"
              style={{ background: 'hsl(var(--color-primary))' }}
            >
              Tentar novamente
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-md border border-[hsl(var(--color-border-subtle))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--color-content-strong))]"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

