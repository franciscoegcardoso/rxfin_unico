import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';
  let id = sessionStorage.getItem('rxfin_session_id');
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem('rxfin_session_id', id);
  }
  return id;
}

export function usePageTracking(): void {
  const { pathname } = useLocation();
  const lastPathname = useRef<string>('');

  useEffect(() => {
    if (pathname === lastPathname.current) return;
    lastPathname.current = pathname;

    const sessionId = getSessionId();
    supabase
      .rpc('track_route_event', {
        p_event_type: 'page_view',
        p_event_name: 'page_viewed',
        p_metadata: {
          path: pathname,
          title: document.title,
          referrer: document.referrer || null,
        },
        p_session_id: sessionId,
      })
      .then(() => {})
      .catch(() => {});
  }, [pathname]);
}
