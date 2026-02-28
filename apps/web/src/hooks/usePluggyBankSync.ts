import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
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

const BATCH_SIZE = 50;

export function usePluggyBankSync() {
  const { user } = useAuth();
  const { fetchLancamentos } = useLancamentosRealizados();
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<BankSyncProgress>({
    step: 'idle', stepLabel: '', total: 0, processed: 0,
  });
  const runningRef = useRef(false);

  /**
   * Categorize bank transactions using the same AI edge function used for credit cards
   */
  const categorizeWithAI = useCallback(async (
    transactions: Array<{ description: string; amount: number; date: string }>
  ): Promise<Array<{ suggestedCategoryId: string; suggestedCategory: string }>> => {
    try {
      const response = await supabase.functions.invoke('categorize-transactions', {
        body: {
          transactions: transactions.map(t => ({
            storeName: t.description,
            value: Math.abs(t.amount),
            date: t.date,
          })),
        },
      });

      if (response.error) {
        console.error('AI categorization error:', response.error);
        throw new Error(response.error.message);
      }

      const { categorizedTransactions } = response.data;
      return transactions.map((_, index) => {
        const cat = categorizedTransactions?.[index];
        return {
          suggestedCategoryId: cat?.suggestedCategoryId || 'outros',
          suggestedCategory: cat?.suggestedCategory || 'Não atribuído',
        };
      });
    } catch (err) {
      console.error('Error categorizing bank transactions:', err);
      return transactions.map(() => ({
        suggestedCategoryId: 'outros',
        suggestedCategory: 'Não atribuído',
      }));
    }
  }, []);

  /**
   * Process a batch of bank transactions: categorize + insert into lancamentos_realizados
   */
  const processBatch = useCallback(async (
    batch: BankTransaction[],
    batchIndex: number,
    totalBatches: number,
  ): Promise<number> => {
    if (batch.length === 0) return 0;

    setProgress(prev => ({
      ...prev,
      step: 'categorizing',
      stepLabel: `Categorizando lote ${batchIndex + 1}/${totalBatches}…`,
    }));

    // Categorize
    const categories = await categorizeWithAI(
      batch.map(tx => ({
        description: tx.description_raw || tx.description,
        amount: tx.amount,
        date: tx.date.split('T')[0],
      }))
    );

    setProgress(prev => ({
      ...prev,
      step: 'importing',
      stepLabel: `Importando lote ${batchIndex + 1}/${totalBatches}…`,
    }));

    // Map to lancamentos_realizados records (sem source_type/source_id legados)
    const records = batch.map((tx, i) => {
      const dateOnly = tx.date.split('T')[0];
      const mesRef = dateOnly.substring(0, 7);
      const isExpense = tx.type === 'DEBIT';
      const absValue = Math.abs(tx.amount_in_account_currency || tx.amount);

      return {
        lancamento: {
          user_id: user!.id,
          tipo: isExpense ? 'despesa' : 'receita',
          categoria: categories[i].suggestedCategory,
          nome: tx.description_raw || tx.description,
          valor_previsto: absValue,
          valor_realizado: absValue,
          mes_referencia: mesRef,
          data_vencimento: dateOnly,
          data_pagamento: dateOnly,
          forma_pagamento: 'pix',
          source_type: 'pluggy_bank',
          source_id: tx.pluggy_transaction_id,
        },
        sourceId: tx.pluggy_transaction_id,
      };
    });

    // Insert in smaller sub-batches to avoid payload limits
    const SUB_BATCH = 25;
    let inserted = 0;
    for (let j = 0; j < records.length; j += SUB_BATCH) {
      const chunk = records.slice(j, j + SUB_BATCH);
      const lancamentos = chunk.map(r => r.lancamento);

      const { data, error } = await supabase
        .from('lancamentos_realizados')
        .insert(lancamentos)
        .select('id');

      if (error) {
        console.error(`Error inserting bank lancamentos (sub-batch ${j / SUB_BATCH + 1}):`, error);
        // Skip duplicates silently (unique constraint on metadata will catch them)
        if (error.code === '23505') continue;
        toast.error(`Erro ao salvar lote: ${error.message}`);
        continue;
      }

      // GOVERNANÇA: persist source tracking in lancamento_metadata
      if (data && data.length > 0) {
        const metadataRecords = data.map((row: any, idx: number) => ({
          lancamento_id: row.id,
          user_id: user!.id,
          source_type: 'pluggy_bank',
          source_id: chunk[idx].sourceId,
        }));

        const { error: metaError } = await supabase
          .from('lancamento_metadata' as any)
          .upsert(metadataRecords, { onConflict: 'lancamento_id', ignoreDuplicates: true });

        if (metaError) {
          console.error('Error inserting lancamento_metadata:', metaError);
        }
      }

      inserted += (data?.length || 0);
    }

    return inserted;
  }, [user, categorizeWithAI]);

  /**
   * Full sync: 
   * 1. Trigger historical-load on edge function (fetches from Pluggy API → pluggy_transactions)
   * 2. Read unsynced bank transactions from pluggy_transactions
   * 3. Categorize + insert into lancamentos_realizados
   */
  const startBankSync = useCallback(async (mode: 'full' | 'incremental' = 'full') => {
    if (!user || runningRef.current) return;
    runningRef.current = true;
    setSyncing(true);

    try {
      // Step 1: Fetch from Pluggy API
      setProgress({
        step: 'fetching-api',
        stepLabel: mode === 'full'
          ? 'Buscando histórico completo da API…'
          : 'Buscando transações recentes (15 dias)…',
        total: 0,
        processed: 0,
      });

      if (mode === 'full') {
        // Use the existing historical-load which processes ALL account types
        let done = false;
        let jobId: string | null = null;
        let nextResumePage: Record<string, number> | null = null;

        while (!done) {
          const { data, error } = await supabase.functions.invoke('pluggy-sync', {
            body: {
              action: 'historical-load',
              jobId,
              resumePage: nextResumePage,
            },
          });
          if (error) throw error;
          jobId = data?.jobId || jobId;
          done = data?.done === true;
          nextResumePage = data?.nextResumePage || null;
        }
      } else {
        // Incremental: last 15 days
        const { error } = await supabase.functions.invoke('pluggy-sync', {
          body: { action: 'incremental-sync' },
        });
        if (error) throw error;
      }

      // Step 2: Get unsynced bank transactions
      setProgress(prev => ({
        ...prev,
        step: 'categorizing',
        stepLabel: 'Processando transações bancárias…',
      }));

      const { data: unsyncedTxs, error: rpcError } = await supabase
        .rpc('get_unsynced_bank_transactions', { p_user_id: user.id });

      if (rpcError) {
        console.error('Error fetching unsynced bank txs:', rpcError);
        throw rpcError;
      }

      const txs = (unsyncedTxs || []) as unknown as BankTransaction[];

      if (txs.length === 0) {
        setProgress({
          step: 'done',
          stepLabel: 'Nenhuma transação nova encontrada.',
          total: 0,
          processed: 0,
        });
        toast.info('Nenhuma transação bancária nova para importar.');
        return { imported: 0 };
      }

      setProgress(prev => ({
        ...prev,
        total: txs.length,
        stepLabel: `${txs.length} transações para processar…`,
      }));

      // Step 3: Process in batches
      let totalImported = 0;
      const totalBatches = Math.ceil(txs.length / BATCH_SIZE);

      for (let i = 0; i < txs.length; i += BATCH_SIZE) {
        const batch = txs.slice(i, i + BATCH_SIZE);
        const batchIdx = Math.floor(i / BATCH_SIZE);
        const imported = await processBatch(batch, batchIdx, totalBatches);
        totalImported += imported;

        setProgress(prev => ({
          ...prev,
          processed: Math.min(i + BATCH_SIZE, txs.length),
        }));
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
  }, [user, processBatch, fetchLancamentos]);

  /**
   * Check how many unsynced transactions exist (for showing badge counts)
   */
  const getUnsyncedCount = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const { data, error } = await supabase
      .rpc('get_unsynced_bank_transactions', { p_user_id: user.id });
    if (error) return 0;
    return (data || []).length;
  }, [user]);

  /**
   * Get bank account coverage info
   */
  const getCoverage = useCallback(async () => {
    if (!user) return [];
    const { data, error } = await supabase
      .rpc('get_pluggy_bank_date_coverage', { p_user_id: user.id });
    if (error) return [];
    return data || [];
  }, [user]);

  return {
    syncing,
    progress,
    startBankSync,
    getUnsyncedCount,
    getCoverage,
  };
}
// sync
