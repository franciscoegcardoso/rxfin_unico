import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import type { Database } from '@/integrations/supabase/types';

export type VendaAnalytics = Database['public']['Tables']['vendas_analytics']['Row'];
export type ComissaoAfiliado = Database['public']['Tables']['comissoes_afiliados']['Row'];
export type AfiliadoDadosBancarios = Database['public']['Tables']['afiliados_dados_bancarios']['Row'];

export function useVendasAnalytics() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  return useQuery({
    queryKey: ['vendas-analytics', user?.id, isAdmin],
    queryFn: async () => {
      if (!isAdmin) return [];

      const { data, error } = await supabase
        .from('vendas_analytics')
        .select('*')
        .order('data_venda', { ascending: false });

      if (error) throw error;
      return data as VendaAnalytics[];
    },
    enabled: !!user?.id,
  });
}

export function useComissoesAfiliados() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['comissoes-afiliados', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('comissoes_afiliados')
        .select('*')
        .eq('afiliado_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ComissaoAfiliado[];
    },
    enabled: !!user?.id,
  });
}

export function useDadosBancarios() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['afiliado-dados-bancarios', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('afiliados_dados_bancarios')
        .select('*')
        .eq('afiliado_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AfiliadoDadosBancarios | null;
    },
    enabled: !!user?.id,
  });
}
// sync
