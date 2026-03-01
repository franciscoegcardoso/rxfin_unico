import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export type VehicleTypeNum = 1 | 2 | 3; // 1 Carro, 2 Moto, 3 Caminhão

export interface FipeBrandRow {
  brand_id: number;
  brand_name: string;
}

export function useFipeBrands(vehicleType: VehicleTypeNum) {
  return useQuery({
    queryKey: ['fipe', 'brands', vehicleType],
    queryFn: async (): Promise<FipeBrandRow[]> => {
      const { data, error } = await supabase.rpc('get_fipe_brands', {
        p_vehicle_type: vehicleType,
      });
      if (error) throw error;
      return (data ?? []) as FipeBrandRow[];
    },
    enabled: vehicleType >= 1 && vehicleType <= 3,
    staleTime: 7 * 24 * 60 * 60 * 1000,
  });
}
