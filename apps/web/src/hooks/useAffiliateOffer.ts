import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AffiliateOffer {
  valor: number;
  texto: string;
  ativo: boolean;
}

const FALLBACK: AffiliateOffer = {
  valor: 67,
  texto: 'Ganhe R$ 67,00 por cada indicação',
  ativo: true,
};

export function useAffiliateOffer() {
  const query = useQuery({
    queryKey: ['affiliate-offer'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('setting_value')
        .eq('setting_key', 'affiliate_offer')
        .maybeSingle();

      if (error || !data?.setting_value) return FALLBACK;

      const val = data.setting_value as Record<string, unknown>;
      return {
        valor: typeof val.valor === 'number' ? val.valor : FALLBACK.valor,
        texto: typeof val.texto === 'string' ? val.texto : FALLBACK.texto,
        ativo: typeof val.ativo === 'boolean' ? val.ativo : FALLBACK.ativo,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  return {
    ...(query.data ?? FALLBACK),
    isLoading: query.isLoading,
  };
}
// sync
