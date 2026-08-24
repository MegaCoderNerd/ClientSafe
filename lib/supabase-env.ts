function normalizeSupabaseUrl(url: string) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"pre-fix",hypothesisId:"B",location:"lib/supabase-env.ts:getSupabaseUrl",message:"Missing NEXT_PUBLIC_SUPABASE_URL",data:{vercel:Boolean(process.env.VERCEL),vercelEnv:process.env.VERCEL_ENV??null},timestamp:Date.now()})}).catch(()=>{});
    console.error("[debug-18b56a] getSupabaseUrl missing NEXT_PUBLIC_SUPABASE_URL");
    // #endregion
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return normalizeSupabaseUrl(url);
}

export function getSupabaseAnonKey() {
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) {
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"pre-fix",hypothesisId:"B",location:"lib/supabase-env.ts:getSupabaseAnonKey",message:"Missing anon key",data:{hasPublishable:Boolean(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),vercel:Boolean(process.env.VERCEL)},timestamp:Date.now()})}).catch(()=>{});
    console.error("[debug-18b56a] getSupabaseAnonKey missing anon key");
    // #endregion
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  return key;
}

export function getAppOrigin() {
  return process.env.NEXTAUTH_URL?.replace(/\/$/, "") || "http://localhost:3000";
}

export function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }
  return key;
}
