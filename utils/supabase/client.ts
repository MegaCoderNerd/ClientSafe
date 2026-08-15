import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase-env";

let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export const createClient = () => {
  if (browserClient) return browserClient;

  const client = createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
  if (typeof window !== "undefined") {
    browserClient = client;
  }
  return client;
};
