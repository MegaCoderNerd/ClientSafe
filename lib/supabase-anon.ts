import { createClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import { supabaseFetch } from "@/lib/supabase-fetch";

export const supabaseAnon = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: { fetch: supabaseFetch },
});
