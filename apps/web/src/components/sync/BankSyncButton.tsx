import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Wallet, 
  Loader2, 
  CheckCircle2, 
  Download, 
  RefreshCw,
  ArrowRight,
  Info,
} from 'lucide-react';
import { usePluggyBankSync } from '@/hooks/usePluggyBankSync';
import { cn } from '@/lib/utils';

interface BankSyncButtonProps {
  variant?: 'button' | 'card';
  className?: string;
}

export const BankSyncButton: React.FC<BankSyncButtonProps> = ({
  variant = 'button',
  className,
}) => {
  const { syncing, progress, startBankSync, getUnsyncedCount, getCoverage } = usePluggyBankSync();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<Array<{ account_name: string; min_date: string; max_date: string; tx_count: number }>>([]);
  const [hasEverSynced, setHasEverSynced] = useState<boolean | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const count = await getUnsyncedCount();
      setUnsyncedCount(count);
      const cov = await getCoverage();
      setCoverage(cov);
      setHasEverSynced(cov.length > 0);
    };
    checkStatus();
  }, [getUnsyncedCount, getCoverage, syncing]);

  const progressPercent = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : progress.step === 'fetching-api' ? 15
    : progress.step === 'done' ? 100 : 0;

  const handleSync = async (mode: 'full' | 'incremental') => {
    await startBankSync(mode);
  };

  if (variant === 'card') {
    return (
      <>
        <div
          className={cn(
            "rounded-lg border bg-card p-4 space-y-3 cursor-pointer hover:bg-muted/50 transition-colors",
            className
          )}
          onClick={() => !syncing && setDialogOpen(true)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">Sincronizar Extratos Bancários</p>
                <p className="text-xs text-muted-foreground">
                  {hasEverSynced === false
                    ? 'Carga inicial pendente'
                    : coverage.length > 0
                      ? `${coverage.reduce((s, c) => s + c.tx_count, 0)} transações sincronizadas`
                      : 'Importar transações para lançamentos'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {unsyncedCount !== null && unsyncedCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unsyncedCount} novas
                </Badge>
              )}
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>

          {syncing && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="truncate">{progress.stepLabel}</span>
                <span>{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-1.5" />
            </div>
          )}
        </div>

        <BankSyncDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          syncing={syncing}
          progress={progress}
          progressPercent={progressPercent}
          coverage={coverage}
          hasEverSynced={hasEverSynced}
          unsyncedCount={unsyncedCount}
          onSync={handleSync}
        />
      </>
    );
  }

  // Button variant
  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className={cn("gap-2", className)}
        onClick={() => !syncing && setDialogOpen(true)}
        disabled={syncing}
      >
        {syncing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : progress.step === 'done' ? (
          <CheckCircle2 className="h-4 w-4 text-primary" />
        ) : (
          <Wallet className="h-4 w-4" />
        )}
        {syncing ? 'Sincronizando…' : 'Sincronizar Extratos'}
        {!syncing && unsyncedCount !== null && unsyncedCount > 0 && (
          <Badge variant="secondary" className="text-xs ml-1">
            {unsyncedCount}
          </Badge>
        )}
      </Button>

      <BankSyncDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        syncing={syncing}
        progress={progress}
        progressPercent={progressPercent}
        coverage={coverage}
        hasEverSynced={hasEverSynced}
        unsyncedCount={unsyncedCount}
        onSync={handleSync}
      />
    </>
  );
};

// ── Dialog ──

interface BankSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncing: boolean;
  progress: { step: string; stepLabel: string; total: number; processed: number };
  progressPercent: number;
  coverage: Array<{ account_name: string; min_date: string; max_date: string; tx_count: number }>;
  hasEverSynced: boolean | null;
  unsyncedCount: number | null;
  onSync: (mode: 'full' | 'incremental') => void;
}

const BankSyncDialog: React.FC<BankSyncDialogProps> = ({
  open,
  onOpenChange,
  syncing,
  progress,
  progressPercent,
  coverage,
  hasEverSynced,
  unsyncedCount,
  onSync,
}) => {
  // Smart mode: if never synced OR there are pending unsynced transactions, use full load
  const needsFullLoad = hasEverSynced === false || (unsyncedCount !== null && unsyncedCount > 0);
  const recommendedMode: 'full' | 'incremental' = needsFullLoad ? 'full' : 'incremental';

  const getStatusMessage = () => {
    if (hasEverSynced === false) {
      return {
        icon: <Download className="h-4 w-4 text-primary shrink-0" />,
        text: 'Nenhuma transação importada ainda. Vamos buscar todo o histórico disponível nas suas contas.',
        bgClass: 'bg-primary/5 border-primary/20',
      };
    }
    if (unsyncedCount !== null && unsyncedCount > 0) {
      return {
        icon: <Download className="h-4 w-4 text-muted-foreground shrink-0" />,
        text: `${unsyncedCount} transações pendentes. Vamos importá-las para seus lançamentos.`,
        bgClass: 'bg-muted/50 border-border',
      };
    }
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />,
      text: 'Tudo sincronizado! Você pode buscar as transações mais recentes.',
      bgClass: 'bg-primary/5 border-primary/20',
    };
  };

  const getButtonLabel = () => {
    if (hasEverSynced === false) return 'Importar Histórico';
    if (unsyncedCount !== null && unsyncedCount > 0) return `Importar ${unsyncedCount} Transações`;
    return 'Buscar Atualizações';
  };

  const status = getStatusMessage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Sincronizar Extratos Bancários
          </DialogTitle>
          <DialogDescription>
            Importa transações das suas contas bancárias conectadas via Open Finance para os lançamentos realizados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Coverage info */}
          {coverage.length > 0 && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2.5">
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" />
                Contas conectadas
              </p>
              <div className="space-y-1.5">
                {coverage.map((c, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 text-sm py-1 border-b border-border/40 last:border-0 last:pb-0">
                    <span className="font-medium truncate min-w-0 flex-1">{c.account_name}</span>
                    <div className="flex flex-col items-end shrink-0 text-xs text-muted-foreground">
                      <span>{c.tx_count} transações</span>
                      <span>{formatDateRange(c.min_date, c.max_date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Smart status message */}
          {!syncing && progress.step !== 'done' && (
            <div className={cn("flex items-start gap-2.5 p-3 rounded-lg border", status.bgClass)}>
              {status.icon}
              <span className="text-sm">{status.text}</span>
            </div>
          )}

          {/* Progress */}
          {syncing && (
            <div className="space-y-3 p-3 rounded-lg border bg-muted/20">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
                <span className="text-sm font-medium truncate">{progress.stepLabel}</span>
              </div>
              <Progress value={progressPercent} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{progressPercent}%</span>
                {progress.total > 0 && (
                  <span>{progress.processed}/{progress.total} transações</span>
                )}
              </div>
            </div>
          )}

          {/* Done state */}
          {!syncing && progress.step === 'done' && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
              <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
              <span className="text-sm font-medium">{progress.stepLabel}</span>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2">
          {!syncing && (
            <Button
              onClick={() => onSync(recommendedMode)}
              className="w-full gap-2"
            >
              {recommendedMode === 'full' ? (
                <Download className="h-4 w-4" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {getButtonLabel()}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const formatDateRange = (minDate: string, maxDate: string) => {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const formatMonth = (d: string) => {
    const [y, m] = d.substring(0, 7).split('-');
    return `${months[parseInt(m) - 1]}/${y}`;
  };
  return `${formatMonth(minDate)} a ${formatMonth(maxDate)}`;
};
