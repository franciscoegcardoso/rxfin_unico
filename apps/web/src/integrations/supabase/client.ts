import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database.types'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://kneaniaifzgqibpajyji.supabase.co"
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E"

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing Supabase environment variables')
}

export { SUPABASE_URL, SUPABASE_ANON_KEY }

export const supabase = createClient<Database>(
  SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      // Evitar múltiplas getSession() no bootstrap: AuthContext usa getInitialSession() (uma única chamada).
      // Em hooks/páginas, preferir useAuth().session em vez de supabase.auth.getSession() para reduzir
      // contenção no lock do Gotrue e o aviso "Lock was not released within 5000ms".
    },
  }
)
