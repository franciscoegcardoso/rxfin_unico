import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ExpenseGroup {
  category_id: string;
  category_name: string;
  items: { id: string; name: string }[];
}

export interface UserCategories {
  expenseGroups: ExpenseGroup[];
  incomeItems: { id: string; name: string }[];
}

export function useUserCategories() {
  const [data, setData] = useState<UserCategories | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    supabase.functions
      .invoke('get-user-categories')
      .then(({ data }) => {
        if (!isMounted) return;
        if (data) setData(data as UserCategories);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading };
}

