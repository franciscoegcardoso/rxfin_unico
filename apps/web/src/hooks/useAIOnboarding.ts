import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAIOnboarding() {
  const { user } = useAuth();
  const [shouldStartAIOnboarding, setShouldStartAIOnboarding] = useState(false);
  const [shouldShowEmptyState, setShouldShowEmptyState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (!user?.id || hasChecked.current) {
      setIsLoading(false);
      return;
    }

    const check = async () => {
      hasChecked.current = true;
      try {
        // 1. Check if onboarding_completed is false
        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_completed, created_at')
          .eq('id', user.id)
          .single();

        if (!profile || profile.onboarding_completed === true) {
          setShouldStartAIOnboarding(false);
          setIsLoading(false);
          return;
        }

        // 2. Check if onboarding_started event already exists
        const { data: existingEvent } = await supabase
          .from('ai_onboarding_events')
          .select('id')
          .eq('user_id', user.id)
          .eq('event_type', 'onboarding_started')
          .maybeSingle();

        if (existingEvent) {
          setShouldStartAIOnboarding(false);
          setIsLoading(false);
          return;
        }

        // 3. Check if user has financial data (lancamentos OR pluggy data)
        const [{ count: lancCount }, { count: pluggyCount }] = await Promise.all([
          supabase
            .from('lancamentos_realizados_v')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('pluggy_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', user.id),
        ]);

        const hasFinancialData = (lancCount ?? 0) > 0 || (pluggyCount ?? 0) > 0;

        if (!hasFinancialData) {
          setShouldShowEmptyState(true);
          setShouldStartAIOnboarding(false);
          setIsLoading(false);
          return;
        }

        // All 3 conditions met — should start onboarding
        setShouldStartAIOnboarding(true);

        // Register event
        const daysSinceSignup = profile.created_at
          ? Math.floor((Date.now() - new Date(profile.created_at).getTime()) / 86400000)
          : 0;

        await supabase.from('ai_onboarding_events').insert({
          user_id: user.id,
          event_type: 'onboarding_started',
          days_since_signup: daysSinceSignup,
          metadata: { triggered_from: 'hook' },
        });
      } catch (err) {
        console.error('useAIOnboarding error:', err);
        setShouldStartAIOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    check();
  }, [user?.id]);

  return { shouldStartAIOnboarding, shouldShowEmptyState, isLoading };
}
