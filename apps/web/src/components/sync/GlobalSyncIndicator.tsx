import React from 'react';
import { useSyncContext } from '@/contexts/SyncContext';
import { usePluggyBankSync } from '@/hooks/usePluggyBankSync';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const GlobalSyncIndicator: React.FC = () => {
  // ── Faturas (SyncContext) ──────────────────────────
  const ctx = useSyncContext();
  const cardStep = ctx?.step ?? 'idle';
  const cardStepLabel = ctx?.stepLabel ?? '';
  const cardProgress = ctx?.progressPercent ?? 0;
  const cardBusy = ctx?.busy ?? false;
  const cardImported = ctx?.importedCount ?? 0;
  const cardTotal = ctx?.totalCount ?? 0;

  // ── Lançamentos bancários (usePluggyBankSync) ──────
  const { syncing: bankSyncing, progress: bankProgress } = usePluggyBankSync();

  // ── Determinar qual fluxo mostrar ──────────────────
  // Prioridade: fatura ativa > bank ativo > nenhum
  const showCard = cardStep !== 'idle' && cardStep !== 'incremental';
  const showBank = bankSyncing || bankProgress.step === 'done';
  const visible = showCard || showBank;

  // ── Dados do indicador ativo ───────────────────────
  const isBusy = showCard ? cardBusy : bankSyncing;
  const isDone = showCard
    ? cardStep === 'done'
    : bankProgress.step === 'done';

  const title = isBusy
    ? showCard ? 'Sincronizando faturas…' : 'Sincronizando extratos…'
    : 'Sincronização concluída!';

  const stepLabel = showCard
    ? cardStepLabel
    : bankProgress.stepLabel;

  // Progresso: para bank sync, calcular de processed/total
  const bankPercent = bankProgress.total > 0
    ? Math.round((bankProgress.processed / bankProgress.total) * 100)
    : bankProgress.step === 'fetching-api' ? 15
    : bankProgress.step === 'categorizing' ? 35
    : bankProgress.step === 'importing' ? 60
    : bankProgress.step === 'done' ? 100
    : 0;

  const progressPercent = showCard ? cardProgress : bankPercent;

  // Contagem de transações
  const importedCount = showCard ? cardImported : bankProgress.processed;
  const totalCount = showCard ? cardTotal : bankProgress.total;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-20 right-4 z-40 w-72 rounded-xl border bg-card text-card-foreground shadow-xl p-4 space-y-3"
        >
          {/* Header */}
          <div className="flex items-center gap-2">
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            )}
            <span className="text-sm font-semibold truncate">{title}</span>
          </div>

          {/* Step label */}
          {stepLabel ? (
            <p className="text-xs text-muted-foreground leading-snug min-h-[1rem]">
              {stepLabel}
            </p>
          ) : null}

          {/* Barra de progresso */}
          <div className="space-y-1">
            <Progress
              value={progressPercent}
              className="h-2 transition-all duration-500"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {totalCount > 0
                  ? `${importedCount} de ${totalCount} transações`
                  : isDone
                  ? importedCount > 0
                    ? `${importedCount} transações importadas`
                    : 'Tudo atualizado'
                  : ''}
              </span>
              <span className="font-medium tabular-nums">
                {Math.round(progressPercent)}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
