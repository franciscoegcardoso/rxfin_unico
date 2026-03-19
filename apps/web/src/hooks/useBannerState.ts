import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type BannerKind = 'none' | 'demo' | 'progress_raio_x' | 'progress_control';

export type BannerState = {
  banner: BannerKind;
  cta_route?: string;
  cta_label?: string;
  phase?: string;
};

const DEFAULT_STATE: BannerState = { banner: 'none' };

export function useBannerState() {
  const { user } = useAuth();
  const [bannerState, setBannerState] = useState<BannerState>(DEFAULT_STATE);
  const [loading, setLoading] = useState(true);

  const fetchState = useCallback(async () => {
    if (!user?.id) {
      setBannerState(DEFAULT_STATE);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase.rpc('get_banner_state' as never);
      if (!error && data != null) {
        setBannerState(data as BannerState);
      } else {
        setBannerState(DEFAULT_STATE);
      }
    } catch {
      setBannerState(DEFAULT_STATE);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    setLoading(true);
    void fetchState();
  }, [fetchState]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`banner-state-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'onboarding_state',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchState();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, fetchState]);

  return { bannerState, loading, refetch: fetchState };
}
