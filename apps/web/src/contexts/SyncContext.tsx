import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { usePluggyCreditCardSync } from '@/hooks/usePluggyCreditCardSync';
import { toast } from 'sonner';

type SyncStep = 'idle' | 'incremental' | 'local-sync' | 'historical' | 'backfill' | 'reconcile' | 'done';

const STEP_LABELS: Record<SyncStep, string> = {
  idle: '',
  incremental: 'Buscando transações recentes (15 dias)…',
  'local-sync': 'Importando transações do banco…',
  historical: 'Verificando lacunas no histórico…',
  backfill: 'Vinculando transações às faturas…',
  reconcile: 'Reconciliando pagamentos de faturas…',
  done: 'Sincronização concluída!',
};

interface SyncContextValue {
  step: SyncStep;
  stepLabel: string;
  progressPercent: number;
  busy: boolean;
  jobProgress: { transactions_saved: number; bills_linked: number } | null;
  startFullSync: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const FALLBACK: SyncContextValue = {
  step: 'idle',
  stepLabel: '',
  progressPercent: 0,
  busy: false,
  jobProgress: null,
  startFullSync: () => {},
};

export const useSyncContext = () => {
  const ctx = useContext(SyncContext);
  return ctx ?? FALLBACK;
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { syncing, historicalLoading, incrementalSync, historicalLoad, backfillBillIds, localSync, reconcileBills, jobProgress } = usePluggyCreditCardSync();
  const [step, setStep] = useState<SyncStep>('idle');
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const busy = running || syncing || historicalLoading;

  const startFullSync = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);

    (async () => {
      try {
        setStep('incremental');
        await incrementalSync();

        setStep('local-sync');
        await localSync();

        setStep('historical');
        await historicalLoad();

        setStep('backfill');
        await backfillBillIds();

        setStep('reconcile');
        await reconcileBills();

        setStep('done');
        toast.success('Sincronização completa! Todas as faturas foram atualizadas.');
        setTimeout(() => setStep('idle'), 5000);
      } catch (err) {
        console.error('Full sync error:', err);
        toast.error('Erro na sincronização');
        setStep('idle');
      } finally {
        setRunning(false);
        runningRef.current = false;
      }
    })();
  }, [incrementalSync, localSync, historicalLoad, backfillBillIds, reconcileBills]);

  const stepIndex = ['idle', 'incremental', 'local-sync', 'historical', 'backfill', 'reconcile', 'done'].indexOf(step);
  const progressPercent = step === 'done' ? 100 : step === 'idle' ? 0 : ((stepIndex) / 6) * 100;

  return (
    <SyncContext.Provider value={{
      step,
      stepLabel: STEP_LABELS[step],
      progressPercent,
      busy,
      jobProgress,
      startFullSync,
    }}>
      {children}
    </SyncContext.Provider>
  );
};
