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
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"post-fix",hypothesisId:"B",location:"lib/supabase-anon.ts:getSupabaseAnon",message:"created supabase anon client",data:{vercel:Boolean(process.env.VERCEL),vercelEnv:process.env.VERCEL_ENV??null},timestamp:Date.now()})}).catch(()=>{});
    console.error("[debug-18b56a] created supabase anon client");
    // #endregion
  }
  return anonClient;
}
