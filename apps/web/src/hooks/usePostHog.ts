import { useCallback } from 'react';
import { trackEvent, identifyUser, resetUser } from '@/lib/posthog';

export const usePostHog = () => {
  const track = useCallback((eventName: string, properties?: Record<string, any>) => {
    trackEvent(eventName, properties);
  }, []);

  const identify = useCallback((userId: string, traits?: Record<string, any>) => {
    identifyUser(userId, traits);
  }, []);

  const reset = useCallback(() => {
    resetUser();
  }, []);

  return { track, identify, reset };
};
// sync
