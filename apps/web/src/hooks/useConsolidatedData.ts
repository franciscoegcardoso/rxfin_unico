import { useMemo, useState, useCallback } from 'react';
import { useLancamentosRealizados, LancamentoRealizado } from './useLancamentosRealizados';
import { useCreditCardTransactions, CreditCardTransaction } from './useCreditCardTransactions';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logCrudOperation } from '@/core/auditLog';

export type ConsolidatedOrigin = 'lancamento' | 'cartao';
export type ConsolidatedTipo = 'receita' | 'despesa';

export interface ConsolidatedRecord {
  id: string;
  origin: ConsolidatedOrigin;
  date: string;
  name: string;
  friendlyName: string | null;
  category: string;
  value: number;
  tipo: ConsolidatedTipo;
  source: 'manual' | 'pluggy' | 'import';
  status: string;
  raw: LancamentoRealizado | CreditCardTransaction;
}

export function useConsolidatedData() {
  const { user } = useAuth();
  const { lancamentos, loading: lancLoading, deleteLancamento, fetchLancamentos } = useLancamentosRealizados();
  const { transactions, loading: txLoading, deleteMultipleTransactions, fetchTransactions } = useCreditCardTransactions();
  const [deleting, setDeleting] = useState(false);

  const consolidated = useMemo<ConsolidatedRecord[]>(() => {
    const records: ConsolidatedRecord[] = [];

    for (const l of lancamentos) {
      records.push({
        id: l.id,
        origin: 'lancamento',
        date: l.data_pagamento || l.data_vencimento || l.mes_referencia,
        name: l.nome,
        friendlyName: l.friendly_name,
        category: l.categoria,
        value: l.valor_realizado || l.valor_previsto,
        tipo: l.tipo,
        source: l.source_type === 'pluggy_bank' ? 'pluggy' : 'manual',
        status: l.data_pagamento ? 'pago' : 'pendente',
        raw: l,
      });
    }

    for (const t of transactions) {
      records.push({
        id: t.id,
        origin: 'cartao',
        date: t.transaction_date,
        name: t.store_name,
        friendlyName: t.friendly_name,
        category: t.category || '',
        value: t.value,
        tipo: 'despesa',
        source: t.import_batch_id ? 'import' : (t.bill_from_pluggy ? 'pluggy' : 'manual'),
        status: t.status === 'PENDING' ? 'pendente' : 'confirmado',
        raw: t,
      });
    }

    records.sort((a, b) => b.date.localeCompare(a.date));
    return records;
  }, [lancamentos, transactions]);

  const deleteSelected = useCallback(async (ids: string[], records: ConsolidatedRecord[]) => {
    if (!user || ids.length === 0) return false;
    setDeleting(true);

    try {
      const lancIds = records.filter(r => ids.includes(r.id) && r.origin === 'lancamento').map(r => r.id);
      const txIds = records.filter(r => ids.includes(r.id) && r.origin === 'cartao').map(r => r.id);

      for (const id of lancIds) {
        const start = performance.now();
        const { data: oldRow } = await supabase.from('lancamentos_realizados_v').select('*').eq('id', id).single();
        const { error } = await supabase.from('lancamentos_realizados_v').delete().eq('id', id);
        await logCrudOperation({
          operation: 'DELETE',
          tableName: 'lancamentos_realizados_v',
          recordId: id,
          oldData: oldRow as Record<string, unknown>,
          success: !error,
          errorMessage: error?.message,
          errorCode: error?.code,
          durationMs: Math.round(performance.now() - start),
        });
        if (error) throw error;
      }

      if (txIds.length > 0) {
        const startTx = performance.now();
        const { error } = await supabase.from('credit_card_transactions_v').delete().in('id', txIds);
        await logCrudOperation({
          operation: 'DELETE',
          tableName: 'credit_card_transactions_v',
          recordId: undefined,
          newData: { count: txIds.length, ids: txIds },
          success: !error,
          errorMessage: error?.message,
          errorCode: error?.code,
          durationMs: Math.round(performance.now() - startTx),
        });
        if (error) throw error;
      }

      toast.success(`${ids.length} registro(s) excluído(s)`);
      await Promise.all([fetchLancamentos(), fetchTransactions()]);
      return true;
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error('Erro ao excluir registros');
      return false;
    } finally {
      setDeleting(false);
    }
  }, [user, fetchLancamentos, fetchTransactions]);

  const deleteAll = useCallback(async () => {
    if (!user) return false;
    setDeleting(true);

    try {
      const { error: lancError } = await supabase
        .from('lancamentos_realizados_v')
        .delete()
        .eq('user_id', user.id)
        .neq('id', '00000000-0000-0000-0000-000000000000'); // match all

      if (lancError) throw lancError;

      const { error: txError } = await supabase
        .from('credit_card_transactions_v')
        .delete()
        .eq('user_id', user.id)
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (txError) throw txError;

      toast.success('Todo o histórico foi excluído');
      await Promise.all([fetchLancamentos(), fetchTransactions()]);
      return true;
    } catch (err) {
      console.error('Delete all error:', err);
      toast.error('Erro ao excluir histórico');
      return false;
    } finally {
      setDeleting(false);
    }
  }, [user, fetchLancamentos, fetchTransactions]);

  return {
    consolidated,
    loading: lancLoading || txLoading,
    deleting,
    deleteSelected,
    deleteAll,
  };
}
// sync
