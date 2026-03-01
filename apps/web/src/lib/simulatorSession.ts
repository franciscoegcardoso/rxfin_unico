/**
 * Session ID for anonymous simulator tracking (page_views, conversion_events).
 * Stored in sessionStorage so we don't alter existing app auth.
 */
export function getSessionId(): string {
  if (typeof sessionStorage === 'undefined') return '';
  let id = sessionStorage.getItem('rxfin_session');
  if (!id) {
    id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('rxfin_session', id);
  }
  return id;
}
