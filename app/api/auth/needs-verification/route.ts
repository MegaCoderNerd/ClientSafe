import { NextResponse } from "next/server";
import { supabaseAnon } from "@/lib/supabase-anon";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");

    if (!email || !password) {
      return NextResponse.json({ needsVerification: false });
    }

    const { data, error } = await supabaseAnon.auth.signInWithPassword({ email, password });

    if (error) {
      const message = error.message.toLowerCase();
      return NextResponse.json({
        needsVerification: message.includes("not confirmed") || message.includes("email not confirmed"),
      });
    }

    const confirmed = Boolean(data.user?.email_confirmed_at || data.user?.confirmed_at);
    return NextResponse.json({ needsVerification: Boolean(data.user) && !confirmed });
  } catch (error) {
    console.error("/api/auth/needs-verification error:", error);
    return NextResponse.json({ needsVerification: false });
  }
}
