import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokePluggySync } from '@/lib/pluggySync';
import { useAuth } from '@/contexts/AuthContext';

export interface RecurringPayment {
  id: string;
  user_id: string;
  item_id: string;
  description: string;
  average_amount: number;
  regularity_score: number;
  frequency: string;
  last_occurrence_date: string | null;
  next_expected_date: string | null;
  category: string | null;
  account_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useRecurringPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<RecurringPayment[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pluggy_recurring_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('average_amount', { ascending: false });

      if (error) throw error;
      setPayments((data || []) as unknown as RecurringPayment[]);
    } catch (err) {
      console.error('Error fetching recurring payments:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const syncRecurringPayments = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await invokePluggySync({ action: 'sync-recurring-payments' });
      if (error) throw error;
      console.log('Recurring payments synced:', data);
      await fetchPayments();
    } catch (err) {
      console.error('Error syncing recurring payments:', err);
    }
  }, [user, fetchPayments]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  return { payments, loading, fetchPayments, syncRecurringPayments };
}
// sync
