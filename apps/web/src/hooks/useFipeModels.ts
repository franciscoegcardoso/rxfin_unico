import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { VehicleTypeNum } from './useFipeBrands';

export interface FipeModelRow {
  model_id: number;
  model_name: string;
}

export function useFipeModels(
  vehicleType: VehicleTypeNum,
  brandId: number | null
) {
  return useQuery({
    queryKey: ['fipe', 'models', vehicleType, brandId],
    queryFn: async (): Promise<FipeModelRow[]> => {
      if (brandId == null) return [];
      const { data, error } = await supabase.rpc('get_fipe_models', {
        p_vehicle_type: vehicleType,
        p_brand_id: brandId,
      });
      if (error) throw error;
      return (data ?? []) as FipeModelRow[];
    },
    enabled: vehicleType >= 1 && vehicleType <= 3 && brandId != null,
    staleTime: 24 * 60 * 60 * 1000,
  });
}
