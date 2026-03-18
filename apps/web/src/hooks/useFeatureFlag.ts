import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useFeatureFlag(flag: string): boolean {
  const { data } = useQuery({
    queryKey: ['feature-flag', flag],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', flag)
        .maybeSingle();
      if (error) return false;
      return row?.value === 'true';
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
  return data ?? false;
}
