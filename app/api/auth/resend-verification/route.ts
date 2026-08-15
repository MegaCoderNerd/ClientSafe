import { NextResponse } from "next/server";
import { getAppOrigin } from "@/lib/supabase-env";
import { supabaseAnon } from "@/lib/supabase-anon";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const { error } = await supabaseAnon.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${getAppOrigin()}/auth/callback`,
      },
    });

    if (error) {
      console.error("/api/auth/resend-verification:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent. Check your inbox.",
    });
  } catch (error) {
    console.error("/api/auth/resend-verification error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
