import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FipeAdminSummary } from '@/hooks/useFipeAdminSummary';

interface FipeRunnerHistoryProps {
  data: FipeAdminSummary | null;
}

export function FipeRunnerHistory({ data }: FipeRunnerHistoryProps) {
  if (!data) return null;

  const runner = data.runner;
  const phase3 = data.phase3;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Runner (Fases 1–2)</CardTitle>
          <CardDescription>
            Ingestão automática do catálogo e preços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={runner?.status === 'completed' ? 'default' : 'secondary'}>
              {runner?.status ?? '—'}
            </Badge>
            <span className="text-muted-foreground">
              Fase {runner?.phase ?? '—'} · Iteração {runner?.iteration?.toLocaleString('pt-BR') ?? '—'}
            </span>
          </div>
          <p className="text-muted-foreground">
            Última execução: {runner?.last_run_at ? format(new Date(runner.last_run_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
          </p>
          {runner?.totals && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Inseridos (catálogo): {runner.totals.catalogInserted?.toLocaleString('pt-BR')}</li>
              <li>Preços inseridos: {runner.totals.pricesInserted?.toLocaleString('pt-BR')}</li>
              <li>Indisponíveis (424): {runner.totals.unavailable424?.toLocaleString('pt-BR')}</li>
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Phase 3</CardTitle>
          <CardDescription>
            Histórico retroativo e complementos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <Badge variant={phase3?.status === 'completed' ? 'default' : 'secondary'}>
              {phase3?.status ?? '—'}
            </Badge>
            <span className="text-muted-foreground">
              Iteração {phase3?.iteration?.toLocaleString('pt-BR') ?? '—'}
            </span>
          </div>
          <p className="text-muted-foreground">
            Última execução: {phase3?.last_run_at ? format(new Date(phase3.last_run_at), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
          </p>
          {phase3 && (
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Inseridos: {phase3.inserted?.toLocaleString('pt-BR')}</li>
              <li>Indisponíveis: {phase3.unavailable?.toLocaleString('pt-BR')} (normal para histórico antigo)</li>
              <li>Erros: {phase3.errors?.toLocaleString('pt-BR')} (veículos sem histórico no período)</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
