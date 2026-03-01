/**
 * Supabase client. Use VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.
 * Re-exports from integrations for consistent @/lib/supabase import path.
 */
export {
  supabase,
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
} from '@/integrations/supabase/client';
