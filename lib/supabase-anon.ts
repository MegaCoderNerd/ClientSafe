import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";
import { supabaseFetch } from "@/lib/supabase-fetch";

let anonClient: SupabaseClient | undefined;

export function getSupabaseAnon() {
  if (!anonClient) {
    anonClient = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: { fetch: supabaseFetch },
    });
  }
  return anonClient;
}
