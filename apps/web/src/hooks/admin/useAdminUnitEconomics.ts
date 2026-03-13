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

function sanitizeUnitEconomics(raw: UnitEconomicsData | null): UnitEconomicsData | null {
  if (!raw) return null;
  const cac = raw.cac != null && Number.isFinite(raw.cac) ? raw.cac : undefined;
  const ltv = raw.ltv != null && Number.isFinite(raw.ltv) ? raw.ltv : undefined;
  const ltv_cac_ratio = raw.ltv_cac_ratio != null && Number.isFinite(raw.ltv_cac_ratio) ? raw.ltv_cac_ratio : undefined;
  return { ...raw, cac, ltv, ltv_cac_ratio };
}

export function useAdminUnitEconomics(months: number) {
  return useQuery({
    queryKey: ['admin', 'unit-economics', months],
    queryFn: async (): Promise<UnitEconomicsData | null> => {
      const { data, error } = await supabase.rpc('get_admin_unit_economics', { p_months: months });
      if (error) throw new Error(error.message);
      const raw = Array.isArray(data) ? data[0] : data;
      return sanitizeUnitEconomics((raw as UnitEconomicsData) ?? null);
    },
    staleTime: 2 * 60 * 1000,
  });
}

export { CAC_META };
