import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface GiftsPlannerAssignment {
  id?: string;
  person_id?: string;
  planned_value?: number;
  actual_value?: number | null;
  status?: string;
  gift_description?: string | null;
  purchase_date?: string | null;
}

export interface GiftsPlannerEvent {
  id?: string;
  name?: string;
  type?: string;
  day?: number;
  month?: number;
  is_system?: boolean;
  is_upcoming?: boolean;
  days_until?: number;
  default_value?: number;
  total_planned?: number;
  total_spent?: number;
  assignments?: GiftsPlannerAssignment[];
}

export interface GiftsPlannerNextEvent {
  name?: string;
  day?: number;
  month?: number;
}

export interface GiftsPlannerSummary {
  total_events?: number;
  total_planned?: number;
  total_spent?: number;
  total_pending?: number;
  next_event?: GiftsPlannerNextEvent | null;
}

export interface GiftsPlannerData {
  year?: number;
  summary?: GiftsPlannerSummary;
  events?: GiftsPlannerEvent[];
}

export function useGiftsPlanner(year?: number) {
  const [data, setData] = useState<GiftsPlannerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: rpcError } = await supabase.rpc('get_gifts_planner', {
        p_year: year ?? new Date().getFullYear(),
      });
      if (rpcError) {
        setError(rpcError.message);
        setData(null);
        return null;
      }
      setData((result as GiftsPlannerData) ?? null);
      return result as GiftsPlannerData;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}
