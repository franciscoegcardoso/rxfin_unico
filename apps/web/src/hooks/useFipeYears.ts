import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VehicleTypeNum } from './useFipeBrands';

export interface FipeYearRow {
  year_id: string;
  year_val: number;
  fuel_type: number;
}

export function useFipeYears(
  vehicleType: VehicleTypeNum,
  brandId: number | null,
  modelId: number | null
) {
  return useQuery({
    queryKey: ['fipe', 'years', vehicleType, brandId, modelId],
    queryFn: async (): Promise<FipeYearRow[]> => {
      if (brandId == null || modelId == null) return [];
      const { data, error } = await supabase.rpc('get_fipe_years', {
        p_vehicle_type: vehicleType,
        p_brand_id: brandId,
        p_model_id: modelId,
      });
      if (error) throw error;
      return (data ?? []) as FipeYearRow[];
    },
    enabled:
      vehicleType >= 1 &&
      vehicleType <= 3 &&
      brandId != null &&
      modelId != null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
