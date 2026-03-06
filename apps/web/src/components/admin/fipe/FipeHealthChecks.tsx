import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { FipeAdminSummary } from '@/hooks/useFipeAdminSummary';

interface FipeHealthChecksProps {
  data: FipeAdminSummary | null;
}

const statusConfig: Record<string, { label: string; className: string; icon: React.ElementType }> = {
  ok: { label: 'OK', className: 'bg-green-600 text-white', icon: CheckCircle2 },
  warning: { label: 'Atenção', className: 'bg-amber-500 text-white', icon: AlertTriangle },
  error: { label: 'Erro', className: 'bg-destructive text-white', icon: XCircle },
  unknown: { label: 'Desconhecido', className: 'bg-muted text-muted-foreground', icon: HelpCircle },
};

const checkLabels: Record<string, string> = {
  anosAbsurdos: 'Anos absurdos',
  fipeCodesComHifen: 'FIPE codes com hífen',
  orfaosNoHistorico: 'Órfãos no histórico',
  anosFaltandoCatalog: 'Anos faltando no catálogo',
  camposNulosCriticos: 'Campos nulos críticos',
  yearIdInconsistentes: 'year_id inconsistentes',
  metadadosInconsistentes: 'Metadados inconsistentes',
};

export function FipeHealthChecks({ data }: FipeHealthChecksProps) {
  if (!data?.health) return null;

  const h = data.health;
  const config = statusConfig[h.status] ?? statusConfig.unknown;
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Health Check do catálogo</CardTitle>
            <CardDescription>
              Última execução: {h.lastRunAt ? format(new Date(h.lastRunAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : 'Nunca executado'}
            </CardDescription>
          </div>
          <Badge className={config.className} variant="secondary">
            <Icon className="h-3.5 w-3.5 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Total de issues: <strong className="text-foreground">{h.totalIssues}</strong>
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {h.checks && Object.entries(h.checks).map(([key, value]) => (
            <div key={key} className="rounded-md border p-2 text-center">
              <p className="text-lg font-bold tabular-nums">{value}</p>
              <p className="text-[10px] text-muted-foreground">{checkLabels[key] ?? key}</p>
            </div>
          ))}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="sm" disabled>
              Executar Health Check
            </Button>
          </TooltipTrigger>
          <TooltipContent>Em breve</TooltipContent>
        </Tooltip>
      </CardContent>
    </Card>
  );
}
