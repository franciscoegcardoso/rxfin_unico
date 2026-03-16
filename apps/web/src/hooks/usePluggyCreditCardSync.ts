import { useState, useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokePluggySync } from '@/lib/pluggySync';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PendingTransaction, useCreditCardTransactions } from './useCreditCardTransactions';

interface PluggyAccountWithConnection {
  id: string;
  pluggy_account_id: string;
  name: string;
  type: string;
  subtype: string | null;
  connection_id: string;
  connector_name: string;
}

interface SyncJobProgress {
  id: string;
  status: 'running' | 'completed' | 'error';
  progress: number;
  current_step: string;
  transactions_saved: number;
  bills_linked: number;
}

export function usePluggyCreditCardSync(autoSync = false) {
  const { user, session } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const [historicalLoading, setHistoricalLoading] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [jobProgress, setJobProgress] = useState<SyncJobProgress | null>(null);
  const { categorizeWithAI, importTransactions, fetchTransactions } = useCreditCardTransactions();
  const hasSynced = useRef(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchCreditCardAccounts = useCallback(async (): Promise<PluggyAccountWithConnection[]> => {
    if (!user) return [];

    const { data: accounts, error } = await supabase
      .from('pluggy_accounts')
      .select('id, pluggy_account_id, name, type, subtype, connection_id')
      .eq('type', 'CREDIT')
      .is('deleted_at', null)
      .order('name');

    if (error) {
      console.error('Error fetching pluggy credit accounts:', error);
      return [];
    }

    if (!accounts || accounts.length === 0) return [];

    const connectionIds = [...new Set(accounts.map(a => a.connection_id))];
    const { data: connections } = await supabase
      .from('pluggy_connections')
      .select('id, connector_name')
      .in('id', connectionIds)
      .is('deleted_at', null);

    const connMap = new Map((connections || []).map(c => [c.id, c.connector_name]));

    return accounts.map(a => ({
      ...a,
      connector_name: connMap.get(a.connection_id) || 'Banco',
    }));
  }, [user]);

  // ─── FILTER: Exclude payment/credit transactions ───
  const isExcludedTransaction = (description: string): boolean => {
    const excludeKeywords = ['Pagamento de fatura', 'Recebido', 'Desconto Antecipação'];
    return excludeKeywords.some(kw => description.toLowerCase().includes(kw.toLowerCase()));
  };

  // ─── PROCESS BATCH: categorize + import a batch of pluggy transactions ───
  const processBatch = useCallback(async (
    batchTxs: any[],
    account: PluggyAccountWithConnection,
    sortedBills: Array<{ id: string; closing_date: string }>,
    batchLabel: string,
  ): Promise<number> => {
    // Additional filter for payment keywords
    const filteredTxs = batchTxs.filter(t => {
      const desc = t.description || t.description_raw || '';
      return !isExcludedTransaction(desc);
    });

    if (filteredTxs.length === 0) return 0;

    // Dedup check: query existing transactions for this card to avoid duplicates
    const existingKeys = new Set<string>();
    if (account.id) {
      const dates = filteredTxs.map(t => {
        const d = typeof t.date === 'string' ? t.date.split('T')[0] : String(t.date);
        return d;
      });
      const minDate = dates.sort()[0];
      const maxDate = dates.sort().reverse()[0];
      
      const { data: existing } = await supabase
        .from('credit_card_transactions_v')
        .select('store_name, transaction_date, installment_current, installment_total, value')
        .eq('card_id', account.id)
        .gte('transaction_date', minDate)
        .lte('transaction_date', maxDate);
      
      if (existing) {
        for (const e of existing) {
          const key = `${e.store_name}::${e.transaction_date}::${e.installment_current || ''}::${e.installment_total || ''}::${e.value}`;
          existingKeys.add(key);
        }
      }
    }

      const pending: PendingTransaction[] = filteredTxs.map(t => {
      const desc = t.description || t.description_raw || 'Transação';
      const rawDate = typeof t.date === 'string' ? t.date.split('T')[0] : t.date;
      const txStatus = t.status || 'POSTED';

      let installmentCurrent: number | undefined;
      let installmentTotal: number | undefined;
      let storeName = desc;

      const ccMeta = t.credit_card_metadata;
      let purchaseDate: string | null = null;
      if (ccMeta && typeof ccMeta === 'object') {
        if (ccMeta.installmentNumber) installmentCurrent = ccMeta.installmentNumber;
        if (ccMeta.totalInstallments) installmentTotal = ccMeta.totalInstallments;
        if (ccMeta.purchaseDate && typeof ccMeta.purchaseDate === 'string') {
          purchaseDate = ccMeta.purchaseDate.split('T')[0];
        }
      }

      if (!installmentCurrent) {
        const installmentMatch = desc.match(/^(.+?)\s+(\d{1,2})\/(\d{1,2})\s*$/);
        if (installmentMatch) {
          storeName = installmentMatch[1].trim();
          installmentCurrent = parseInt(installmentMatch[2]);
          installmentTotal = parseInt(installmentMatch[3]);
        }

        const parcMatch = desc.match(/^PARC=(\d)(\d{2})(.+)$/);
        if (parcMatch && !installmentCurrent) {
          installmentCurrent = parseInt(parcMatch[1]);
          installmentTotal = parseInt(parcMatch[2]);
          storeName = parcMatch[3].trim();
        }
      }

      // Preserve sign: negative values = refunds/chargebacks
      const rawValue = t.amount_in_account_currency || t.amount;
      // Pluggy returns positive for debits and negative for credits/refunds
      // We keep the absolute value for normal purchases, negative for refunds
      const value = rawValue < 0 ? rawValue : Math.abs(rawValue);

      return {
        storeName,
        value,
        date: rawDate,
        installmentCurrent,
        installmentTotal,
        pluggyTransactionId: t.pluggy_transaction_id,
        status: txStatus === 'PENDING' ? 'PENDING' : 'COMPLETED',
        purchaseDate,
      };
    });

    // Filter out transactions that already exist in the database (dedup by attributes)
    const dedupedIndices: number[] = [];
    const dedupedPending: PendingTransaction[] = [];
    const dedupedFilteredTxs: any[] = [];

    for (let i = 0; i < pending.length; i++) {
      const p = pending[i];
      const key = `${p.storeName}::${p.date}::${p.installmentCurrent || ''}::${p.installmentTotal || ''}::${p.value}`;
      if (existingKeys.has(key)) {
        console.log(`[dedup] Skipping existing: ${p.storeName} ${p.date}`);
        continue;
      }
      dedupedIndices.push(i);
      dedupedPending.push(p);
      dedupedFilteredTxs.push(filteredTxs[i]);
    }

    if (dedupedPending.length === 0) return 0;

    console.log(`[${account.connector_name}] ${batchLabel} (${dedupedPending.length}/${filteredTxs.length} transações após dedup)`);

    const categorized = await categorizeWithAI(dedupedPending);
    const batchId = crypto.randomUUID();

    // Resolve bill IDs
    const txBillIds = dedupedFilteredTxs.map(t => {
      const pluggyBillId = t.bill_id;
      if (pluggyBillId) return pluggyBillId;
      const txDate = typeof t.date === 'string' ? t.date.split('T')[0] : String(t.date);
      const matchingBill = sortedBills.find(b => b.closing_date >= txDate);
      return matchingBill ? matchingBill.id : null;
    });

    const { success, transactionIds } = await importTransactions(categorized, account.id, batchId);

    if (success && transactionIds.length > 0) {
      for (let j = 0; j < transactionIds.length; j++) {
        const billId = txBillIds[j];
        if (billId) {
          await supabase
            .from('credit_card_transactions_v')
            .update({ credit_card_bill_id: billId })
            .eq('id', transactionIds[j]);
        }
      }
      return transactionIds.length;
    }

    return 0;
  }, [categorizeWithAI, importTransactions]);

  // ─── LOCAL SYNC: Process unsynced pluggy_transactions using RPC ───
  const localSync = useCallback(async (): Promise<{ imported: number }> => {
    if (!user) return { imported: 0 };

    setSyncing(true);
    try {
      const accounts = await fetchCreditCardAccounts();
      if (accounts.length === 0) return { imported: 0 };

      let totalImported = 0;
      const BATCH_SIZE = 50;

      for (const account of accounts) {
        // Use the new RPC to get only unsynced transactions
        const { data: unsyncedTxs, error: rpcError } = await supabase
          .rpc('get_unsynced_pluggy_transactions', { p_account_id: account.id });

        if (rpcError) {
          console.error(`Error fetching unsynced txs for ${account.name}:`, rpcError);
          continue;
        }

        if (!unsyncedTxs || unsyncedTxs.length === 0) {
          console.log(`[${account.connector_name}] Nenhuma transação pendente de importação`);
          continue;
        }

        console.log(`[${account.connector_name}] ${unsyncedTxs.length} transações pendentes de importação`);

        // Fetch bills for bill linking
        const { data: existingBills } = await supabase
          .from('credit_card_bills')
          .select('id, closing_date')
          .eq('card_id', account.id)
          .order('closing_date', { ascending: true });

        const sortedBills = (existingBills || []).map(b => ({
          id: b.id,
          closing_date: b.closing_date,
        }));

        // Process in batches
        for (let i = 0; i < unsyncedTxs.length; i += BATCH_SIZE) {
          const batch = unsyncedTxs.slice(i, i + BATCH_SIZE);
          const batchLabel = `Lote local ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(unsyncedTxs.length / BATCH_SIZE)}`;
          const imported = await processBatch(batch, account, sortedBills, batchLabel);
          totalImported += imported;
        }
      }

      if (totalImported > 0) {
        console.log(`Sync local: ${totalImported} transações importadas do banco`);
        await fetchTransactions();
      } else {
        console.log('Sync local: nenhuma transação nova para importar');
      }

      return { imported: totalImported };
    } catch (err) {
      console.error('Error in local sync:', err);
      toast.error('Erro no sync local');
      return { imported: 0 };
    } finally {
      setSyncing(false);
    }
  }, [user, fetchCreditCardAccounts, processBatch, fetchTransactions]);

  // ─── SYNC CREDIT CARD TRANSACTIONS (kept for backward compat, now delegates to localSync) ───
  const syncCreditCardTransactions = useCallback(async (cardId?: string): Promise<{ imported: number; skipped: number }> => {
    const result = await localSync();
    return { imported: result.imported, skipped: 0 };
  }, [localSync]);

  const backfillBillIds = useCallback(async (): Promise<{ updated: number }> => {
    if (!user) return { updated: 0 };

    setSyncing(true);
    try {
      // 0. Repair installment data and bill links from pluggy metadata
      const { data: repairData, error: repairError } = await supabase.rpc('repair_pluggy_installment_data');
      if (repairError) {
        console.error('Repair function error:', repairError);
      } else {
        const repairResult = repairData as unknown as { installments_fixed: number; bills_fixed: number };
        console.log(`Repair: ${repairResult?.installments_fixed} installments fixed, ${repairResult?.bills_fixed} bills fixed`);
      }

      // 1. Call edge function backfill
      const { data, error } = await invokePluggySync({ action: 'backfill-bills' });

      if (error) {
        console.error('Backfill edge function error:', error);
      }

      const edgeUpdated = data?.updated || 0;

      // 2. Local backfill using repair_orphan_bill_links RPC
      const orphanResult = await supabase.rpc('repair_orphan_bill_links');
      const localUpdated = orphanResult.data || 0;

      const totalUpdated = edgeUpdated + localUpdated;
      if (totalUpdated > 0) {
        console.log(`${totalUpdated} transações vinculadas a faturas`);
        await fetchTransactions();
      }

      return { updated: totalUpdated };
    } catch (err) {
      console.error('Error in backfill:', err);
      toast.error('Erro ao vincular transações a faturas');
      return { updated: 0 };
    } finally {
      setSyncing(false);
    }
  }, [user, fetchTransactions]);

  // ─── Poll job progress from sync_jobs table ───
  const startPolling = useCallback((jobId: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      const { data } = await supabase
        .from('sync_jobs_v')
        .select('id, status, progress, current_step, transactions_saved, bills_linked')
        .eq('id', jobId)
        .single();

      if (data) {
        const job = data as unknown as SyncJobProgress;
        setJobProgress(job);

        if (job.status === 'completed' || job.status === 'error') {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
      }
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // ─── HISTORICAL LOAD: Now with gap detection ───
  const historicalLoad = useCallback(async (): Promise<{ pluggyImported: number; creditCardImported: number }> => {
    if (!user) return { pluggyImported: 0, creditCardImported: 0 };

    setHistoricalLoading(true);
    setJobProgress(null);
    let totalPluggyImported = 0;
    let jobId: string | null = null;

    try {
      // Check date coverage to determine if historical load is needed
      const { data: coverage } = await supabase.rpc('get_pluggy_date_coverage', { p_user_id: user.id });

      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      const thresholdDate = twelveMonthsAgo.toISOString().split('T')[0];

      const hasGaps = !coverage || coverage.length === 0 || 
        coverage.some((c: any) => c.min_date > thresholdDate);

      if (!hasGaps) {
        console.log('[Historical Load] Cobertura completa detectada, pulando busca na API');
        // Still do local sync to process any unprocessed transactions
        const syncResult = await localSync();
        await backfillBillIds();
        return { pluggyImported: 0, creditCardImported: syncResult.imported };
      }

      console.log('[Historical Load] Lacunas detectadas, buscando dados da API...');

      const { data: histData, error: histError } = await invokePluggySync({
        action: 'historical-load',
      });
      if (histError) throw histError;
      totalPluggyImported = histData?.totalTransactions || 0;
      jobId = histData?.jobId || null;
      if (jobId) startPolling(jobId);
      await new Promise(r => setTimeout(r, 3000));

      console.log(`[Historical Load] All done: ${totalPluggyImported} registros da API`);

      // Process unsynced pluggy_transactions → credit_card_transactions
      const syncResult = await localSync();
      await backfillBillIds();

      console.log(`Carga histórica concluída: ${totalPluggyImported} da Pluggy, ${syncResult.imported} importadas`);
      return { pluggyImported: totalPluggyImported, creditCardImported: syncResult.imported };
    } catch (err) {
      console.error('Error in historical load:', err);
      toast.error('Erro na carga histórica');
      if (jobId) {
        await supabase.from('sync_jobs_v').update({ status: 'error', error_message: String(err), updated_at: new Date().toISOString() }).eq('id', jobId);
      }
      return { pluggyImported: totalPluggyImported, creditCardImported: 0 };
    } finally {
      setHistoricalLoading(false);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    }
  }, [user, localSync, backfillBillIds, startPolling]);

  // ─── INCREMENTAL SYNC: Last 15 days ───
  const incrementalSync = useCallback(async (): Promise<{ pluggyImported: number; creditCardImported: number }> => {
    if (!user) return { pluggyImported: 0, creditCardImported: 0 };

    setSyncing(true);
    try {
      const { data, error } = await invokePluggySync({ action: 'incremental-sync' });

      if (error) throw error;
      const pluggyImported = data?.totalTransactions || 0;

      // Process locally instead of re-reading everything
      const syncResult = await localSync();

      if (syncResult.imported > 0) {
        console.log(`${syncResult.imported} novas transações importadas`);
      }
      return { pluggyImported, creditCardImported: syncResult.imported };
    } catch (err) {
      console.error('Error in incremental sync:', err);
      toast.error('Erro na sincronização incremental');
      return { pluggyImported: 0, creditCardImported: 0 };
    } finally {
      setSyncing(false);
    }
  }, [user, localSync]);

  // Auto-sync on mount — only when session is ready to avoid 401
  useEffect(() => {
    if (autoSync && session?.access_token && user && !hasSynced.current) {
      hasSynced.current = true;
      incrementalSync();
    }
  }, [autoSync, session?.access_token, user, incrementalSync]);

  // ─── RECONCILE BILLS: Match bank statement payments to unpaid bills ───
  const reconcileBills = useCallback(async (): Promise<{ reconciled: number; manualCheck: number }> => {
    if (!user) return { reconciled: 0, manualCheck: 0 };

    try {
      const { data, error } = await invokePluggySync({ action: 'reconcile-bills' });

      if (error) throw error;
      console.log(`[Reconcile] Result: ${data?.reconciled || 0} reconciled, ${data?.manualCheck || 0} manual check`);
      return { reconciled: data?.reconciled || 0, manualCheck: data?.manualCheck || 0 };
    } catch (err) {
      console.error('Error in bill reconciliation:', err);
      return { reconciled: 0, manualCheck: 0 };
    }
  }, [user]);

  return {
    syncing,
    historicalLoading,
    lastSyncResult,
    jobProgress,
    syncCreditCardTransactions,
    fetchCreditCardAccounts,
    backfillBillIds,
    historicalLoad,
    incrementalSync,
    localSync,
    reconcileBills,
  };
}
// sync
