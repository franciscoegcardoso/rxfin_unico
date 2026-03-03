import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { logCrudOperation } from '@/core/auditLog';

export interface CreditCardBill {
  id: string;
  user_id: string;
  card_id: string;
  card_name: string | null;
  closing_date: string;
  due_date: string;
  total_value: number;
  status: 'open' | 'closed' | 'paid' | 'overdue';
  lancamento_id: string | null;
  billing_month: string;
  created_at: string;
  paid_amount: number | null;
  updated_at: string;
  requires_manual_check: boolean;
  payment_source: 'pluggy_api' | 'bank_statement' | 'manual' | null;
  connector_image_url: string | null;
  connector_primary_color: string | null;
  pluggy_bill_id: string | null;
  // Campos calculados da view credit_card_bills_with_totals
  computed_total?: number;
  pending_total?: number;
  transaction_count?: number;
  has_total_divergence?: boolean;
}

export interface BillInput {
  card_id: string;
  card_name?: string;
  closing_date: string;
  due_date: string;
  total_value?: number;
  status?: 'open' | 'closed' | 'paid';
}

export function useCreditCardBills() {
  const { user } = useAuth();
  const [bills, setBills] = useState<CreditCardBill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBills = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: viewError } = await supabase
        .from('credit_card_bills_with_totals' as any)
        .select('*')
        .eq('user_id', user.id)
        .order('due_date', { ascending: false });

      if (viewError) {
        const { data: fallback, error: tableError } = await supabase
          .from('credit_card_bills')
          .select('*')
          .eq('user_id', user.id)
          .order('due_date', { ascending: false });
        if (tableError) throw tableError;
        setBills((fallback || []) as unknown as CreditCardBill[]);
        return;
      }
      setBills((data || []) as unknown as CreditCardBill[]);
    } catch (err) {
      console.error('Error fetching bills:', err);
      setError('Erro ao carregar faturas');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchBills(); }, [fetchBills]);

  const createBill = async (input: BillInput): Promise<CreditCardBill | null> => {
    if (!user) { toast.error('Usuário não autenticado'); return null; }
    const start = performance.now();
    try {
      const payload = {
        user_id: user.id,
        card_id: input.card_id,
        card_name: input.card_name || null,
        closing_date: input.closing_date,
        due_date: input.due_date,
        total_value: input.total_value || 0,
        status: input.status || 'open',
      };
      const { data, error: insertError } = await supabase
        .from('credit_card_bills')
        .insert(payload)
        .select()
        .single();

      await logCrudOperation({
        operation: 'CREATE',
        tableName: 'credit_card_bills',
        recordId: (data as any)?.id,
        newData: payload as Record<string, unknown>,
        success: !insertError,
        errorMessage: insertError?.message,
        errorCode: insertError?.code,
        durationMs: Math.round(performance.now() - start),
        endpoint: '/cartao-credito',
      });
      if (insertError) throw insertError;
      const newBill = data as CreditCardBill;
      setBills(prev => [newBill, ...prev]);
      return newBill;
    } catch (err) {
      console.error('Error creating bill:', err);
      toast.error('Erro ao criar fatura');
      return null;
    }
  };

  const updateBill = async (
    id: string,
    updates: Partial<Omit<BillInput, 'card_id'>> & {
      total_value?: number;
      status?: 'open' | 'closed' | 'paid';
      lancamento_id?: string;
    }
  ): Promise<boolean> => {
    const start = performance.now();
    try {
      const { data: oldRow } = await supabase.from('credit_card_bills').select('*').eq('id', id).single();
      const { error: updateError } = await supabase
        .from('credit_card_bills').update(updates).eq('id', id);

      await logCrudOperation({
        operation: 'UPDATE',
        tableName: 'credit_card_bills',
        recordId: id,
        oldData: oldRow as Record<string, unknown>,
        newData: updates as Record<string, unknown>,
        success: !updateError,
        errorMessage: updateError?.message,
        errorCode: updateError?.code,
        durationMs: Math.round(performance.now() - start),
        endpoint: '/cartao-credito',
      });
      if (updateError) throw updateError;
      setBills(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
      return true;
    } catch (err) {
      console.error('Error updating bill:', err);
      toast.error('Erro ao atualizar fatura');
      return false;
    }
  };

  const deleteBill = async (id: string): Promise<boolean> => {
    const start = performance.now();
    try {
      const { data: oldRow } = await supabase.from('credit_card_bills').select('*').eq('id', id).single();
      const { error: deleteError } = await supabase
        .from('credit_card_bills').delete().eq('id', id);

      await logCrudOperation({
        operation: 'DELETE',
        tableName: 'credit_card_bills',
        recordId: id,
        oldData: oldRow as Record<string, unknown>,
        success: !deleteError,
        errorMessage: deleteError?.message,
        errorCode: deleteError?.code,
        durationMs: Math.round(performance.now() - start),
        endpoint: '/cartao-credito',
      });
      if (deleteError) throw deleteError;
      setBills(prev => prev.filter(b => b.id !== id));
      toast.success('Fatura removida');
      return true;
    } catch (err) {
      console.error('Error deleting bill:', err);
      toast.error('Erro ao remover fatura');
      return false;
    }
  };

  const getBillsByCard = (cardId: string) => bills.filter(b => b.card_id === cardId);
  const getBillsByMonth = (month: string) =>
    bills.filter(b => b.closing_date.startsWith(month) || b.due_date.startsWith(month));
  const updateBillTotal = async (billId: string, newTotal: number) =>
    updateBill(billId, { total_value: newTotal });

  const linkTransactionsToBill = async (billId: string, transactionIds: string[]): Promise<boolean> => {
    if (transactionIds.length === 0) return true;
    try {
      const { error: updateError } = await supabase
        .from('credit_card_transactions_v')
        .update({ credit_card_bill_id: billId })
        .in('id', transactionIds);
      if (updateError) throw updateError;
      return true;
    } catch (err) {
      console.error('Error linking transactions to bill:', err);
      return false;
    }
  };

  return {
    bills, loading, error, fetchBills, createBill, updateBill, deleteBill,
    getBillsByCard, getBillsByMonth, updateBillTotal, linkTransactionsToBill,
  };
}
