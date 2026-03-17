import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, Clock, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import type { SyncStatusRow } from '@/types/investments';

export interface InvestmentSyncAlertProps {
  rows: SyncStatusRow[];
  onRefresh?: () => void;
}

const levelStyles: Record<
  Exclude<SyncStatusRow['alert_level'], 'none'>,
  { border: string; bg: string; iconWrap: string; title: string; body: string }
> = {
  info: {
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/[0.08]',
    iconWrap: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    body: 'text-blue-800/90 dark:text-blue-200/90',
  },
  warning: {
    border: 'border-amber-500/40',
    bg: 'bg-amber-500/[0.08]',
    iconWrap: 'text-amber-600 dark:text-amber-400',
    title: 'text-amber-900 dark:text-amber-100',
    body: 'text-amber-800/90 dark:text-amber-200/90',
  },
  error: {
    border: 'border-destructive/40',
    bg: 'bg-destructive/10',
    iconWrap: 'text-destructive',
    title: 'text-foreground',
    body: 'text-muted-foreground',
  },
};

function AlertCard({ row, onRefresh }: { row: SyncStatusRow; onRefresh?: () => void }) {
  const [explainOpen, setExplainOpen] = useState(false);
  const level = row.alert_level;
  if (level === 'none') return null;
  const styles = levelStyles[level];

  const icon =
    row.state === 'syncing' ? (
      <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden />
    ) : row.state === 'maturing' ? (
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
    ) : row.state === 'suspect_zero' ? (
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
    ) : row.state === 'login_error' ? (
      <XCircle className="h-4 w-4 shrink-0" aria-hidden />
    ) : (
      <Clock className="h-4 w-4 shrink-0" aria-hidden />
    );

  const maturingProgressPct = Math.min(100, (row.hours_since_connection / 24) * 100);

  return (
    <>
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px]',
          styles.border,
          styles.bg
        )}
      >
        <span className={cn('mt-0.5 shrink-0', styles.iconWrap)}>{icon}</span>
        <div className="min-w-0 flex-1 space-y-0.5">
          <p className={cn('font-semibold leading-tight', styles.title)}>
            {row.alert_title ?? 'Sincronização'}
          </p>
          <p className={cn('leading-relaxed opacity-90', styles.body)}>
            {row.alert_message ?? ''}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {row.state === 'maturing' && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setExplainOpen(true)}>
              Por que isso acontece?
            </Button>
          )}
          {row.state === 'login_error' && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" asChild>
              <Link to="/instituicoes-financeiras">Reconectar</Link>
            </Button>
          )}
          {row.state === 'suspect_zero' && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs" asChild>
              <a href="#investimentos-manuais">Ver posições</a>
            </Button>
          )}
          {onRefresh && (row.state === 'maturing' || row.state === 'suspect_zero') && (
            <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onRefresh}>
              <RefreshCw className="h-3 w-3" />
              Atualizar
            </Button>
          )}
        </div>
      </div>

      <Dialog open={explainOpen} onOpenChange={setExplainOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Por que os dados ainda não batem com o app do banco?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              O Open Finance sincroniza investimentos em ciclos diários. Quando você conecta uma
              corretora pela primeira vez, a Pluggy (nosso parceiro de integração) pode levar até
              24 horas para consolidar toda a carteira — especialmente fundos e renda variável.
            </p>
            <p>
              Durante esse período, alguns ativos podem aparecer com valores diferentes do app da
              corretora. Isso é normal e temporário.
            </p>
            <div className="space-y-1 rounded-lg border bg-muted/30 p-3">
              <p className="text-xs font-medium text-foreground">
                Conectado há {row.hours_since_connection.toFixed(1)} h — estável em ~{Math.max(0, row.hours_until_stable).toFixed(1)} h
              </p>
              <Progress value={maturingProgressPct} className="h-2" />
              <p className="text-[11px] text-muted-foreground">Janela de até 24 h após a primeira conexão</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setExplainOpen(false)}>Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function InvestmentSyncAlert({ rows, onRefresh }: InvestmentSyncAlertProps) {
  if (!rows?.length) return null;

  return (
    <div className="mb-4 flex flex-col gap-2">
      {rows.map((row) => (
        <AlertCard key={row.connection_id} row={row} onRefresh={onRefresh} />
      ))}
    </div>
  );
}
