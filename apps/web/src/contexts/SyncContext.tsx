import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { usePluggyCreditCardSync } from '@/hooks/usePluggyCreditCardSync';
import { toast } from 'sonner';

type SyncStep = 'idle' | 'incremental' | 'local-sync' | 'historical' | 'backfill' | 'reconcile' | 'done';

function getStepLabel(s: SyncStep, imported: number, total: number, card: string): string {
  if (s === 'local-sync') {
    if (total > 0) return `Importando ${imported}/${total} transações${card ? ` · ${card}` : ''}…`;
    return 'Importando transações…';
  }
  return {
    idle: '',
    incremental: 'Buscando transações recentes…',
    historical: 'Verificando lacunas no histórico…',
    backfill: 'Vinculando transações às faturas…',
    reconcile: 'Reconciliando pagamentos…',
    done: 'Sincronização concluída!',
  }[s] ?? '';
}

interface SyncContextValue {
  step: SyncStep;
  stepLabel: string;
  progressPercent: number;
  busy: boolean;
  jobProgress: { transactions_saved: number; bills_linked: number } | null;
  importedCount: number;
  totalCount: number;
  currentCard: string;
  startFullSync: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

const FALLBACK: SyncContextValue = {
  step: 'idle',
  stepLabel: '',
  progressPercent: 0,
  busy: false,
  jobProgress: null,
  importedCount: 0,
  totalCount: 0,
  currentCard: '',
  startFullSync: () => {},
};

export const useSyncContext = () => {
  const ctx = useContext(SyncContext);
  return ctx ?? FALLBACK;
};

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [importedCount, setImportedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [currentCard, setCurrentCard] = useState('');
  const { syncing, historicalLoading, incrementalSync, historicalLoad, backfillBillIds, localSync, reconcileBills, jobProgress } = usePluggyCreditCardSync(
    false,
    (imported, total, cardName) => {
      setImportedCount(imported);
      setTotalCount(total);
      setCurrentCard(cardName);
    }
  );
  const [step, setStep] = useState<SyncStep>('idle');
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  const busy = running || syncing || historicalLoading;

  const startFullSync = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    setImportedCount(0);
    setTotalCount(0);
    setCurrentCard('');

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
  const progressPercent = step === 'done'
    ? 100
    : step === 'idle'
    ? 0
    : step === 'local-sync' && totalCount > 0
    ? 17 + Math.round((importedCount / totalCount) * 16)
    : Math.round((stepIndex / 6) * 100);

  return (
    <SyncContext.Provider value={{
      step,
      stepLabel: getStepLabel(step, importedCount, totalCount, currentCard),
      progressPercent,
      busy,
      jobProgress,
      importedCount,
      totalCount,
      currentCard,
      startFullSync,
    }}>
      {children}
    </SyncContext.Provider>
  );
};
