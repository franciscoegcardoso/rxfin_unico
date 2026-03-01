import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kneaniaifzgqibpajyji.supabase.co"
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuZWFuaWFpZnpncWlicGFqeWppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzMTc2MzEsImV4cCI6MjA4Mzg5MzYzMX0.WSGcnU8DvKJHxxQleTQP329bTxVyjklIXSQRdg9hT8E"

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
    },
  }
)
