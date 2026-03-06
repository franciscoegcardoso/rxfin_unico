import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FipeAdminSummary } from '@/hooks/useFipeAdminSummary';

interface FipeStatusBannerProps {
  data: FipeAdminSummary | null;
}

export function FipeStatusBanner({ data }: FipeStatusBannerProps) {
  if (!data) return null;

  const runnerAt = data.runner?.last_run_at ? format(new Date(data.runner.last_run_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : null;
  const phase3At = data.phase3?.last_run_at ? format(new Date(data.phase3.last_run_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : null;
  const lastSync = runnerAt || phase3At || '—';

  return (
    <div className="rounded-lg border bg-card p-4 flex flex-wrap items-center gap-4">
      <Badge className="bg-green-600 hover:bg-green-700 text-white gap-1.5">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Ingestão Concluída
      </Badge>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Última sincronização: {lastSync}</span>
      </div>
      <div className="text-sm text-muted-foreground">
        Próxima execução automática: Dia 1 de cada mês, 06h00 (cron ativo)
      </div>
    </div>
  );
}
