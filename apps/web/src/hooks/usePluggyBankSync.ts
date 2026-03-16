import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokePluggySync } from '@/lib/pluggySync';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useLancamentosRealizados } from './useLancamentosRealizados';

interface BankSyncProgress {
  step: 'idle' | 'fetching-api' | 'categorizing' | 'importing' | 'done';
  stepLabel: string;
  total: number;
  processed: number;
}

interface BankTransaction {
  pluggy_transaction_id: string;
  description: string;
  description_raw: string | null;
  amount: number;
  amount_in_account_currency: number | null;
  date: string;
  type: string; // DEBIT or CREDIT
  category: string | null;
  account_id: string;
}

export function usePluggyBankSync() {
  const { user } = useAuth();
  const { fetchLancamentos } = useLancamentosRealizados();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<BankSyncProgress>({
    step: 'idle', stepLabel: '', total: 0, processed: 0,
  });
  const runningRef = useRef(false);

  const getUnsyncedCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const { data, error } = await supabase
      .rpc('get_unsynced_bank_transactions', { p_user_id: user.id });
    if (error) return 0;
    return (data || []).length;
  }, [user]);

  const getCoverage = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .rpc('get_pluggy_bank_date_coverage', { p_user_id: user.id });
    if (error) return [];
    return data || [];
  }, [user]);

  const getImportedSummary = useCallback(async (): Promise<{
    total_imported: number;
    min_date: string | null;
    max_date: string | null;
    months_covered: number;
  }> => {
    if (!user) return { total_imported: 0, min_date: null, max_date: null, months_covered: 0 };
    const { data, error } = await supabase
      .rpc('get_imported_bank_summary', { p_user_id: user.id });
    if (error) return { total_imported: 0, min_date: null, max_date: null, months_covered: 0 };
    const raw = data as { total_imported?: number; min_date?: string; max_date?: string; months_covered?: number } | null;
    return {
      total_imported: raw?.total_imported ?? 0,
      min_date: raw?.min_date ?? null,
      max_date: raw?.max_date ?? null,
      months_covered: raw?.months_covered ?? 0,
    };
  }, [user]);

  /**
   * Full sync:
   * 1. Trigger historical-load or incremental-sync (enqueues async, does not block)
   * 2. Fetch unsynced bank transactions via RPC
   * 3. Import in batches via import_pluggy_bank_transactions (atomic in DB)
   */
  const startBankSync = useCallback(async (mode: 'full' | 'incremental' = 'full') => {
    if (!user || runningRef.current) return;
    runningRef.current = true;
    setSyncing(true);

    try {
      setProgress({
        step: 'fetching-api',
        stepLabel: mode === 'full'
          ? 'Buscando histórico completo da API…'
          : 'Buscando transações recentes (15 dias)…',
        total: 0,
        processed: 0,
      });

      // Disparar sync na Pluggy (assíncrono — enfileira, não bloqueia)
      {
        const action = mode === 'full' ? 'historical-load' : 'incremental-sync';
        const { error } = await invokePluggySync({ action });
        if (error) throw error;
        await new Promise(r => setTimeout(r, mode === 'full' ? 3000 : 1500));
      }

      // Step 2: buscar transações não sincronizadas
      setProgress(prev => ({
        ...prev,
        step: 'categorizing',
        stepLabel: 'Buscando transações bancárias…',
      }));

      const { data: unsyncedTxs, error: rpcError } = await supabase
        .rpc('get_unsynced_bank_transactions', { p_user_id: user.id });

      if (rpcError) {
        console.error('Error fetching unsynced bank txs:', rpcError);
        throw rpcError;
      }

      const txs = (unsyncedTxs || []) as BankTransaction[];

      if (txs.length === 0) {
        setProgress({
          step: 'done',
          stepLabel: 'Nenhuma transação nova encontrada.',
          total: 0,
          processed: 0,
        });
        const summary = await getImportedSummary();
        if (summary.total_imported > 0) {
          toast.info(`Dados em dia. ${summary.total_imported} transações importadas de ${summary.months_covered} meses.`);
        } else {
          toast.info('Nenhuma transação disponível para importar. Verifique suas conexões bancárias.');
        }
        return { imported: 0 };
      }

      setProgress(prev => ({
        ...prev,
        total: txs.length,
        stepLabel: `Importando ${txs.length} transações…`,
      }));

      // Step 3: Importar em lotes via RPC (atômica no banco)
      const RPC_BATCH = 100;
      let totalImported = 0;

      for (let i = 0; i < txs.length; i += RPC_BATCH) {
        const batch = txs.slice(i, i + RPC_BATCH);

        setProgress(prev => ({
          ...prev,
          step: 'importing',
          stepLabel: `Importando ${Math.min(i + RPC_BATCH, txs.length)}/${txs.length}…`,
          processed: i,
        }));

        const { data: importResult, error: importError } = await supabase
          .rpc('import_pluggy_bank_transactions', {
            p_user_id: user.id,
            p_transactions: batch as unknown as never,
          });

        if (importError) {
          console.error('Error importing batch:', importError);
          toast.error(`Erro ao importar lote: ${importError.message}`);
          continue;
        }

        totalImported += (importResult as { inserted?: number } | null)?.inserted ?? 0;
      }

      setProgress({
        step: 'done',
        stepLabel: `${totalImported} transações importadas com sucesso!`,
        total: txs.length,
        processed: txs.length,
      });

      toast.success(`${totalImported} transações bancárias sincronizadas!`);
      await fetchLancamentos();
      return { imported: totalImported };
    } catch (err) {
      console.error('Bank sync error:', err);
      toast.error('Erro na sincronização bancária');
      setProgress(prev => ({ ...prev, step: 'idle', stepLabel: '' }));
      return { imported: 0 };
    } finally {
      setSyncing(false);
      runningRef.current = false;
    }
  }, [user, fetchLancamentos, getImportedSummary]);

  return {
    syncing,
    progress,
    startBankSync,
    getUnsyncedCount,
    getCoverage,
    getImportedSummary,
  };
}
