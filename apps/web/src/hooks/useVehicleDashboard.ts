import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface VehicleDashboardData {
  vehicles?: Array<{
    display_name: string;
    brand: string;
    model: string;
    year: number;
    fipe_value?: number;
  }>;
  records?: Array<{
    record_date: string;
    record_type: string;
    fuel_liters?: number;
    fuel_cost?: number;
  }>;
  summary?: { total_vehicles: number; total_fipe_value: number; total_fuel_cost: number };
}

export function useVehicleDashboard() {
  const [data, setData] = useState<VehicleDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_vehicle_dashboard', {});
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as VehicleDashboardData) ?? null);
      return result as VehicleDashboardData;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
