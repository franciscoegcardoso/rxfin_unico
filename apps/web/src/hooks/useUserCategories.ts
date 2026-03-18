import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CategoryItem {
  id: string;
  name: string;
}
export interface ExpenseGroup {
  category_id: string;
  category_name: string;
  items: CategoryItem[];
}
export interface UserCategories {
  expenseGroups: ExpenseGroup[];
  incomeItems: CategoryItem[];
}

export function useUserCategories() {
  const [data, setData] = useState<UserCategories | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke('get-user-categories')
      .then(({ data: d }) => {
        if (!cancelled && d) setData(d as UserCategories);
      })
      .catch(() => {
        if (!cancelled) setData({ expenseGroups: [], incomeItems: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return { data, loading };
}
