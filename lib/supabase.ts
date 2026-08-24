import { createClient } from '@supabase/supabase-js';
import { supabaseFetch } from "@/lib/supabase-fetch";

function normalizeSupabaseUrl(url: string) {
    // createClient already appends /rest/v1; a project URL that includes it
    // would query /rest/v1/rest/v1/... and every lookup would fail.
    return url.replace(/\/rest\/v1\/?$/, '');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? normalizeSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL)
    : undefined;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    // #region agent log
    fetch("http://127.0.0.1:7530/ingest/2c2c58bb-5602-46f9-b362-f532a1588821",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"18b56a"},body:JSON.stringify({sessionId:"18b56a",runId:"pre-fix",hypothesisId:"A",location:"lib/supabase.ts:throw",message:"Missing Supabase env at module init",data:{hasUrl:Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL),hasAnon:Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),hasService:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),vercel:Boolean(process.env.VERCEL)},timestamp:Date.now()})}).catch(()=>{});
    console.error("[debug-18b56a] supabase module missing env", { hasUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL), hasAnon: Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY), hasService: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) });
    // #endregion
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: supabaseFetch },
});
