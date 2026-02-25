import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useAIOnboarding() {
  const { user } = useAuth();
  const [shouldStartAIOnboarding, setShouldStartAIOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    const check = async () => {
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

        // 3. Should start onboarding
        setShouldStartAIOnboarding(true);

        // Register event
        await supabase.from('ai_onboarding_events').insert({
          user_id: user.id,
          event_type: 'onboarding_started',
          days_since_signup: 0,
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

  return { shouldStartAIOnboarding, isLoading };
}
// sync
