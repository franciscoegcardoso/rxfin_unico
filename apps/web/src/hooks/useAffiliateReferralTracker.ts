import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TrackingParams } from '@/hooks/useTrackingParams';

/**
 * Records the current user as a referral when they have an `aff` param.
 * Determines status based on current plan:
 * - free plan → 'free'
 * - paid plan, first time seeing this referral → 'ja_cliente' (already had plan)
 * - paid plan, existing referral → 'ativo'
 * Runs once per session.
 */
export function useAffiliateReferralTracker(trackingParams: TrackingParams) {
  const { user } = useAuth();
  const recorded = useRef(false);

  useEffect(() => {
    const affId = trackingParams.aff;
    if (!user?.id || !affId || affId === user.id || recorded.current) return;

    recorded.current = true;

    (async () => {
      try {
        // Check if referral already exists
        const { data: existing } = await supabase
          .from('affiliate_referrals')
          .select('id, status')
          .eq('referrer_id', affId)
          .eq('referred_user_id', user.id)
          .maybeSingle();

        // If already tracked with a meaningful status, don't downgrade
        if (existing && ['ativo', 'cancelou', 'ja_cliente'].includes(existing.status)) {
          return;
        }

        // Determine current plan status
        const { data: planData } = await supabase
          .rpc('get_user_plan_slug', { _user_id: user.id });

        const planSlug = (planData as string) ?? 'free';
        let status: string;

        if (planSlug === 'free') {
          status = 'free';
        } else if (!existing) {
          // First time seeing this user via this referrer, but already has paid plan
          status = 'ja_cliente';
        } else {
          status = 'ativo';
        }

        const userName = user.user_metadata?.full_name ?? null;
        const userEmail = user.email ?? null;

        await supabase
          .from('affiliate_referrals')
          .upsert(
            {
              referrer_id: affId,
              referred_user_id: user.id,
              referred_name: userName,
              referred_email: userEmail,
              status,
            },
            { onConflict: 'referrer_id,referred_user_id' }
          );
      } catch {
        // Silent fail — non-critical
      }
    })();
  }, [user?.id, trackingParams.aff]);
}
// sync
