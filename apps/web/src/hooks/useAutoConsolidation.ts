import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getUserKVValue, setUserKVValue, deleteUserKVValue } from '@/hooks/useUserKV';
import {
  generateStableInstallmentGroupId,
  getPurchaseDate,
  buildPurchaseKey,
  normalizeStoreName,
  shouldMergeGroups,
  buildMergeMap,
} from '@/utils/installmentGroupId';
import { detectInstallment, detectSiblingInstallment, normalizeForSibling } from '@/utils/installmentGroupId';
import type { KnownInstallmentGroup } from '@/utils/installmentGroupId';

const STORAGE_KEY = 'consolidation_info';
const TOAST_ID = 'auto-consolidation-toast';

// Module-level flag to survive component remounts
let globalHasRun = false;

interface ConsolidationInfo {
  date: string;
  time: string;
  groupsConsolidated: number;
  transactionsUpdated: number;
}

/**
 * Save consolidation info to Supabase KV
 */
export async function saveConsolidationInfo(userId: string, groupsConsolidated: number, transactionsUpdated: number): Promise<void> {
  const now = new Date();
  const info: ConsolidationInfo = {
    date: now.toISOString().split('T')[0],
    time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    groupsConsolidated,
    transactionsUpdated,
  };
  await setUserKVValue(userId, STORAGE_KEY, info);
  window.dispatchEvent(new Event('consolidation-updated'));
}

/**
 * Hook that automatically runs installment consolidation on first login of the day.
 */
export function useAutoConsolidation() {
  const { user } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {
    const runAutoConsolidation = async () => {
      if (!user || hasRun.current || globalHasRun) return;

      const today = new Date().toISOString().split('T')[0];
      const lastInfo = await getUserKVValue<ConsolidationInfo>(user.id, STORAGE_KEY);

      if (lastInfo?.date === today) return;

      hasRun.current = true;
      globalHasRun = true;
      try {
        // Fetch all transactions
        const { data: transactions, error: fetchError } = await supabase
          .from('credit_card_transactions_v')
          .select('*')
          .eq('user_id', user.id);

        if (fetchError) throw fetchError;
        const allTxs = transactions || [];

        // --- STEP 1: Backfill installment info via metadata/regex ---
        const nullInstTxs = allTxs.filter((t: any) => !t.installment_total && t.store_name);

        if (nullInstTxs.length > 0) {
          const pluggyIds = nullInstTxs.map((t: any) => t.pluggy_transaction_id).filter(Boolean) as string[];
          const metaMap = new Map<string, unknown>();
          if (pluggyIds.length > 0) {
            const { data: pRows } = await supabase
              .from('pluggy_transactions')
              .select('id,credit_card_metadata')
              .in('id', pluggyIds);
            (pRows || []).forEach((r: any) => {
              if (r?.credit_card_metadata) metaMap.set(r.id, r.credit_card_metadata);
            });
          }

          const updates: { id: string; installment_current: number; installment_total: number }[] = [];
          for (const tx of nullInstTxs) {
            const meta = tx.pluggy_transaction_id ? metaMap.get(tx.pluggy_transaction_id) : undefined;
            const det = detectInstallment(tx.store_name, meta);
            if (det) {
              updates.push({ id: tx.id, installment_current: det.current, installment_total: det.total });
              (tx as any).installment_current = det.current;
              (tx as any).installment_total = det.total;
            }
          }

          for (let i = 0; i < updates.length; i += 50) {
            const batch = updates.slice(i, i + 50);
            await Promise.all(
              batch.map(u =>
                supabase
                  .from('credit_card_transactions_v')
                  .update({ installment_current: u.installment_current, installment_total: u.installment_total })
                  .eq('id', u.id)
              )
            );
          }
        }

        // --- STEP 2: Sibling Detection for remaining orphans ---
        const knownInstTxs = allTxs.filter(
          (t: any) => t.installment_total && t.installment_total > 1 && t.installment_current
        );

        // Build known groups from detected installment transactions
        const knownGroupsMap = new Map<string, KnownInstallmentGroup & { anchorTxDate: string; anchorCurrent: number }>();
        for (const tx of knownInstTxs) {
          const normName = normalizeForSibling(tx.store_name);
          // Use card+name+total as group key for sibling matching
          const sibKey = `${tx.card_id || 'no-card'}::${normName}::${tx.installment_total}`;
          if (!knownGroupsMap.has(sibKey)) {
            // Anchor: use the transaction with installment_current=1 if possible, else earliest
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
          if (tx.pluggy_transaction_id) g.existingPluggyIds.add(tx.pluggy_transaction_id);

          // Prefer parcela 1 as anchor, otherwise use earliest
          if (tx.installment_current === 1) {
            g.purchaseDate = tx.transaction_date;
            g.anchorTxDate = tx.transaction_date;
            g.anchorCurrent = 1;
          } else if (g.anchorCurrent !== 1 && tx.transaction_date < g.anchorTxDate) {
            g.anchorTxDate = tx.transaction_date;
            g.anchorCurrent = tx.installment_current!;
            // Reconstruct purchase date from this anchor
            const d = new Date(tx.transaction_date + 'T00:00:00');
            d.setMonth(d.getMonth() - (tx.installment_current! - 1));
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            g.purchaseDate = `${y}-${m}-${day}`;
          }
        }

        const knownGroups = Array.from(knownGroupsMap.values());

        // Find orphans still without installment info
        const stillOrphans = allTxs.filter(
          (t: any) => !t.installment_total && t.store_name
        );

        if (stillOrphans.length > 0 && knownGroups.length > 0) {
          const siblingUpdates: { id: string; installment_current: number; installment_total: number; installment_group_id: string }[] = [];

          for (const tx of stillOrphans) {
            const match = detectSiblingInstallment(
              {
                store_name: tx.store_name,
                card_id: tx.card_id,
                value: tx.value,
                transaction_date: tx.transaction_date,
                pluggy_transaction_id: tx.pluggy_transaction_id,
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
              // Patch local array
              (tx as any).installment_current = match.current;
              (tx as any).installment_total = match.total;
              (tx as any).installment_group_id = match.groupId;
              // Update the known group so subsequent orphans don't claim the same slot
              const sibKey = `${tx.card_id || 'no-card'}::${normalizeForSibling(tx.store_name)}::${match.total}`;
              const g = knownGroupsMap.get(sibKey);
              if (g) {
                g.existingCurrentNumbers.add(match.current);
                if (tx.pluggy_transaction_id) g.existingPluggyIds.add(tx.pluggy_transaction_id);
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

        // --- STEP 3: Consolidation of group IDs ---
        const installmentTxs = allTxs.filter(
          (t: any) => t.installment_total && t.installment_total > 1 && t.installment_current
        );

        if (installmentTxs.length === 0) {
          const now = new Date();
          const info: ConsolidationInfo = {
            date: today,
            time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            groupsConsolidated: 0,
            transactionsUpdated: 0,
          };
          await setUserKVValue(user.id, STORAGE_KEY, info);
          return;
        }

        // Build billId -> due_date map
        const billIds = Array.from(
          new Set(installmentTxs.map((t: any) => t.credit_card_bill_id).filter(Boolean) as string[])
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
          const purchaseKey = buildPurchaseKey(user.id, tx.card_id, tx.store_name, tx.installment_total!, purchaseDate, tx.value);

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

        // --- STEP 4: Merge close groups ---
        const groupMeta = new Map<string, { storeName: string; cardId: string | null; total: number; purchaseDate: string }>();
        purchaseGroups.forEach((v, _k) => {
          groupMeta.set(v.groupId, { storeName: v.storeName, cardId: v.cardId, total: v.total, purchaseDate: v.purchaseDate });
        });
        const mergeMap = buildMergeMap(groupMeta);

        // Apply merges: redirect merged groupIds to canonical
        for (const [, group] of purchaseGroups) {
          const canonical = mergeMap.get(group.groupId);
          if (canonical) {
            group.groupId = canonical;
          }
        }

        // Update each group
        let totalUpdated = 0;
        for (const [, { groupId, transactionIds }] of purchaseGroups) {
          const { error: updateError } = await supabase
            .from('credit_card_transactions_v')
            .update({ installment_group_id: groupId })
            .in('id', transactionIds);

          if (!updateError) {
            totalUpdated += transactionIds.length;
          }
        }

        // Save consolidation info
        const now = new Date();
        const info: ConsolidationInfo = {
          date: today,
          time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          groupsConsolidated: purchaseGroups.size,
          transactionsUpdated: totalUpdated,
        };
        await setUserKVValue(user.id, STORAGE_KEY, info);

        if (totalUpdated > 0) {
          toast.success(
            `Parcelamentos consolidados automaticamente: ${purchaseGroups.size} compras`,
            { duration: 3000, id: TOAST_ID }
          );
        }
      } catch {
        // Don't save the date if there was an error, so it retries next time
      }
    };

    runAutoConsolidation();
  }, [user]);

  return null;
}

/**
 * Get the last consolidation info for a user
 */
export async function getLastConsolidationInfo(userId: string): Promise<ConsolidationInfo | null> {
  return getUserKVValue<ConsolidationInfo>(userId, STORAGE_KEY);
}

/**
 * Hook to get consolidation status with formatted display
 */
export function useConsolidationStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<{
    lastDate: string | null;
    lastTime: string | null;
    isToday: boolean;
    displayText: string;
  }>({
    lastDate: null,
    lastTime: null,
    isToday: false,
    displayText: 'Nunca consolidado',
  });

  const updateStatus = useCallback(async () => {
    if (!user) return;
    
    const info = await getLastConsolidationInfo(user.id);
    if (!info) {
      setStatus({ lastDate: null, lastTime: null, isToday: false, displayText: 'Nunca consolidado' });
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const isToday = info.date === today;

    let displayText = '';
    if (isToday) {
      displayText = `Hoje às ${info.time}`;
    } else {
      const date = new Date(info.date + 'T00:00:00');
      const formatted = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      displayText = `${formatted} às ${info.time}`;
    }

    setStatus({ lastDate: info.date, lastTime: info.time, isToday, displayText });
  }, [user]);

  useEffect(() => {
    updateStatus();
    window.addEventListener('storage', updateStatus);
    window.addEventListener('consolidation-updated', updateStatus);
    return () => {
      window.removeEventListener('storage', updateStatus);
      window.removeEventListener('consolidation-updated', updateStatus);
    };
  }, [updateStatus]);

  return { ...status, refresh: updateStatus };
}

/**
 * Clear the last consolidation info (for testing or manual trigger)
 */
export async function clearLastConsolidationInfo(userId: string): Promise<void> {
  await deleteUserKVValue(userId, STORAGE_KEY);
}
