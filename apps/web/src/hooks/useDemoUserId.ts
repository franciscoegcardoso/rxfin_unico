import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

/**
 * Busca o UUID da conta demo registrado em app_config.
 * Retorna null enquanto carrega ou se não encontrado.
 */
export function useDemoUserId(): string | null {
  const { data } = useQuery({
    queryKey: ['demo_user_id'],
    queryFn: async () => {
      const { data: row, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'demo_user_id')
        .maybeSingle();
      if (error || !row) return null;
      return row.value as string;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });
  return data ?? null;
}
