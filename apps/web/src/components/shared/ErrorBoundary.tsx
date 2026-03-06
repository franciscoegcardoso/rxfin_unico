import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReport = () => {
    const { error } = this.state;
    const subject = encodeURIComponent('Reportar problema - RXFin');
    const body = encodeURIComponent(
      `Descreva o problema:\n\n\n---\nErro (se disponível):\n${error?.message ?? 'N/A'}\n${error?.stack ?? ''}`
    );
    window.open(`mailto:suporte@rxfin.com.br?subject=${subject}&body=${body}`, '_blank');
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="min-h-[40vh] flex items-center justify-center p-6">
          <Card className="max-w-md w-full rounded-2xl border border-border shadow-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <h2 className="text-lg font-semibold">Algo deu errado</h2>
              <p className="text-sm text-muted-foreground">
                Ocorreu um erro inesperado. Você pode tentar novamente ou reportar o problema.
              </p>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Button onClick={this.handleRetry} className="w-full gap-2">
                <RefreshCw className="h-4 w-4" />
                Tentar novamente
              </Button>
              <Button variant="outline" onClick={this.handleReport} className="w-full gap-2">
                <Bug className="h-4 w-4" />
                Reportar problema
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
