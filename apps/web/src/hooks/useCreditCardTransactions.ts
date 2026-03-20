import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  generateStableInstallmentGroupId,
  normalizeStoreName,
  getPurchaseDate,
  buildPurchaseKey,
  shouldMergeGroups,
  buildMergeMap,
} from '@/utils/installmentGroupId';
import { saveConsolidationInfo } from '@/hooks/useAutoConsolidation';
import { detectInstallment, detectSiblingInstallment, normalizeForSibling } from '@/utils/installmentGroupId';
import type { KnownInstallmentGroup } from '@/utils/installmentGroupId';
import { detectRecurringByWhitelist, normalizeForWhitelist } from '@/utils/recurringWhitelist';
export interface CreditCardTransaction {
  id: string;
  user_id: string;
  store_name: string;
  value: number;
  transaction_date: string;
  category: string;
  category_id: string;
  is_category_confirmed: boolean;
  ai_suggested_category: string | null;
  ai_suggested_category_id: string | null;
  card_id: string | null;
  import_batch_id: string | null;
  created_at: string;
  updated_at: string;
  // Installment tracking fields
  installment_current: number | null;
  installment_total: number | null;
  installment_group_id: string | null;
  // Recurring transaction fields
  is_recurring: boolean;
  recurring_group_id: string | null;
  confidence_level: string | null;
  // Friendly name
  friendly_name: string | null;
  // Virtual field
  display_installment?: string;
  // Bill and purchase registry links
  credit_card_bill_id: string | null;
  purchase_registry_id: string | null;
  // Pluggy authoritative bill flag
  bill_from_pluggy: boolean | null;
  // Transaction status (COMPLETED | PENDING)
  status: string;
  // Original purchase date (from Pluggy metadata)
  purchase_date: string | null;
  // Month reference from view (YYYY-MM)
  reference_month?: string | null;
}

export interface TransactionInput {
  store_name: string;
  value: number;
  transaction_date: string;
  category?: string;
  category_id?: string;
  ai_suggested_category?: string;
  ai_suggested_category_id?: string;
  card_id?: string;
  import_batch_id?: string;
}

export interface PendingTransaction {
  storeName: string;
  value: number;
  date: string;
  installment?: string; // e.g., "2/5" for parcela 2 de 5
  installmentCurrent?: number;
  installmentTotal?: number;
  isRecurring?: boolean;
  pluggyTransactionId?: string;
  suggestedCategoryId?: string;
  suggestedCategory?: string;
  confidence?: 'high' | 'medium' | 'low';
  selectedCategoryId?: string;
  selectedCategory?: string;
  status?: string; // COMPLETED | PENDING
  purchaseDate?: string | null;
}

const CREDIT_CARD_TRANSACTIONS_QUERY_KEY = 'credit-card-transactions';

export function useCreditCardTransactions(currentMonth?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const {
    data: transactions = [],
    isLoading: loading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: [CREDIT_CARD_TRANSACTIONS_QUERY_KEY, user?.id, currentMonth ?? ''],
    queryFn: async (): Promise<CreditCardTransaction[]> => {
      if (!user) return [];
      const PAGE_SIZE = 1000;
      let allResults: any[] = [];
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        let query = supabase
          .from('credit_card_transactions_v')
          .select('*')
          .eq('user_id', user.id)
          .order('transaction_date', { ascending: false })
          .range(from, from + PAGE_SIZE - 1);
        if (currentMonth) {
          query = query.eq('reference_month', currentMonth);
        }
        const { data, error: fetchError } = await query;

        if (fetchError) throw fetchError;
        const page = data || [];
        allResults = allResults.concat(page);
        from += PAGE_SIZE;
        hasMore = page.length === PAGE_SIZE;
        if (from >= 5000) break;
      }

      return allResults.map(t => ({
        ...t,
        display_installment:
          t.installment_total && t.installment_total > 1
            ? `${String(t.installment_current || 1).padStart(2, '0')}/${String(t.installment_total).padStart(2, '0')}`
            : 'À vista',
      })) as CreditCardTransaction[];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const fetchTransactions = useCallback(() => refetch(), [refetch]);
  const error = queryError ? 'Erro ao carregar transações' : null;

  const categorizeWithAI = async (pendingTransactions: PendingTransaction[]): Promise<PendingTransaction[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const response = await supabase.functions.invoke('categorize-transactions', {
        body: {
          transactions: pendingTransactions.map(t => ({
            storeName: t.storeName,
            value: t.value,
            date: t.date,
          })),
        },
      });

      if (response.error) {
        console.error('AI categorization error:', response.error);
        throw new Error(response.error.message || 'Erro na categorização');
      }

      const { categorizedTransactions } = response.data;
      
      return pendingTransactions.map((t, index) => {
        const categorized = categorizedTransactions[index];
        return {
          ...t,
          suggestedCategoryId: categorized?.suggestedCategoryId || 'outros',
          suggestedCategory: categorized?.suggestedCategory || 'Não atribuído',
          confidence: categorized?.confidence || 'low',
          selectedCategoryId: categorized?.suggestedCategoryId || 'outros',
          selectedCategory: categorized?.suggestedCategory || 'Não atribuído',
        };
      });
    } catch (err) {
      console.error('Error categorizing transactions:', err);
      // Return with default category on error
      return pendingTransactions.map(t => ({
        ...t,
        suggestedCategoryId: 'outros',
        suggestedCategory: 'Não atribuído',
        confidence: 'low' as const,
        selectedCategoryId: 'outros',
        selectedCategory: 'Não atribuído',
      }));
    }
  };

  const parseStatementFile = async (file: File): Promise<PendingTransaction[]> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Usuário não autenticado');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/parse-credit-card-statement`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao processar arquivo');
      }

      const data = await response.json();
      
      if (!data.transactions || data.transactions.length === 0) {
        throw new Error('Nenhuma transação encontrada no arquivo');
      }

      return data.transactions.map((t: any) => {
        // Parse installment info if available
        let installmentCurrent: number | undefined;
        let installmentTotal: number | undefined;
        
        if (t.installment) {
          const match = t.installment.match(/(\d{1,2})\s*[\/\\]\s*(\d{1,2})/);
          if (match) {
            installmentCurrent = parseInt(match[1]);
            installmentTotal = parseInt(match[2]);
          }
        }
        
        return {
          storeName: t.storeName,
          value: t.value,
          date: t.date,
          installment: t.installment,
          installmentCurrent,
          installmentTotal,
          suggestedCategoryId: t.suggestedCategoryId || 'outros',
          suggestedCategory: t.suggestedCategory || 'Não atribuído',
          confidence: t.confidence || 'low',
          selectedCategoryId: t.suggestedCategoryId || 'outros',
          selectedCategory: t.suggestedCategory || 'Não atribuído',
        };
      });
    } catch (err) {
      console.error('Error parsing statement file:', err);
      throw err;
    }
  };

  const importTransactions = async (
    pendingTransactions: PendingTransaction[],
    cardId?: string,
    batchId?: string,
    billId?: string
  ): Promise<{ success: boolean; transactionIds: string[] }> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return { success: false, transactionIds: [] };
    }

    try {
      const finalBatchId = batchId || crypto.randomUUID();

      // Fetch user's store category rules for auto-categorization
      const { data: categoryRules } = await supabase
        .from('store_category_rules' as any)
        .select('*')
        .eq('user_id', user.id);
      const rules = (categoryRules as any[]) || [];

      // Fetch user's friendly name rules for auto-naming
      const { data: friendlyRulesData } = await supabase
        .from('store_friendly_name_rules' as any)
        .select('*')
        .eq('user_id', user.id);
      const friendlyNameRules = (friendlyRulesData as any[]) || [];

      // When importing through a bill, fetch bill due_date once.
      // This lets us correctly detect whether transaction_date is the ORIGINAL purchase date
      // (common in exports) vs a statement/bill month date.
      let billDueDate: string | null = null;
      if (billId) {
        const { data: billData, error: billError } = await supabase
          .from('credit_card_bills')
          .select('due_date')
          .eq('id', billId)
          .single();

        if (!billError) {
          billDueDate = (billData as { due_date?: string } | null)?.due_date ?? null;
        }
      }
      
      // Pre-compute recurring_group_id map: same normalized name → same UUID
      const recurringGroupMap = new Map<string, string>();
      for (const t of pendingTransactions) {
        const normName = normalizeForWhitelist(t.storeName);
        if (!recurringGroupMap.has(normName) && detectRecurringByWhitelist(t.storeName)) {
          recurringGroupMap.set(normName, crypto.randomUUID());
        }
      }

      // Generate stable installment_group_ids for installment purchases
      const transactionsToInsert = await Promise.all(
        pendingTransactions.map(async (t) => {
          // --- Prevention: detect installment info if missing ---
          let instCurrent = t.installmentCurrent || null;
          let instTotal = t.installmentTotal || null;

          if (!instCurrent || !instTotal) {
            const detected = detectInstallment(t.storeName);
            if (detected) {
              instCurrent = detected.current;
              instTotal = detected.total;
            }
          }

          let installmentGroupId: string | null = null;
          
          // Only generate stable group ID for installment purchases
          if (instTotal && instTotal > 1 && instCurrent) {
            installmentGroupId = await generateStableInstallmentGroupId(
              user.id,
              cardId || null,
              t.storeName,
              instTotal,
              t.date,
              instCurrent,
              t.value,
              billDueDate
            );
          }
          
          // Auto-detect recurring by whitelist (only for non-installment purchases)
          const isInstallment = instTotal && instTotal > 1;
          const isWhitelistRecurring = !isInstallment && detectRecurringByWhitelist(t.storeName);
          const normName = normalizeForWhitelist(t.storeName);
          const recurringGroupId = isWhitelistRecurring ? (recurringGroupMap.get(normName) || null) : null;

      // Check store category rules for auto-categorization
          const matchedRule = rules.find((r: any) => normName.includes(r.normalized_store_name));
          const ruleCategory = matchedRule ? matchedRule.category_name : null;
          const ruleCategoryId = matchedRule ? matchedRule.category_id : null;

          // Check friendly name rules for auto-naming
          const matchedFriendlyRule = friendlyNameRules.find((r: any) => normName.includes(r.normalized_store_name));
          const autoFriendlyName = matchedFriendlyRule ? matchedFriendlyRule.friendly_name : null;

          return {
            user_id: user.id,
            store_name: t.storeName,
            value: t.value,
            transaction_date: t.date,
            category: ruleCategory || t.selectedCategory || t.suggestedCategory || 'Não atribuído',
            category_id: ruleCategoryId || t.selectedCategoryId || t.suggestedCategoryId || 'outros',
            is_category_confirmed: !!matchedRule,
            ai_suggested_category: t.suggestedCategory || null,
            ai_suggested_category_id: t.suggestedCategoryId || null,
            card_id: cardId || null,
            import_batch_id: finalBatchId,
            credit_card_bill_id: billId || null,
            pluggy_transaction_id: t.pluggyTransactionId || null,
            status: t.status || 'COMPLETED',
            // Installment info
            installment_current: instCurrent,
            installment_total: instTotal,
            installment_group_id: installmentGroupId,
            // Recurring info (auto-detected from whitelist)
            is_recurring: isWhitelistRecurring || undefined,
            confidence_level: isWhitelistRecurring ? 'very_high' : undefined,
            recurring_group_id: recurringGroupId,
            // Auto-applied friendly name from rules
            friendly_name: autoFriendlyName,
          };
        })
      );

      // Split: transactions with pluggy_transaction_id use upsert (dedup), others use insert
      const withPluggyId = transactionsToInsert.filter(t => t.pluggy_transaction_id);
      const withoutPluggyId = transactionsToInsert.filter(t => !t.pluggy_transaction_id);

      let allInsertedIds: string[] = [];

      if (withPluggyId.length > 0) {
        const pluggyIds = withPluggyId.map(t => t.pluggy_transaction_id as string);
        const { data: existing } = await supabase
          .from('credit_card_transactions_v')
          .select('pluggy_transaction_id')
          .in('pluggy_transaction_id', pluggyIds);
        const existingIds = new Set((existing || []).map((e: { pluggy_transaction_id: string }) => e.pluggy_transaction_id));
        const newTxs = withPluggyId.filter(t => !existingIds.has(t.pluggy_transaction_id as string));

        if (newTxs.length > 0) {
          const { data: insertedData, error: insertError } = await supabase
            .from('credit_card_transactions_v')
            .insert(newTxs)
            .select('id');
          if (insertError) throw insertError;
          allInsertedIds.push(...(insertedData?.map(t => t.id) || []));
        }
      }

      if (withoutPluggyId.length > 0) {
        const { data: insertedData, error: insertError } = await supabase
          .from('credit_card_transactions_v')
          .insert(withoutPluggyId)
          .select('id');

        if (insertError) throw insertError;
        allInsertedIds.push(...(insertedData?.map(t => t.id) || []));
      }

      if (allInsertedIds.length === 0 && transactionsToInsert.length > 0) {
        // All were duplicates, not an error
      }

      const transactionIds = allInsertedIds;
      if (transactionIds.length > 0) {
        queryClient.invalidateQueries({ queryKey: [CREDIT_CARD_TRANSACTIONS_QUERY_KEY, user?.id] });
        queryClient.invalidateQueries({ queryKey: ['movimentacoes-page', user.id] });
      }
      return { success: true, transactionIds };
    } catch (err) {
      console.error('[importTransactions] Error:', err);
      return { success: false, transactionIds: [] };
    }
  };

  const updateTransaction = async (
    id: string,
    updates: Partial<Pick<CreditCardTransaction, 
      'category' | 'category_id' | 'is_category_confirmed' | 
      'installment_current' | 'installment_total' | 'installment_group_id' |
      'is_recurring' | 'recurring_group_id' | 'friendly_name' | 'confidence_level'
    >>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('credit_card_transactions_v')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      queryClient.invalidateQueries({ queryKey: [CREDIT_CARD_TRANSACTIONS_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-page', user.id] });
      return true;
    } catch (err) {
      console.error('Error updating transaction:', err);
      toast.error('Erro ao atualizar transação');
      return false;
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('credit_card_transactions_v')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: [CREDIT_CARD_TRANSACTIONS_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-page', user.id] });
      toast.success('Transação removida');
      return true;
    } catch (err) {
      console.error('Error deleting transaction:', err);
      toast.error('Erro ao remover transação');
      return false;
    }
  };

  const deleteMultipleTransactions = async (ids: string[]): Promise<boolean> => {
    if (ids.length === 0) return true;
    
    try {
      const { error: deleteError } = await supabase
        .from('credit_card_transactions_v')
        .delete()
        .in('id', ids);

      if (deleteError) throw deleteError;

      queryClient.invalidateQueries({ queryKey: [CREDIT_CARD_TRANSACTIONS_QUERY_KEY, user?.id] });
      queryClient.invalidateQueries({ queryKey: ['movimentacoes-page', user.id] });
      toast.success(`${ids.length} transações removidas`);
      return true;
    } catch (err) {
      console.error('Error deleting multiple transactions:', err);
      toast.error('Erro ao remover transações');
      return false;
    }
  };

  const getTransactionsByMonth = (month: string) => {
    return transactions.filter(t => t.transaction_date.startsWith(month));
  };

  // Consolidate existing installment transactions with stable group IDs
  const consolidateInstallmentGroups = async (): Promise<{ success: boolean; updated: number }> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return { success: false, updated: 0 };
    }

    try {
      // =====================================================================
      // STEP 0 — Backfill: detect installment info on transactions with NULL
      // =====================================================================
      const nullInstallmentTxs = transactions.filter(
        t => !t.installment_total && t.store_name
      );

      if (nullInstallmentTxs.length > 0) {
        const pluggyIds = nullInstallmentTxs
          .map(t => (t as any).pluggy_transaction_id)
          .filter(Boolean) as string[];

        const metadataById = new Map<string, unknown>();
        if (pluggyIds.length > 0) {
          const { data: pluggyRows } = await supabase
            .from('pluggy_transactions')
            .select('id,credit_card_metadata')
            .in('id', pluggyIds);

          (pluggyRows || []).forEach((r: any) => {
            if (r?.credit_card_metadata) {
              metadataById.set(r.id, r.credit_card_metadata);
            }
          });
        }

        const backfillUpdates: { id: string; installment_current: number; installment_total: number }[] = [];

        for (const tx of nullInstallmentTxs) {
          const pluggyTxId = (tx as any).pluggy_transaction_id;
          const metadata = pluggyTxId ? metadataById.get(pluggyTxId) : undefined;
          const detected = detectInstallment(tx.store_name, metadata);

          if (detected) {
            backfillUpdates.push({
              id: tx.id,
              installment_current: detected.current,
              installment_total: detected.total,
            });
            // Patch local array for subsequent steps
            (tx as any).installment_current = detected.current;
            (tx as any).installment_total = detected.total;
          }
        }

        for (let i = 0; i < backfillUpdates.length; i += 50) {
          const batch = backfillUpdates.slice(i, i + 50);
          await Promise.all(
            batch.map(u =>
              supabase
                .from('credit_card_transactions_v')
                .update({
                  installment_current: u.installment_current,
                  installment_total: u.installment_total,
                })
                .eq('id', u.id)
            )
          );
        }
      }

      // =====================================================================
      // STEP 0.5 — Sibling Detection: link orphans to known groups
      // =====================================================================
      const knownInstTxs = transactions.filter(
        (t: any) => t.installment_total && t.installment_total > 1 && t.installment_current
      );

      // Build known groups from detected installment transactions
      const knownGroupsMap = new Map<string, KnownInstallmentGroup & { anchorTxDate: string; anchorCurrent: number }>();
      for (const tx of knownInstTxs) {
        const normName = normalizeForSibling(tx.store_name);
        const sibKey = `${tx.card_id || 'no-card'}::${normName}::${tx.installment_total}`;
        if (!knownGroupsMap.has(sibKey)) {
          knownGroupsMap.set(sibKey, {
            normalizedName: normName,
            cardId: tx.card_id,
            installmentTotal: tx.installment_total!,
            value: tx.value,
            purchaseDate: tx.transaction_date,
            groupId: tx.installment_group_id || sibKey,
            existingCurrentNumbers: new Set<number>(),
            existingPluggyIds: new Set<string>(),
            anchorTxDate: tx.transaction_date,
            anchorCurrent: tx.installment_current!,
          });
        }
        const g = knownGroupsMap.get(sibKey)!;
        g.existingCurrentNumbers.add(tx.installment_current!);
        if ((tx as any).pluggy_transaction_id) g.existingPluggyIds.add((tx as any).pluggy_transaction_id);

        // Prefer parcela 1 as anchor
        if (tx.installment_current === 1) {
          g.purchaseDate = tx.transaction_date;
          g.anchorTxDate = tx.transaction_date;
          g.anchorCurrent = 1;
        } else if (g.anchorCurrent !== 1 && tx.transaction_date < g.anchorTxDate) {
          g.anchorTxDate = tx.transaction_date;
          g.anchorCurrent = tx.installment_current!;
          const d = new Date(tx.transaction_date + 'T00:00:00');
          d.setMonth(d.getMonth() - (tx.installment_current! - 1));
          g.purchaseDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }

      const knownGroups = Array.from(knownGroupsMap.values());
      const stillOrphans = transactions.filter(t => !t.installment_total && t.store_name);

      if (stillOrphans.length > 0 && knownGroups.length > 0) {
        const siblingUpdates: { id: string; installment_current: number; installment_total: number; installment_group_id: string }[] = [];

        for (const tx of stillOrphans) {
          const match = detectSiblingInstallment(
            {
              store_name: tx.store_name,
              card_id: tx.card_id,
              value: tx.value,
              transaction_date: tx.transaction_date,
              pluggy_transaction_id: (tx as any).pluggy_transaction_id,
            },
            knownGroups
          );
          if (match) {
            siblingUpdates.push({
              id: tx.id,
              installment_current: match.current,
              installment_total: match.total,
              installment_group_id: match.groupId,
            });
            (tx as any).installment_current = match.current;
            (tx as any).installment_total = match.total;
            (tx as any).installment_group_id = match.groupId;
            // Update known group
            const sibKey = `${tx.card_id || 'no-card'}::${normalizeForSibling(tx.store_name)}::${match.total}`;
            const g = knownGroupsMap.get(sibKey);
            if (g) {
              g.existingCurrentNumbers.add(match.current);
              if ((tx as any).pluggy_transaction_id) g.existingPluggyIds.add((tx as any).pluggy_transaction_id);
            }
          }
        }

        for (let i = 0; i < siblingUpdates.length; i += 50) {
          const batch = siblingUpdates.slice(i, i + 50);
          await Promise.all(
            batch.map(u =>
              supabase
                .from('credit_card_transactions_v')
                .update({
                  installment_current: u.installment_current,
                  installment_total: u.installment_total,
                  installment_group_id: u.installment_group_id,
                })
                .eq('id', u.id)
            )
          );
        }
      }

      // =====================================================================
      // STEP 1 — Normal consolidation: assign stable group IDs
      // =====================================================================

      // Re-fetch to get updated installment data
      const { data: freshTxs, error: freshErr } = await supabase
        .from('credit_card_transactions_v')
        .select('*')
        .eq('user_id', user.id);

      if (freshErr) throw freshErr;

      const installmentTxs = (freshTxs || []).filter(
        (t: any) => t.installment_total && t.installment_total > 1 && t.installment_current
      );

      if (installmentTxs.length === 0) {
        toast.info('Nenhum parcelamento encontrado para consolidar');
        return { success: true, updated: 0 };
      }

      // Build a billId -> due_date map
      const billIds = Array.from(
        new Set(
          installmentTxs.map((t: any) => t.credit_card_bill_id).filter(Boolean) as string[]
        )
      );

      const billDueById = new Map<string, string>();
      if (billIds.length > 0) {
        const { data: billRows, error: billErr } = await supabase
          .from('credit_card_bills')
          .select('id,due_date')
          .in('id', billIds);

        if (!billErr) {
          (billRows || []).forEach((b: any) => {
            if (b?.id && b?.due_date) billDueById.set(b.id, b.due_date);
          });
        }
      }

      // Group by purchase key and calculate stable group IDs
      const purchaseGroups = new Map<string, { groupId: string; transactionIds: string[]; storeName: string; cardId: string | null; total: number; purchaseDate: string }>();

      for (const tx of installmentTxs) {
        const billDueDate = tx.credit_card_bill_id ? billDueById.get(tx.credit_card_bill_id) ?? null : null;
        const purchaseDate = getPurchaseDate(tx.transaction_date, tx.installment_current!, billDueDate);
        const purchaseKey = buildPurchaseKey(
          user.id, tx.card_id, tx.store_name, tx.installment_total!, purchaseDate, tx.value
        );

        if (!purchaseGroups.has(purchaseKey)) {
          const stableGroupId = await generateStableInstallmentGroupId(
            user.id, tx.card_id, tx.store_name, tx.installment_total!,
            tx.transaction_date, tx.installment_current!, tx.value, billDueDate
          );
          purchaseGroups.set(purchaseKey, {
            groupId: stableGroupId,
            transactionIds: [],
            storeName: tx.store_name,
            cardId: tx.card_id,
            total: tx.installment_total!,
            purchaseDate,
          });
        }

        purchaseGroups.get(purchaseKey)!.transactionIds.push(tx.id);
      }

      // Merge close groups
      const groupMeta = new Map<string, { storeName: string; cardId: string | null; total: number; purchaseDate: string }>();
      purchaseGroups.forEach((v) => {
        groupMeta.set(v.groupId, { storeName: v.storeName, cardId: v.cardId, total: v.total, purchaseDate: v.purchaseDate });
      });
      const mergeMap = buildMergeMap(groupMeta);
      for (const [, group] of purchaseGroups) {
        const canonical = mergeMap.get(group.groupId);
        if (canonical) group.groupId = canonical;
      }

      // Update each group
      let totalUpdated = 0;
      for (const [, { groupId, transactionIds }] of purchaseGroups) {
        const { error: updateError } = await supabase
          .from('credit_card_transactions_v')
          .update({ installment_group_id: groupId })
          .in('id', transactionIds);

        if (updateError) {
          console.error('Error updating group:', updateError);
          continue;
        }

        totalUpdated += transactionIds.length;
      }

      // Save consolidation info to update UI badge
      saveConsolidationInfo(user.id, purchaseGroups.size, totalUpdated);
      
      toast.success(`${purchaseGroups.size} parcelamentos consolidados (${totalUpdated} transações atualizadas)`);
      await fetchTransactions();
      return { success: true, updated: totalUpdated };
    } catch (err) {
      console.error('Error consolidating installment groups:', err);
      toast.error('Erro ao consolidar parcelamentos');
      return { success: false, updated: 0 };
    }
  };

  return {
    transactions,
    loading,
    error,
    fetchTransactions,
    categorizeWithAI,
    parseStatementFile,
    importTransactions,
    updateTransaction,
    deleteTransaction,
    deleteMultipleTransactions,
    getTransactionsByMonth,
    consolidateInstallmentGroups,
  };
}
