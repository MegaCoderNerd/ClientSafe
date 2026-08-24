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
    throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    global: { fetch: supabaseFetch },
});
