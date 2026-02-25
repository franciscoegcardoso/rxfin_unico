/**
 * Barrel re-export do cliente e tipos Supabase.
 * Novos módulos devem importar daqui: import { supabase } from '@/core/supabase'
 */
export { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from './client';
export type { Database, Json } from './types';
