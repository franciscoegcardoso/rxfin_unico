import { supabase } from '@/integrations/supabase/client';

/**
 * Invoke the pluggy-sync Edge Function only when a valid session exists.
 * Prevents 401s caused by calling before the Supabase client has the session ready.
 */
export async function invokePluggySync(body: object): Promise<{ data: unknown; error: { message: string } | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) {
    console.warn('[pluggy-sync] Sessão não disponível, abortando chamada');
    return { data: null, error: { message: 'No session' } };
  }
  return supabase.functions.invoke('pluggy-sync', { body });
}
