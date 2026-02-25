import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type TourEventType = 'started' | 'step_viewed' | 'skipped' | 'completed';

export const useTourAnalytics = () => {
  const { user } = useAuth();
  const sessionIdRef = useRef<string>(crypto.randomUUID());

  const trackEvent = useCallback(async (
    eventType: TourEventType,
    stepIndex?: number,
    stepTarget?: string,
    totalSteps?: number,
    isMobile?: boolean
  ) => {
    if (!user?.id) return;

    try {
      // Use type assertion since tour_analytics table was just created
      await (supabase as any).from('tour_analytics').insert({
        user_id: user.id,
        event_type: eventType,
        step_index: stepIndex,
        step_target: stepTarget,
        total_steps: totalSteps,
        session_id: sessionIdRef.current,
        is_mobile: isMobile ?? false,
      });
    } catch (error) {
      console.error('Error tracking tour event:', error);
    }
  }, [user?.id]);

  const trackTourStarted = useCallback((totalSteps: number, isMobile: boolean) => {
    trackEvent('started', 0, undefined, totalSteps, isMobile);
  }, [trackEvent]);

  const trackStepViewed = useCallback((stepIndex: number, stepTarget: string, totalSteps: number, isMobile: boolean) => {
    trackEvent('step_viewed', stepIndex, stepTarget, totalSteps, isMobile);
  }, [trackEvent]);

  const trackTourSkipped = useCallback((stepIndex: number, stepTarget: string, totalSteps: number, isMobile: boolean) => {
    trackEvent('skipped', stepIndex, stepTarget, totalSteps, isMobile);
  }, [trackEvent]);

  const trackTourCompleted = useCallback((totalSteps: number, isMobile: boolean) => {
    trackEvent('completed', totalSteps - 1, undefined, totalSteps, isMobile);
  }, [trackEvent]);

  return {
    trackTourStarted,
    trackStepViewed,
    trackTourSkipped,
    trackTourCompleted,
  };
};
