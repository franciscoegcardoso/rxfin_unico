import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UnitEconomicsData {
  cac?: number;
  ltv?: number;
  ltv_cac_ratio?: number;
  arpu?: number;
  avg_lifetime_months?: number;
  marketing_spend?: number;
  new_payers?: number;
}

const CAC_META = 50;

export function useAdminUnitEconomics(months: number) {
  return useQuery({
    queryKey: ['admin', 'unit-economics', months],
    queryFn: async (): Promise<UnitEconomicsData | null> => {
      const { data, error } = await supabase.rpc('get_admin_unit_economics', { p_months: months });
      if (error) throw new Error(error.message);
      const raw = Array.isArray(data) ? data[0] : data;
      return (raw as UnitEconomicsData) ?? null;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export { CAC_META };
