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

    // Defer so we never run in the same tick as React state updates (avoids triggering errors in query layer)
    const t = setTimeout(() => {
      try {
        const sessionId = getSessionId();
        if (!supabase?.rpc) return;
        supabase
          .rpc('track_route_event', {
            p_event_type: 'page_view',
            p_event_name: 'page_viewed',
            p_metadata: {
              path: pathname,
              title: typeof document !== 'undefined' ? document.title : '',
              referrer: typeof document !== 'undefined' && document.referrer ? document.referrer : null,
            },
            p_session_id: sessionId || undefined,
          })
          .then(() => {})
          .catch(() => {});
      } catch {
        // never let tracking break the app
      }
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);
}
