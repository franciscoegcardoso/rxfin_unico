import { supabase } from "@/integrations/supabase/client";

export { supabase };

export function createClient() {
  return supabase;
}
