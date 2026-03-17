import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { ManualInvestment, ManualInvestmentInsert } from '@/types/investments';

export function useManualInvestments() {
  const { user } = useAuth();
  const [items, setItems] = useState<ManualInvestment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('manual_investments')
      .select('*')
      .eq('user_id', user.id)
      .eq('active', true)
      .order('gross_balance', { ascending: false });
    if (err) setError(err.message);
    else setItems((data as ManualInvestment[]) ?? []);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const add = async (payload: ManualInvestmentInsert): Promise<boolean> => {
    if (!user?.id) return false;
    setError(null);
    const { error: err } = await supabase.from('manual_investments').insert({
      ...payload,
      user_id: user.id,
      active: true,
    });
    if (err) {
      setError(err.message);
      return false;
    }
    await fetchItems();
    return true;
  };

  const update = async (id: string, payload: Partial<ManualInvestmentInsert>): Promise<boolean> => {
    setError(null);
    const { error: err } = await supabase.from('manual_investments').update(payload).eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    await fetchItems();
    return true;
  };

  const remove = async (id: string): Promise<boolean> => {
    setError(null);
    const { error: err } = await supabase.from('manual_investments').update({ active: false }).eq('id', id);
    if (err) {
      setError(err.message);
      return false;
    }
    await fetchItems();
    return true;
  };

  return { items, loading, error, add, update, remove, refresh: fetchItems };
}
