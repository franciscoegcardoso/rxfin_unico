import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AffiliateReferral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referred_name: string | null;
  referred_email: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useAffiliateReferrals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['affiliate-referrals', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('affiliate_referrals')
        .select('*')
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as AffiliateReferral[];
    },
    enabled: !!user?.id,
  });
}
// sync
