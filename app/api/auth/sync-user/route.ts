import { ensureAppUserFromAuth } from "@/lib/ensure-app-user";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const user = await ensureAppUserFromAuth(data.user);
  if (!user) {
    return NextResponse.json({ error: "Could not sync account" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
