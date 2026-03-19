import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export interface ScrapingQueueHealth {
  total_in_queue: number;
  never_scraped: number;
  overdue: number;
  overdue_gt_2h: number;
  paused: number;
  priority_1_overdue: number;
  needs_attention: boolean;
  oldest_overdue_asset: string | null;
  checked_at: string;
}

export function useScrapingQueueHealth() {
  return useQuery({
    queryKey: ['scraping-queue-health'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_scraping_queue_health');
      if (error) throw error;
      return data as ScrapingQueueHealth;
    },
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 10,
  });
}
