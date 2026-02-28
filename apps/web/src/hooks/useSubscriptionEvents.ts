import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SubscriptionEvent {
  id: string;
  user_id: string;
  event_type: string;
  event_status: string | null;
  transaction_id: string | null;
  pagarme_transaction_id: string | null;
  subscription_id: string | null;
  product_id: string | null;
  product_name: string | null;
  amount: number | null;
  currency: string | null;
  payment_method: string | null;
  role_before: string | null;
  role_after: string | null;
  contact_email: string | null;
  raw_payload: Record<string, unknown> | null;
  processed_at: string;
  created_at: string;
}

export function useSubscriptionEvents(userId?: string) {
  return useQuery({
    queryKey: ['subscription-events', userId],
    queryFn: async () => {
      let query = supabase
        .from('subscription_events')
        .select('*')
        .order('processed_at', { ascending: false })
        .limit(100);

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as SubscriptionEvent[];
    },
    enabled: true,
  });
}

export function useUserSubscriptionEvents(userId: string) {
  return useQuery({
    queryKey: ['subscription-events', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscription_events')
        .select('*')
        .eq('user_id', userId)
        .order('processed_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as SubscriptionEvent[];
    },
    enabled: !!userId,
  });
}
