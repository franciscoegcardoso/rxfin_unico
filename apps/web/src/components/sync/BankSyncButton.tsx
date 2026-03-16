import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Link2,
} from 'lucide-react';
import { usePluggyBankSync } from '@/hooks/usePluggyBankSync';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface BankSyncButtonProps {
  variant?: 'button' | 'card';
  className?: string;
}

export const BankSyncButton: React.FC<BankSyncButtonProps> = ({
  variant = 'button',
  className,
}) => {
  const { syncing, progress, startBankSync, getUnsyncedCount,
          getCoverage, getImportedSummary } = usePluggyBankSync();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState<number | null>(null);
  const [coverage, setCoverage] = useState<Array<{ account_name: string; min_date: string; max_date: string; tx_count: number }>>([]);
  const [hasEverSynced, setHasEverSynced] = useState<boolean | null>(null);
  const [importedSummary, setImportedSummary] = useState<{
    total_imported: number;
    min_date: string | null;
    max_date: string | null;
    months_covered: number;
  } | null>(null);

  useEffect(() => {
    const checkStatus = async () => {
      const count = await getUnsyncedCount();
      setUnsyncedCount(count);
      const cov = await getCoverage();
      setCoverage(cov);
      const summary = await getImportedSummary();
      setImportedSummary(summary);
      setHasEverSynced(summary.total_imported > 0);
    };
    checkStatus();
  }, [getUnsyncedCount, getCoverage, getImportedSummary, syncing]);

  const progressPercent = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : progress.step === 'fetching-api' ? 15
    : progress.step === 'done' ? 100 : 0;

  const handleSync = async (mode: 'full' | 'incremental') => {
    await startBankSync(mode);
    // Fire-and-forget: sincronizar investimentos Open Finance (não bloqueia o fluxo)
    supabase.functions.invoke('pluggy-sync', { body: { action: 'sync-investments' } }).catch(() => {});
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
                  {importedSummary !== null && importedSummary.total_imported === 0
                    ? 'Histórico não importado — clique para iniciar'
                    : importedSummary && importedSummary.total_imported > 0
                      ? `${importedSummary.total_imported} transações em Lançamentos`
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
          importedSummary={importedSummary}
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
        importedSummary={importedSummary}
        onSync={handleSync}
      />
    </>
  );
};

// ── Dialog ──

interface ImportedSummary {
  total_imported: number;
  min_date: string | null;
  max_date: string | null;
  months_covered: number;
}

interface BankSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  syncing: boolean;
  progress: { step: string; stepLabel: string; total: number; processed: number };
  progressPercent: number;
  coverage: Array<{ account_name: string; min_date: string; max_date: string; tx_count: number }>;
  hasEverSynced: boolean | null;
  unsyncedCount: number | null;
  importedSummary: ImportedSummary | null;
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
  importedSummary,
  onSync,
}) => {
  const navigate = useNavigate();
  const hasConnectedBank = coverage.length > 0;
  const neverImported = importedSummary !== null && importedSummary.total_imported === 0;
  const needsFullLoad = neverImported || (unsyncedCount !== null && unsyncedCount > 0);
  const recommendedMode: 'full' | 'incremental' = needsFullLoad ? 'full' : 'incremental';

  const handleGoToInstitutions = () => {
    onOpenChange(false);
    navigate('/instituicoes-financeiras');
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const getStatusMessage = () => {
    if (neverImported) {
      return {
        icon: <Download className="h-4 w-4 text-primary shrink-0" />,
        text: 'Histórico ainda não importado. Vamos buscar todas as transações disponíveis.',
        bgClass: 'bg-primary/5 border-primary/20',
      };
    }
    if (unsyncedCount !== null && unsyncedCount > 0) {
      return {
        icon: <Download className="h-4 w-4 text-muted-foreground shrink-0" />,
        text: `${unsyncedCount} novas transações disponíveis para importar.`,
        bgClass: 'bg-muted/50 border-border',
      };
    }
    const imported = importedSummary?.total_imported ?? 0;
    const months = importedSummary?.months_covered ?? 0;
    const minDate = importedSummary?.min_date
      ? new Date(importedSummary.min_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      : null;
    const maxDate = importedSummary?.max_date
      ? new Date(importedSummary.max_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      : null;
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />,
      text: imported > 0
        ? `✅ ${imported} transações em Lançamentos (${months} meses${minDate && maxDate ? ` · ${minDate} a ${maxDate}` : ''}). Clique para buscar atualizações recentes.`
        : 'Nenhuma transação importada ainda.',
      bgClass: 'bg-primary/5 border-primary/20',
    };
  };

  const getButtonLabel = () => {
    if (neverImported) return 'Importar Histórico Completo';
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
            {hasConnectedBank
              ? 'Importa transações das suas contas bancárias conectadas via Open Finance para os lançamentos realizados.'
              : 'Conecte pelo menos uma conta para importar extratos.'}
          </DialogDescription>
        </DialogHeader>

        {/* Sem conta conectada: aviso e CTA para instituições */}
        {!hasConnectedBank && !syncing && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Para importar seus extratos, você precisa ter pelo menos uma conta bancária conectada via Open Finance. Leva menos de 2 minutos.
            </p>
            <DialogFooter className="pt-2 flex-col sm:flex-row gap-2">
              <Button variant="outline" className="w-full sm:w-auto order-2 sm:order-1" onClick={handleCancel}>
                Cancelar
              </Button>
              <Button className="w-full sm:w-auto gap-2 order-1 sm:order-2" onClick={handleGoToInstitutions}>
                <Link2 className="h-4 w-4" />
                Ir para Instituições Financeiras
              </Button>
            </DialogFooter>
          </div>
        )}

        {hasConnectedBank && (
        <>
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
        </>
        )}
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
