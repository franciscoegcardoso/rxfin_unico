'use client';

import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { initPostHog, identifyUser, resetUser } from '@/lib/posthog';

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();

  useEffect(() => {
    initPostHog();
  }, []);

  useEffect(() => {
    if (user) identifyUser(user.id, { email: user.email });
    else resetUser();
  }, [user]);

  return <>{children}</>;
}
