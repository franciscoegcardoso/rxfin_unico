import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdminPluggyDetail {
  system: {
    connections: {
      total: number;
      updated: number;
      login_errors: number;
      stale_over_24h: number;
      consent_expiring: number;
    };
    data_quality: {
      transactions: number;
      investments: number;
      suspect_zero: number;
      loans: number;
      overdue_loans: number;
      recurring: number;
      insights_today: number;
      bills_open: number;
    };
  };
  per_user: Array<{
    user_id: string;
    email: string;
    connections: number;
    last_sync: string | null;
    last_sync_ago_h: number | null;
    investments: number;
    total_inv_balance: number;
    recurring: number;
    loans: number;
    has_insights: boolean;
    has_errors: boolean;
    has_login_error: boolean;
    consent_expiring: boolean;
  }>;
  recent_syncs: Array<{
    user_id: string;
    connector_name: string;
    last_sync_at: string;
    status: string;
    error_type: string | null;
  }>;
  crons: Array<{
    jobname: string;
    schedule: string;
    active: boolean;
  }>;
  generated_at: string;
}

export function useAdminPluggyDetail() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['admin-pluggy-detail'],
    queryFn: async (): Promise<AdminPluggyDetail> => {
      const { data, error } = await supabase.rpc('get_admin_pluggy_detail');
      if (error) throw error;
      const raw = Array.isArray(data) ? data[0] : data;
      return raw as AdminPluggyDetail;
    },
    staleTime: 2 * 60 * 1000,
  });

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['admin-pluggy-detail'] });

  return { ...query, refetch };
}

/** Mask email for display: joao@example.com → j***@example.com */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email;
  const [local, domain] = email.split('@');
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}
